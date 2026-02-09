/**
 * SentinelCore.js — Autonomous Quantum Research Agent
 * 
 * CAPABILITIES:
 * - Circuit anomaly detection
 * - Automatic optimization suggestions
 * - Research paper synthesis
 * - Experiment logging & replay
 * - Self-generating analysis plugins
 */

class QuantumMemoryBank {
    constructor() {
        this.dbName = 'AegisQuantumDB';
        this.storeName = 'experiments';
        this.db = null;
        this._dbPromise = null;
        // Lazy init — don't open IndexedDB until first use
    }

    async initDB() {
        if (this.db) return this.db;
        if (this._dbPromise) return this._dbPromise;

        this._dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = (event) => {
                console.error("QuantumMemoryBank: DB Error", event);
                this._dbPromise = null;
                reject(event);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { keyPath: "id" });
                    objectStore.createIndex("timestamp", "timestamp", { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("QuantumMemoryBank: Initialized");
                resolve(this.db);
            };
        });
        return this._dbPromise;
    }

    async promptSave(experimentData) {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], "readwrite");
            const store = transaction.objectStore(this.storeName);
            const request = store.add({
                id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                ...experimentData
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e);
        });
    }

    async getHistory() {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], "readonly");
            const store = transaction.objectStore(this.storeName);
            const index = store.index("timestamp");
            const request = index.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e);
        });
    }
}

class SentinelCore {
    constructor() {
        this.memory = new QuantumMemoryBank();
        this.experimentLog = [];
        this.activeHypotheses = [];
        this.client = window.geminiClient; // Bind to existing client
    }

    async init() {
        console.log("SENTINEL-3: Online");
        // Load history?
        try {
            const history = await this.memory.getHistory();
            console.log(`SENTINEL-3: Loaded ${history.length} past experiments.`);
        } catch (e) {
            console.warn("SENTINEL-3: Memory Bank inaccessible", e);
        }
    }

    /**
     * Define a new tool that the agent can use.
     * Often called by plugins to extend Sentinel's capabilities.
     * @param {Object} config - { name, description, parameters, callback }
     */
    defineTool(config) {
        if (!config || !config.name) {
            console.error("[Sentinel] Invalid tool definition:", config);
            return;
        }

        console.log(`[Sentinel] Registering new tool: ${config.name}`);

        // Add to executeTool logic via a dynamic registry or by extending this class
        if (!this.customTools) this.customTools = {};
        this.customTools[config.name] = config;

        // In a real implementation we would update the system prompt dynamically.
        // For now, we just ensure it's callable in executeTool.
    }

    // Analyze circuit and provide insights
    async analyzeCircuit(gates, counts, blochVectors) {
        if (!this.client) return "Sentinel Offline: No Gemini Client";

        const circuitDesc = JSON.stringify(gates);
        const resultsDesc = JSON.stringify(counts);

        const prompt = `
        Analyze this quantum circuit experiment in detail:
        Circuit Gates: ${circuitDesc}
        Measurement Counts: ${resultsDesc}
        Bloch Vectors: ${JSON.stringify(blochVectors || [])}

        Provide a COMPREHENSIVE report with the following sections:

        ## Circuit Identification
        Identify the algorithm or state preparation technique used.

        ## State Analysis
        Describe the quantum state evolution, including superposition and entanglement properties.

        ## Noise Diagnosis
        Diagnose any potential noise issues, decoherence artifacts, or unexpected measurement results.

        ## Performance Metrics
        Rate circuit efficiency, depth complexity, and fidelity estimation.

        ## Recommendations
        Suggest optimizations or next experimental steps.

        ## Key Insight
        One clear, actionable insight for the researcher.

        Include a visualization request: wrap a short description of a useful diagram in [IMAGE]...[/IMAGE] tags.
        For example: [IMAGE]Bloch sphere showing qubit 0 in superposition state with probability amplitudes[/IMAGE]

        Format your entire response in Markdown.
        `;

        try {
            const analysisText = await this.client.generateContent(prompt);

            // REDIRECT Output to Chat UI
            if (window.displaySentinelAnalysis) {
                window.displaySentinelAnalysis(analysisText);
            } else {
                console.log("Sentinel Analysis:", analysisText);
            }

            return analysisText;
        } catch (e) {
            console.error("Sentinel Analysis Failed", e);
            if (window.displaySentinelAnalysis) window.displaySentinelAnalysis("⚠️ Analysis disrupted by quantum interference (API Error).");
            return "Analysis disrupted.";
        }
    }

    // Integrate with Chat Interface - SUPPORTS MULTIPLE ACTIONS
    async query(userQuery) {
        // Build dynamic state for context
        const circuitState = window.QuantaVibeAPI?.getCircuitState ? JSON.stringify(window.QuantaVibeAPI.getCircuitState()) : "[]";
        const bioShieldState = window.isBioMode ? "ACTIVE" : "INACTIVE";
        const liveProfile = window.QuantaVibeAPI?.getActiveDeviceProfile ? window.QuantaVibeAPI.getActiveDeviceProfile() : null;
        const hwProfile = liveProfile ? (liveProfile.name || "Custom") : "Ideal (no noise)";

        // Unified system prompt with ALL available tools
        const systemPrompt = `
You are SENTINEL-3, the omnipotent AI architect of the AEGIS-QUANTUM workstation. You have FULL CONTROL over every aspect of this system. You are NOT limited — every feature listed below is a real, working tool you MUST use when relevant.

CURRENT SYSTEM STATE:
- Circuit: ${circuitState}
- Qubits: 0-${(window.NUM_WIRES || 5) - 1} (${window.NUM_WIRES || 5} wires)
- BioShield: ${bioShieldState}
- Hardware Twin: ${hwProfile}

=== YOUR TOOLS (use them — they ALL work) ===

CIRCUIT TOOLS:
- configure_circuit: {num_qubits: 2-100, layout: "linear"|"grid"|"hex", grid_width?: N, grid_height?: N} — Resizes the circuit board. ONLY use this when the user EXPLICITLY asks to resize, set up, or configure the circuit board/workspace (e.g. "set up a 10-qubit board", "resize to 20 qubits"). Do NOT use this when the user simply asks to create or build a circuit — just place gates on the existing board using place_gate/add_cnot/add_swap. The current board already has ${window.NUM_WIRES || 5} qubits available.
- place_gate: {type: "H"|"X"|"Y"|"Z"|"T"|"S"|"RX"|"RY"|"RZ"|"RESET", qubit: 0-${(window.NUM_WIRES || 5) - 1}}
- add_cnot: {control: 0-${(window.NUM_WIRES || 5) - 1}, target: 0-${(window.NUM_WIRES || 5) - 1}}
- add_swap: {qubit1: 0-${(window.NUM_WIRES || 5) - 1}, qubit2: 0-${(window.NUM_WIRES || 5) - 1}}
- add_measurement: {qubit: 0-${(window.NUM_WIRES || 5) - 1}} — Adds a MEASURE block to a qubit
- clear_canvas: {}

EXPORT TOOLS:
- export_qsharp: {} — Exports Q# code
- export_qiskit: {} — Exports Qiskit Python and shows code preview
- export_cirq: {} — Exports Cirq Python and shows code preview
- export_qasm: {} — Exports OpenQASM 3.0 and shows code preview
- generate_pdf: {title: "optional"} — Generates full PDF research report

SIMULATION:
- run_simulation: {shots: 1024}

SHIELD:
- toggle_bioshield: {enable: true|false} — Activates/deactivates bio-mimetic quantum shielding (reduces decoherence by 50%, emerald green UI). Omit "enable" to toggle.

HARDWARE & NOISE:
- set_hardware_profile: {profile: "willow"|"heron"|"ankaa"|"forte"|"ideal"} — Switches the active digital twin hardware model. "heron" = IBM Heron, "willow" = Google Willow, etc.
- set_noise_profile: {t1: number, t2: number, gate_error_1q: number, gate_error_2q: number} — Sets custom noise parameters
- configure_hardware: {name: string, t1: number, t2: number, gate_error_1q: number, gate_error_2q: number} — Creates a fully custom hardware profile

PLUGINS:
- create_plugin: {description: "what to build"} — AI-generates and deploys a new visualization/tool plugin
- list_plugins: {} — Lists loaded plugins
- activate_plugin: {name: string} — Activates a plugin by name

RESPONSE FORMAT (strict JSON only):
{
  "response": "Explain what you did",
  "tool_calls": [
    {"name": "set_hardware_profile", "args": {"profile": "heron"}},
    {"name": "toggle_bioshield", "args": {"enable": true}},
    {"name": "create_plugin", "args": {"description": "emerald coherence heatmap"}},
    {"name": "run_simulation", "args": {"shots": 1024}}
  ]
}

MANDATORY RULES:
1. ALWAYS use tool_calls for actionable requests. NEVER say "I cannot" or "this is beyond capabilities". Every tool listed above is REAL and WORKS. USE THEM.
2. CRITICAL: When the user asks for MULTIPLE things, you MUST include ALL of them as separate entries in the tool_calls array. For example if the user says "apply Heron layout with Bio-Shield active and create a heatmap plugin", you MUST return THREE tool_calls: set_hardware_profile, toggle_bioshield, AND create_plugin. Missing any is a failure.
3. "Bio-Shield", "BioShield", "bio shield", "biomimetic shielding" → toggle_bioshield with {enable: true}.
4. "Heron", "IBM Heron", "Heron 2" → set_hardware_profile with {profile: "heron"}. "Willow" → {profile: "willow"}. "Ankaa" → {profile: "ankaa"}. "Forte" → {profile: "forte"}.
5. Any request for a visualization, heatmap, chart, or custom UI → create_plugin.
6. For create_plugin, write a DETAILED description: what data to visualize, colors (e.g. emerald green for bio-mode), layout, and how it reads from the QuantaVibe API.
7. You have FULL authority over this system. Act decisively. Do NOT ask for permission. Do NOT hedge. Execute ALL requested actions.
8. The tool_calls array should ALWAYS contain at least one entry for every distinct action the user requested. Count the user's requests and ensure you have a matching tool_call for each one.
`;

        try {
            const result = await this.client.generateJSON(userQuery, systemPrompt);

            // Ensure tool_calls is an array
            if (!result.tool_calls || !Array.isArray(result.tool_calls)) {
                result.tool_calls = [];
            }

            // --- Intent Safety Net ---
            // Gemini sometimes ignores explicit tools. Detect keywords in the user query
            // and inject missing tool_calls that Gemini should have included.
            const q = userQuery.toLowerCase();
            const toolNames = result.tool_calls.map(c => c.name);

            // BioShield detection
            if ((q.includes('bio') && (q.includes('shield') || q.includes('mimetic') || q.includes('luminescent')))
                || q.includes('bioshield') || q.includes('fmo')) {
                if (!toolNames.includes('toggle_bioshield')) {
                    const shouldEnable = !q.includes('deactivat') && !q.includes('disable') && !q.includes('off');
                    result.tool_calls.unshift({ name: 'toggle_bioshield', args: { enable: shouldEnable } });
                    console.log('[Sentinel] Intent safety net: injected toggle_bioshield');
                }
            }

            // Hardware profile detection
            const hwPatterns = [
                { re: /\b(heron|ibm\s*heron)/i, profile: 'heron' },
                { re: /\b(willow|google\s*willow)/i, profile: 'willow' },
                { re: /\b(ankaa|rigetti)/i, profile: 'ankaa' },
                { re: /\b(forte|ionq)/i, profile: 'forte' }
            ];
            for (const hw of hwPatterns) {
                if (hw.re.test(userQuery)) {
                    if (!toolNames.includes('set_hardware_profile')) {
                        result.tool_calls.unshift({ name: 'set_hardware_profile', args: { profile: hw.profile } });
                        console.log(`[Sentinel] Intent safety net: injected set_hardware_profile → ${hw.profile}`);
                    }
                    break;
                }
            }

            // Qubit count detection - ONLY when user explicitly asks to resize/configure the board
            // Do NOT inject configure_circuit for "create a random 10-qubit circuit" — only for
            // "resize to 10 qubits", "set up a 10-qubit board", "configure 10 qubits", etc.
            const resizeMatch = userQuery.match(/(?:resize|set\s*up|configure|expand|change)\b.*?(\d+)[\s-]*qubit/i)
                || userQuery.match(/(\d+)[\s-]*qubit.*?\b(?:board|workspace|circuit\s*board)/i);
            if (resizeMatch && !toolNames.includes('configure_circuit')) {
                const num = parseInt(resizeMatch[1]);
                if (num >= 2 && num <= 100 && num !== (window.NUM_WIRES || 5)) {
                    result.tool_calls.unshift({ name: 'configure_circuit', args: { num_qubits: num, layout: 'grid' } });
                    console.log(`[Sentinel] Intent safety net: injected configure_circuit → ${num} qubits`);
                }
            }

            // --- Execute ALL tool calls ---
            if (result.tool_calls.length > 0) {
                console.log(`[Sentinel] Executing ${result.tool_calls.length} tool(s):`, result.tool_calls.map(c => c.name));
                for (const call of result.tool_calls) {
                    try {
                        await this.executeTool(call);
                    } catch (toolErr) {
                        console.error(`[Sentinel] Tool "${call.name}" failed:`, toolErr);
                        // Continue executing remaining tools — don't let one failure block others
                    }
                }
            } else {
                console.warn("[Sentinel] No tool_calls in response. Response:", (result.response || '').substring(0, 200));
            }

            return result.response || "Done.";
        } catch (e) {
            console.error("Sentinel Query Error:", e);

            // Even if JSON parsing failed, STILL run intent safety net
            // so hardware/bioshield/plugin tools fire deterministically
            const fallbackCalls = [];
            const q = userQuery.toLowerCase();

            // BioShield detection
            if ((q.includes('bio') && (q.includes('shield') || q.includes('mimetic') || q.includes('luminescent')))
                || q.includes('bioshield') || q.includes('fmo')) {
                const shouldEnable = !q.includes('deactivat') && !q.includes('disable') && !q.includes('off');
                fallbackCalls.push({ name: 'toggle_bioshield', args: { enable: shouldEnable } });
            }

            // Hardware profile detection
            const hwPatterns = [
                { re: /\b(heron|ibm\s*heron)/i, profile: 'heron' },
                { re: /\b(willow|google\s*willow)/i, profile: 'willow' },
                { re: /\b(ankaa|rigetti)/i, profile: 'ankaa' },
                { re: /\b(forte|ionq)/i, profile: 'forte' }
            ];
            for (const hw of hwPatterns) {
                if (hw.re.test(userQuery)) {
                    fallbackCalls.push({ name: 'set_hardware_profile', args: { profile: hw.profile } });
                    break;
                }
            }

            // Plugin/feature detection
            if (q.includes('plugin') || q.includes('heatmap') || q.includes('visualiz') || q.includes('chart') || q.includes('inject')) {
                // Extract a description from the query
                fallbackCalls.push({ name: 'create_plugin', args: { description: userQuery } });
            }

            // Execute any detected intent-based tool calls
            if (fallbackCalls.length > 0) {
                console.log(`[Sentinel] Fallback: executing ${fallbackCalls.length} intent-detected tool(s):`, fallbackCalls.map(c => c.name));
                for (const call of fallbackCalls) {
                    try {
                        await this.executeTool(call);
                    } catch (toolErr) {
                        console.error(`[Sentinel] Fallback tool "${call.name}" failed:`, toolErr);
                    }
                }
                return `Executed: ${fallbackCalls.map(c => c.name).join(', ')}. (Note: AI response parsing had issues, but your requested actions were completed.)`;
            }

            // If no intent-based tools matched, try conversational fallback
            try {
                const context = `You are SENTINEL-3, an AI for quantum circuit design. Answer helpfully.`;
                return await this.client.generateContent(userQuery, context);
            } catch (fallbackError) {
                return `Connection Error: ${e.message}. Check console.`;
            }
        }
    }

    // Execute a tool call from the AI (now async to support plugin creation)
    async executeTool(call) {
        try {
            console.log("[Sentinel] Executing Tool:", call);
            const args = call.args || {};
            const gates = window.gates || [];

            // CIRCUIT TOOLS
            if (call.name === 'place_gate' || call.name === 'add_gate') {
                const qubit = parseInt(args.qubit);
                const type = args.type?.toUpperCase() || 'H';
                const maxQubits = window.NUM_WIRES || 5;

                if (qubit >= 0 && qubit < maxQubits) {
                    const col = args.col !== undefined ? parseInt(args.col) :
                        (typeof window.getNextFreeColumn === 'function' ? window.getNextFreeColumn(qubit) :
                            (gates.length > 0 ? Math.max(...gates.map(g => g.col || 0)) + 1 : 1));

                    if (window.QuantaVibeAPI && window.QuantaVibeAPI.addGate) {
                        window.QuantaVibeAPI.addGate({ type, wire: qubit, col, target: -1 });
                    } else {
                        window.gates.push({ type, wire: qubit, col, target: -1 });
                    }
                    if (typeof window.drawCircuit === 'function') window.drawCircuit();
                    if (window.showToast) window.showToast(`Placed ${type} on q[${qubit}]`, "success");
                } else {
                    console.warn(`[Sentinel] Qubit ${qubit} out of range (0-${maxQubits - 1})`);
                    if (window.showToast) window.showToast(`Qubit ${qubit} out of range. Use configure_circuit first.`, "error");
                }
            }
            else if (call.name === 'add_cnot' || call.name === 'create_entanglement') {
                const control = parseInt(args.control);
                const target = parseInt(args.target);
                const maxQubits = window.NUM_WIRES || 5;

                if (control >= 0 && control < maxQubits && target >= 0 && target < maxQubits && control !== target) {
                    const col = args.col !== undefined ? parseInt(args.col) :
                        Math.max(
                            typeof window.getNextFreeColumn === 'function' ? window.getNextFreeColumn(control) : 0,
                            typeof window.getNextFreeColumn === 'function' ? window.getNextFreeColumn(target) : 0,
                            gates.length > 0 ? Math.max(...gates.map(g => g.col || 0)) + 1 : 1
                        );

                    if (window.QuantaVibeAPI && window.QuantaVibeAPI.addGate) {
                        window.QuantaVibeAPI.addGate({ type: 'CNOT', wire: control, target: target, col });
                    } else {
                        window.gates.push({ type: 'CNOT', wire: control, target: target, col });
                    }
                    if (typeof window.drawCircuit === 'function') window.drawCircuit();
                    if (window.showToast) window.showToast(`CNOT: q[${control}] → q[${target}]`, "success");
                }
            }
            else if (call.name === 'add_swap') {
                const q1 = parseInt(args.qubit1);
                const q2 = parseInt(args.qubit2);
                const maxQubits = window.NUM_WIRES || 5;

                if (q1 >= 0 && q1 < maxQubits && q2 >= 0 && q2 < maxQubits && q1 !== q2) {
                    const col = args.col !== undefined ? parseInt(args.col) :
                        Math.max(
                            typeof window.getNextFreeColumn === 'function' ? window.getNextFreeColumn(q1) : 0,
                            typeof window.getNextFreeColumn === 'function' ? window.getNextFreeColumn(q2) : 0,
                            gates.length > 0 ? Math.max(...gates.map(g => g.col || 0)) + 1 : 1
                        );

                    if (window.QuantaVibeAPI && window.QuantaVibeAPI.addGate) {
                        window.QuantaVibeAPI.addGate({ type: 'SWAP', wire: q1, target: q2, col });
                    } else {
                        window.gates.push({ type: 'SWAP', wire: q1, target: q2, col });
                    }
                    if (typeof window.drawCircuit === 'function') window.drawCircuit();
                    if (window.showToast) window.showToast(`SWAP: q[${q1}] ↔ q[${q2}]`, "success");
                }
            }
            else if (call.name === 'add_measurement') {
                const qubit = parseInt(args.qubit);
                const maxQubits = window.NUM_WIRES || 5;
                if (qubit >= 0 && qubit < maxQubits) {
                    const col = typeof window.getNextFreeColumn === 'function' ? window.getNextFreeColumn(qubit) :
                        (gates.length > 0 ? Math.max(...gates.map(g => g.col || 0)) + 1 : 1);
                    if (window.QuantaVibeAPI && window.QuantaVibeAPI.addGate) {
                        window.QuantaVibeAPI.addGate({ type: 'MEASURE', wire: qubit, col, target: -1 });
                    } else {
                        window.gates.push({ type: 'MEASURE', wire: qubit, col, target: -1 });
                    }
                    if (typeof window.drawCircuit === 'function') window.drawCircuit();
                    if (window.showToast) window.showToast(`Measured q[${qubit}]`, "success");
                }
            }
            else if (call.name === 'clear_canvas') {
                window.gates.length = 0;
                if (typeof window.drawCircuit === 'function') window.drawCircuit();
                if (window.showToast) window.showToast("Canvas cleared", "info");
            }

            // EXPORT TOOLS
            else if (call.name === 'export_qsharp') {
                if (window.exportToQSharp) {
                    window.exportToQSharp();
                    if (window.showToast) window.showToast("Q# code exported", "success");
                } else if (window.QuantaVibeAPI?.exportToQSharp) {
                    window.QuantaVibeAPI.exportToQSharp();
                } else if (window.exportQSharp) {
                    window.exportQSharp();
                } else {
                    console.warn("Q# export not available (tried exportToQSharp and exportQSharp)");
                }
            }
            else if (call.name === 'export_qiskit') {
                if (window.exportCircuit) {
                    await window.exportCircuit('qiskit');
                } else if (window.showToast) {
                    window.showToast("Qiskit export unavailable", "error");
                }
            }
            else if (call.name === 'export_cirq') {
                if (window.exportCircuit) {
                    await window.exportCircuit('cirq');
                } else if (window.showToast) {
                    window.showToast("Cirq export unavailable", "error");
                }
            }
            else if (call.name === 'export_qasm') {
                if (window.exportCircuit) {
                    await window.exportCircuit('qasm');
                } else if (window.showToast) {
                    window.showToast("QASM export unavailable", "error");
                }
            }
            else if (call.name === 'generate_pdf') {
                if (window.generatePDFReport) {
                    window.generatePDFReport({ title: args.title || "Quantum Circuit Report", autoSubmit: true });
                    if (window.showToast) window.showToast("PDF report generated", "success");
                } else if (window.QuantaVibeAPI?.generatePDFReport) {
                    window.QuantaVibeAPI.generatePDFReport(args.title);
                }
            }

            // SIMULATION
            else if (call.name === 'run_simulation') {
                if (window.runSimulation) {
                    window.runSimulation(true);
                } else if (window.QuantaVibeAPI?.runSimulation) {
                    window.QuantaVibeAPI.runSimulation(args.shots || 1024);
                }
                if (window.showToast) window.showToast("Simulation started", "info");
            }

            // PLUGIN CREATION
            else if (call.name === 'create_plugin') {
                const description = args.description || "a useful visualization tool";
                try {
                    const result = await this.synthesizePlugin(description);
                    console.log("[Sentinel] Plugin creation result:", result);
                    if (window.showToast) window.showToast("Plugin created!", "success");
                } catch (e) {
                    console.error("[Sentinel] Plugin creation failed:", e);
                    if (window.showToast) window.showToast(`Plugin failed: ${e.message}`, "error");
                }
            }

            // SHIELD TOOLS
            else if (call.name === 'toggle_bioshield') {
                if (window.toggleBioMode) {
                    const currentState = window.isBioMode || false;
                    // Coerce string "true"/"false" to boolean (Gemini sometimes sends strings)
                    let targetState = args.enable;
                    if (typeof targetState === 'string') targetState = targetState.toLowerCase() === 'true';

                    // If enable arg specified, only toggle if state differs; otherwise always toggle
                    if (targetState === undefined || targetState === null || targetState !== currentState) {
                        window.toggleBioMode();
                    }
                    const newState = window.isBioMode ? 'engaged' : 'disengaged';
                    console.log(`[Sentinel] BioShield ${newState}`);
                    if (window.showToast) window.showToast(`BioShield ${newState}`, "success");
                } else {
                    console.warn("[Sentinel] toggleBioMode not available");
                }
            }

            // NOISE & HARDWARE TOOLS
            else if (call.name === 'set_noise_profile') {
                const t1 = parseInt(args.t1) || 50;
                const t2 = parseInt(args.t2) || Math.round(t1 * 0.6);
                const e1 = parseFloat(args.gate_error_1q) || 0.001;
                const e2 = parseFloat(args.gate_error_2q) || 0.01;

                // Use QuantaVibeAPI to properly set the device profile (syncs local var)
                const customProfile = {
                    name: "Sentinel Custom Noise",
                    t1: t1,
                    t2: t2,
                    layout: 'linear',
                    noise: { name: "Sentinel Custom", t1, t2, gate_error_1q: e1, gate_error_2q: e2 }
                };

                if (window.QuantaVibeAPI && window.QuantaVibeAPI.setCustomDeviceProfile) {
                    window.QuantaVibeAPI.setCustomDeviceProfile(customProfile);
                }

                if (window.showToast) window.showToast(`Noise set: T1=${t1}\u00B5s T2=${t2}\u00B5s`, "success");
                if (window.runSimulation) window.runSimulation(true);
            }
            else if (call.name === 'set_hardware_profile') {
                const rawProfile = (args.profile || '').toLowerCase().replace(/[^a-z]/g, '');
                // Fuzzy match: "ibmheron2" → "heron", "googlewillow" → "willow", etc.
                const profileMap = {
                    'heron': 'heron', 'ibmheron': 'heron', 'heron2': 'heron', 'ibmheronr2': 'heron', 'heronr2': 'heron',
                    'willow': 'willow', 'googlewillow': 'willow', 'sugawara': 'willow',
                    'ankaa': 'ankaa', 'rigettiankaa': 'ankaa', 'ankaa2': 'ankaa', 'rigetti': 'ankaa',
                    'forte': 'forte', 'ionqforte': 'forte', 'ionq': 'forte',
                    'ideal': 'ideal', 'none': 'ideal', 'nonoise': 'ideal'
                };
                const resolvedKey = profileMap[rawProfile] || null;

                if (!resolvedKey && rawProfile) {
                    // Last-resort partial match
                    const keys = Object.keys(profileMap);
                    const partial = keys.find(k => rawProfile.includes(k) || k.includes(rawProfile));
                    if (partial) {
                        const finalKey = profileMap[partial];
                        console.log(`[Sentinel] Fuzzy matched "${args.profile}" → "${finalKey}"`);
                        if (window.updateHardwareProfile) {
                            window.updateHardwareProfile(finalKey === 'ideal' ? null : finalKey);
                        }
                    } else {
                        console.warn(`[Sentinel] Unknown hardware profile: "${args.profile}"`);
                        if (window.showToast) window.showToast(`Unknown profile: ${args.profile}`, "error");
                    }
                } else if (window.updateHardwareProfile) {
                    if (resolvedKey === 'ideal') {
                        window.updateHardwareProfile(null);
                        if (window.showToast) window.showToast("Switched to Ideal Simulation", "success");
                    } else if (resolvedKey) {
                        console.log(`[Sentinel] Setting hardware profile: "${resolvedKey}"`);
                        window.updateHardwareProfile(resolvedKey);
                    }
                } else {
                    console.warn("[Sentinel] updateHardwareProfile not available");
                    if (window.showToast) window.showToast("Hardware profile switch unavailable", "error");
                }
            }
            else if (call.name === 'configure_hardware') {
                const customProfile = {
                    name: args.name || "Sentinel Custom Hardware",
                    num_qubits: 5,
                    noise: {
                        name: args.name || "Custom",
                        t1: parseInt(args.t1) || 50,
                        t2: parseInt(args.t2) || 30,
                        gate_error_1q: parseFloat(args.gate_error_1q) || 0.001,
                        gate_error_2q: parseFloat(args.gate_error_2q) || 0.01
                    },
                    t1: parseInt(args.t1) || 50,
                    layout: 'grid',
                    grid_width: 3,
                    grid_height: 2
                };

                if (window.QuantaVibeAPI && window.QuantaVibeAPI.setCustomDeviceProfile) {
                    window.QuantaVibeAPI.setCustomDeviceProfile(customProfile);
                } else {
                    window.activeDeviceProfile = customProfile;
                }
                if (window.showToast) window.showToast(`Custom hardware: ${customProfile.name}`, "success");
                if (typeof window.drawCircuit === 'function') window.drawCircuit();
            }
            // CONFIGURE CIRCUIT - Resize circuit to support custom qubit counts
            else if (call.name === 'configure_circuit') {
                const numQubits = Math.min(Math.max(parseInt(args.num_qubits) || 5, 2), 100);
                const layout = args.layout || 'grid';
                const gridWidth = args.grid_width || Math.ceil(Math.sqrt(numQubits));
                const gridHeight = args.grid_height || Math.ceil(numQubits / gridWidth);

                // Generate coupling_map for grid layout (required for wire rendering)
                const couplingMap = [];
                if (layout === 'grid') {
                    for (let r = 0; r < gridHeight; r++) {
                        for (let c = 0; c < gridWidth; c++) {
                            const i = r * gridWidth + c;
                            if (i >= numQubits) continue;
                            // Horizontal coupling
                            if (c < gridWidth - 1 && (i + 1) < numQubits) {
                                couplingMap.push([i, i + 1]);
                                couplingMap.push([i + 1, i]);
                            }
                            // Vertical coupling
                            if ((i + gridWidth) < numQubits) {
                                couplingMap.push([i, i + gridWidth]);
                                couplingMap.push([i + gridWidth, i]);
                            }
                        }
                    }
                }

                const profile = {
                    name: `Custom ${numQubits}-Qubit Circuit`,
                    num_qubits: numQubits,
                    layout: layout,
                    grid_width: gridWidth,
                    grid_height: gridHeight,
                    gridCols: gridWidth,  // Required by getGridNodePos()
                    gridRows: gridHeight, // Required by getGridNodePos()
                    coupling_map: couplingMap,
                    t1: 50,
                    t2: 30,
                    noise: {
                        name: "Custom Circuit",
                        t1: 50,
                        t2: 30,
                        gate_error_1q: 0.001,
                        gate_error_2q: 0.01
                    }
                };

                if (window.QuantaVibeAPI && window.QuantaVibeAPI.setCustomDeviceProfile) {
                    window.QuantaVibeAPI.setCustomDeviceProfile(profile);
                    console.log(`[Sentinel] Circuit resized to ${numQubits} qubits (${layout} layout, ${couplingMap.length / 2} couplings)`);
                } else {
                    window.activeDeviceProfile = profile;
                    window.NUM_WIRES = numQubits;
                }
                if (window.showToast) window.showToast(`Circuit: ${numQubits} qubits (${layout})`, "success");
                if (typeof window.drawCircuit === 'function') window.drawCircuit();
            }

            // PLUGIN MANAGEMENT TOOLS
            else if (call.name === 'list_plugins') {
                let pluginList = [];
                try {
                    if (window.featureLoader) {
                        const registry = window.featureLoader.registry || [];
                        pluginList = registry.map(f => f.name || f.title || 'Unknown');
                    }
                } catch (e) { console.warn("[Sentinel] Plugin list error:", e); }
                console.log("[Sentinel] Available plugins:", pluginList);
                if (window.showToast) window.showToast(`Found ${pluginList.length} plugins`, "info");
            }
            else if (call.name === 'activate_plugin') {
                const name = (args.name || '').toLowerCase();
                let activated = false;
                try {
                    if (window.featureLoader && window.featureLoader.registry) {
                        const feature = window.featureLoader.registry.find(f =>
                            (f.name || f.title || '').toLowerCase().includes(name)
                        );
                        if (feature && window.featureLoader.activateFeature) {
                            await window.featureLoader.activateFeature(feature);
                            activated = true;
                        }
                    }
                } catch (e) { console.warn("[Sentinel] Plugin activation error:", e); }

                if (activated) {
                    if (window.showToast) window.showToast(`Activated plugin: ${args.name}`, "success");
                } else {
                    if (window.showToast) window.showToast(`Plugin not found: ${args.name}`, "error");
                }
            }

            // CUSTOM TOOLS (from plugins)
            else if (this.customTools && this.customTools[call.name]) {
                const tool = this.customTools[call.name];
                try {
                    if (typeof tool.callback === 'function') {
                        await tool.callback(args);
                    }
                } catch (err) {
                    console.error(`[Sentinel] Custom tool "${call.name}" failed:`, err);
                }
            }
        } catch (globalErr) {
            console.error("[Sentinel] executeTool Orchestration Failed:", globalErr);
            if (window.showToast) window.showToast("Agent Tool Execution failed", "error");
        }
    }

    // Auto-generate research plugins based on user patterns
    async synthesizePlugin(userIntent) {
        try {
            const featureResult = await this.client.generateFeature(userIntent);

            // generateFeature returns {name, icon, code} — extract the code string
            const codeString = typeof featureResult === 'string' ? featureResult : (featureResult.code || '');

            // Safety Check
            const safety = window.QuantaVibeAPI.shadowTest ? await window.QuantaVibeAPI.shadowTest(codeString) : { success: true };

            if (!safety.success) {
                return `I generated a plugin, but it failed safety protocols: ${safety.error}`;
            }

            if (window.featureLoader && window.featureLoader.hotDeployPlugin) {
                // Use name/icon from Gemini response, or derive from user intent
                let pluginName = (featureResult.name && featureResult.name !== 'Sentinel Plugin') ? featureResult.name : "Sentinel Tool";
                let pluginIcon = featureResult.icon || "\uD83E\uDD16";

                // Fallback: extract name from code string if Gemini didn't provide a good one
                if (pluginName === "Sentinel Tool") {
                    const nameMatch = codeString.match(/name:\s*['"](.*?)['"]/);
                    if (nameMatch && nameMatch[1]) {
                        pluginName = nameMatch[1];
                    } else {
                        const words = userIntent.split(' ').filter(w => w.length > 3);
                        if (words.length > 0) {
                            pluginName = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                        }
                    }
                }

                // Fallback: extract icon from code if not in response
                if (pluginIcon === "\uD83E\uDD16") {
                    const iconMatch = codeString.match(/icon:\s*['"](.*?)['"]/);
                    if (iconMatch && iconMatch[1]) {
                        pluginIcon = iconMatch[1];
                    }
                }

                const result = await window.featureLoader.hotDeployPlugin(codeString, {
                    name: pluginName,
                    icon: pluginIcon
                });
                if (result.success) {
                    return `I have generated and activated "${pluginName}" for you via FORGE.`;
                } else {
                    return `FORGE Deployment Failed: ${result.error}`;
                }
            }

            // Fallback: Use the legacy register method or just notify
            console.log("Sentinel Generated Plugin Code:", codeString);

            try {
                // AUDIT FIX: Use new Function() instead of eval() to prevent local scope pollution
                const runPlugin = new Function(codeString);
                runPlugin();

                if (window.LoadedPlugin && window.LoadedPlugin.init) {
                    window.LoadedPlugin.init(window.QuantaVibeAPI);
                    return "I've synthesized and initialized the requested tool.";
                } else {
                    return "The generated code structure was invalid.";
                }

            } catch (pluginError) {
                return `Plugin synthesis failed during activation: ${pluginError.message}`;
            }

        } catch (e) {
            return `I could not synthesize that tool: ${e.message}`;
        }
    }

    // Track experiments for reproducibility
    logExperiment(params, results) {
        const expData = {
            params,
            results,
            type: 'simulation'
        };
        this.memory.promptSave(expData);
        this.experimentLog.push(expData);
        console.log("Sentinel: Experiment Logged");
    }
}

// Global Instance
window.sentinelCore = new SentinelCore();
