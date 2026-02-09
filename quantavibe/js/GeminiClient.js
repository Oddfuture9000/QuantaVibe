/**
 * GeminiClient.js
 * Handles direct communication with the Gemini API from the browser.
 * AUDIT FIX: Uses sessionStorage instead of localStorage for API keys
 */

class GeminiClient {
    constructor() {
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';
        let savedModel = localStorage.getItem('gemini_model');
        if (!savedModel || savedModel === 'undefined' || savedModel === 'null') {
            savedModel = 'gemini-2.0-flash';
        }
        this.model = savedModel;
        this.coderModel = this.model;
    }

    setModel(modelName) {
        this.model = modelName;
        this.coderModel = modelName;
        localStorage.setItem('gemini_model', modelName);
        console.log(`[GeminiClient] Model switched to: ${this.model}`);
    }

    getApiKey() {
        // AUDIT FIX: Use sessionStorage (not persistent) for API key
        const rawKey = sessionStorage.getItem('gemini_api_key') || document.getElementById('apiKey')?.value || document.getElementById('modalApiKeyInput')?.value || '';
        return rawKey.trim();
    }

    async generateContent(prompt, systemInstruction = null, isJson = false) {
        const key = this.getApiKey();
        if (!key) throw new Error("No API Key provided.");

        const url = `${this.baseUrl}${this.model}:generateContent`;

        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
        };

        if (systemInstruction) {
            payload.system_instruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        if (isJson) {
            payload.generationConfig = {
                responseMimeType: "application/json"
            };
        }

        const makeRequest = async (retries = 3, delay = 1000) => {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': key
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    if (response.status === 429 && retries > 0) {
                        console.warn(`[GeminiClient] Rate Limit Hit (429). Retrying in ${delay}ms...`);
                        await new Promise(r => setTimeout(r, delay));
                        return makeRequest(retries - 1, delay * 2);
                    }

                    let errorMsg = response.statusText;
                    try {
                        const errorText = await response.text();
                        const errorJson = JSON.parse(errorText);
                        errorMsg = errorJson.error?.message || errorMsg;
                    } catch (e) {
                        console.error("Non-JSON Error Response:", errorMsg);
                    }
                    throw new Error(`API Error (${response.status}): ${errorMsg}`);
                }

                const data = await response.json();
                if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                    throw new Error("Invalid API Response");
                }
                return data.candidates[0].content.parts[0].text;
            } catch (error) {
                // If it's a fetch error (network) we might also want to retry, but for now focus on 429 logic recursion
                throw error;
            }
        };

        try {
            return await makeRequest();
        } catch (error) {
            console.error("[GeminiClient] Request Failed:", error);
            throw error;
        }
    }

    async generateJSON(prompt, systemInstruction = null) {
        const text = await this.generateContent(prompt, systemInstruction, true);
        try {
            return JSON.parse(text);
        } catch (parseError) {
            console.warn("[GeminiClient] JSON PARSE ERROR. Attempting recovery...", parseError.message);

            // Recovery Strategy 1: Strip markdown fences and retry
            let cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
            try { return JSON.parse(cleaned); } catch (e) { /* continue */ }

            // Recovery Strategy 2: Extract outermost JSON object with brace-matching
            try {
                const startIdx = cleaned.indexOf('{');
                if (startIdx !== -1) {
                    let depth = 0;
                    let inString = false;
                    let escape = false;
                    let endIdx = -1;

                    for (let i = startIdx; i < cleaned.length; i++) {
                        const ch = cleaned[i];
                        if (escape) { escape = false; continue; }
                        if (ch === '\\') { escape = true; continue; }
                        if (ch === '"' && !escape) { inString = !inString; continue; }
                        if (inString) continue;
                        if (ch === '{') depth++;
                        if (ch === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
                    }

                    if (endIdx !== -1) {
                        const extracted = cleaned.substring(startIdx, endIdx + 1);
                        try { return JSON.parse(extracted); } catch (e) { /* continue */ }
                    }
                }
            } catch (e) { /* continue */ }

            // Recovery Strategy 3: For plugin code responses - extract "code" field manually
            // because Gemini often breaks JSON when the code field contains unescaped characters
            try {
                const nameMatch = text.match(/"name"\s*:\s*"([^"]*?)"/);
                const iconMatch = text.match(/"icon"\s*:\s*"([^"]*?)"/);
                const codeStart = text.indexOf('"code"');
                if (codeStart !== -1) {
                    // Find the opening quote of the code value
                    const colonIdx = text.indexOf(':', codeStart + 6);
                    const openQuote = text.indexOf('"', colonIdx + 1);
                    if (openQuote !== -1) {
                        // Walk forward to find the matching close quote (unescaped)
                        let i = openQuote + 1;
                        let esc = false;
                        while (i < text.length) {
                            if (esc) { esc = false; i++; continue; }
                            if (text[i] === '\\') { esc = true; i++; continue; }
                            if (text[i] === '"') break;
                            i++;
                        }
                        // If we never found a proper close-quote, take everything up to the last }
                        let codeValue;
                        if (i < text.length) {
                            codeValue = text.substring(openQuote + 1, i);
                        } else {
                            // Grab from openQuote+1 to last occurrence of "} before end
                            const lastBrace = text.lastIndexOf('}');
                            codeValue = text.substring(openQuote + 1, lastBrace > openQuote ? lastBrace : text.length);
                        }

                        // Unescape the code value
                        try {
                            codeValue = JSON.parse(`"${codeValue}"`);
                        } catch (e) {
                            // If JSON.parse fails on the string, do manual unescaping
                            codeValue = codeValue.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                        }

                        return {
                            name: nameMatch ? nameMatch[1] : "Sentinel Plugin",
                            icon: iconMatch ? iconMatch[1] : "\uD83E\uDD16",
                            code: codeValue,
                            response: "Plugin generated (recovered from malformed JSON)."
                        };
                    }
                }
            } catch (e) {
                console.warn("[GeminiClient] Code field extraction failed:", e.message);
            }

            // Recovery Strategy 4: For tool-call responses, try to find response + tool_calls pattern
            try {
                const responseMatch = text.match(/"response"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                const toolCallsMatch = text.match(/"tool_calls"\s*:\s*(\[[\s\S]*?\])/);
                if (responseMatch) {
                    let response;
                    try { response = JSON.parse(`"${responseMatch[1]}"`); } catch (e) { response = responseMatch[1]; }
                    let tool_calls = [];
                    if (toolCallsMatch) {
                        try { tool_calls = JSON.parse(toolCallsMatch[1]); } catch (e) { /* no tools */ }
                    }
                    return { response, tool_calls };
                }
            } catch (e) { /* continue */ }

            console.error("[GeminiClient] All JSON recovery strategies failed. Raw text:", text.substring(0, 500));
            throw parseError;
        }
    }

    /**
     * Specialized method for generating code (e.g. Q#, Python)
     * @param {string} prompt 
     * @param {string} language - The target language (informative)
     * @returns {string} The generated code
     */
    async generateCode(prompt, language = 'javascript') {
        const result = await this.generateContent(prompt, `You are an expert quantum software engineer. Provide the highest quality ${language} code for the user's request. Return ONLY the code block, no markdown preamble or markers.`);
        // Clean up markdown if AI persists in adding them
        return result.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();
    }

    /**
     * Analyze an image using Gemini's multimodal vision capabilities.
     * Sends a base64-encoded image to Gemini for analysis (e.g., circuit scan).
     * @param {string} base64DataUrl - Image as data URL (data:image/jpeg;base64,...)
     * @param {string} prompt - Analysis instructions
     * @param {string|null} systemInstruction - Optional system prompt
     * @returns {string} Analysis text from Gemini
     */
    async analyzeImage(base64DataUrl, prompt, systemInstruction = null) {
        const key = this.getApiKey();
        if (!key) throw new Error("No API Key provided.");

        // Extract the base64 data and MIME type from the data URL
        const match = base64DataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) throw new Error("Invalid image data URL format.");

        const mimeType = match[1]; // e.g. "image/jpeg"
        const base64Data = match[2]; // raw base64 string

        const url = `${this.baseUrl}${this.model}:generateContent`;

        const payload = {
            contents: [{
                role: "user",
                parts: [
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data
                        }
                    },
                    { text: prompt }
                ]
            }]
        };

        if (systemInstruction) {
            payload.system_instruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': key
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorMsg = response.statusText;
            try {
                const errJson = await response.json();
                errorMsg = errJson.error?.message || errorMsg;
            } catch (e) { /* ignore parse failure */ }
            throw new Error(`Vision API Error (${response.status}): ${errorMsg}`);
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error("Invalid Vision API Response");
        }

        return data.candidates[0].content.parts[0].text;
    }

    /**
     * Generate an image using Gemini's image generation capabilities.
     * Uses the Imagen model via the Gemini API.
     * @param {string} prompt - Description of the image to generate
     * @returns {string|null} Base64 data URL of the generated image, or null on failure
     */
    async generateImage(prompt) {
        const key = this.getApiKey();
        if (!key) return null;

        // Use imagen-3.0-generate-002 for image generation via the Gemini API
        const url = `${this.baseUrl}imagen-3.0-generate-002:predict`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': key
                },
                body: JSON.stringify({
                    instances: [{ prompt: prompt }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: '16:9'
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
                    const mimeType = data.predictions[0].mimeType || 'image/png';
                    return `data:${mimeType};base64,${data.predictions[0].bytesBase64Encoded}`;
                }
            }

            // Fallback: Try gemini-2.0-flash with responseModalities including IMAGE
            console.log('[GeminiClient] Imagen model unavailable, trying Gemini multimodal output...');
            const fallbackUrl = `${this.baseUrl}gemini-2.0-flash:generateContent`;
            const fallbackResponse = await fetch(fallbackUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': key
                },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: `Generate a scientific visualization: ${prompt}` }] }],
                    generationConfig: {
                        responseModalities: ['TEXT', 'IMAGE']
                    }
                })
            });

            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                const parts = fallbackData?.candidates?.[0]?.content?.parts || [];
                for (const part of parts) {
                    if (part.inlineData) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }

            return null;
        } catch (e) {
            console.warn('[GeminiClient] Image generation failed:', e.message);
            return null;
        }
    }

    async generateFeature(userPrompt) {
        const AEGIS_SYSTEM_PROMPT = `You are SENTINEL-3, the Lead Quantum Systems Architect for AEGIS-QUANTUM.
ENVIRONMENT: Browser-based quantum circuit designer.
AVAILABLE API (in 'api' arg): createPluginWindow(id, title, style) -> returns div, showToast(msg, type), getCircuitState(), runSimulation().
CRITICAL RULES:
1. Structure: window.LoadedPlugin = { init: function(api) { ... } }
2. UI Creation:
   - CONST win = api.createPluginWindow('my-plugin-id', 'My Plugin', { width: '400px', height: '300px' });
   - win.innerHTML = \`<button id="my-btn">Click Me</button>\`;
   - NEVER use document.getElementById('my-btn').
   - ALWAYS use win.querySelector('#my-btn') to find elements you just created.
3. Scope: Do not access 'document.body' or global IDs. Work ONLY within your 'win' container.
4. FORBIDDEN: Do NOT use window.registerCustomFeature. Your plugin is automatically registered by the system.
5. Error Handling: Wrap init code in try/catch.
6. JSON SAFETY: The "code" field MUST be a properly escaped JSON string. All newlines must be \\n, all quotes inside the code must be \\", and all backslashes must be \\\\. Use single quotes inside the code whenever possible to reduce escaping issues. Keep code concise.
USER REQUEST: ${userPrompt}
OUTPUT: Valid JSON: { "name": "Plugin Name", "icon": "emoji", "code": "full JS code string" }`;

        try {
            const responseObj = await this.generateJSON(userPrompt, AEGIS_SYSTEM_PROMPT);
            if (responseObj && responseObj.code) {
                // SANITATION: Strip markdown markers and trailing comments
                let code = responseObj.code;

                // If the code field is wrapped in markdown (common hallucination), extract it
                if (code.includes('```')) {
                    const parts = code.split('```');
                    // The code is usually in the second part if there's one block
                    code = parts.length > 1 ? parts[1].replace(/^[a-z]*\n/i, '') : code;
                }

                // Final trim
                code = code.trim();

                return { ...responseObj, code };
            } else {
                throw new Error("Model did not return a 'code' field in JSON.");
            }
        } catch (e) {
            console.error("GeminiClient: Feature Generation Failed", e);
            throw e;
        }
    }
}

// Global Export
window.geminiClient = new GeminiClient();
