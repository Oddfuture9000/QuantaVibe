/**
 * PluginWorkshop.js — Multi-Method Plugin Creation Hub
 * 
 * Provides 3 ways to create plugins:
 * 1. AI Builder - Natural language to code
 * 2. Template Wizard - Pre-made templates
 * 3. Code Editor - Manual coding
 */

class PluginWorkshop {
    constructor() {
        this.modal = null;
        this.templates = {
            visualizer: {
                name: "Custom Visualizer",
                icon: "📊",
                description: "Create a custom visualization for circuit data",
                code: `window.LoadedPlugin = {
    init: function(api) {
        const win = api.createPluginWindow('my-viz', 'My Visualizer', { width: '300px', height: '250px' });
        win.innerHTML = \`
            <div style="padding: 15px; color: #e2e8f0;">
                <h3 style="margin: 0 0 10px;">Circuit Stats</h3>
                <div id="viz-content">Loading...</div>
            </div>
        \`;
        
        this.update = () => {
            const gates = api.getCircuitState();
            document.getElementById('viz-content').innerHTML = \`
                <p>Total Gates: <strong>\${gates.length}</strong></p>
                <p>Gate Types: <strong>\${[...new Set(gates.map(g => g.type))].join(', ') || 'None'}</strong></p>
            \`;
        };
        
        this.update();
        setInterval(() => this.update(), 2000);
    }
};`
            },
            analyzer: {
                name: "Circuit Analyzer",
                icon: "🔬",
                description: "Analyze circuit properties and patterns",
                code: `window.LoadedPlugin = {
    init: function(api) {
        const win = api.createPluginWindow('analyzer', 'Circuit Analyzer', { width: '320px', height: '280px' });
        
        const analyze = () => {
            const gates = api.getCircuitState();
            const depth = Math.max(...gates.map(g => g.col || 0), 0);
            const qubits = new Set(gates.map(g => g.wire));
            const entangling = gates.filter(g => ['CNOT', 'CZ', 'SWAP'].includes(g.type)).length;
            
            win.innerHTML = \`
                <div style="padding: 15px; color: #e2e8f0; font-size: 13px;">
                    <h3 style="margin: 0 0 15px; color: #a78bfa;">📊 Analysis</h3>
                    <div style="display: grid; gap: 8px;">
                        <div>Circuit Depth: <strong style="color: #22d3ee;">\${depth}</strong></div>
                        <div>Active Qubits: <strong style="color: #22d3ee;">\${qubits.size}</strong></div>
                        <div>Entangling Gates: <strong style="color: #f472b6;">\${entangling}</strong></div>
                        <div>Total Gates: <strong>\${gates.length}</strong></div>
                    </div>
                    <button onclick="this.closest('.plugin-window')?.querySelector('[data-action=analyze]')?.click()" 
                            style="margin-top: 15px; padding: 8px 16px; background: #7c3aed; border: none; border-radius: 6px; color: white; cursor: pointer;">
                        Refresh
                    </button>
                </div>
            \`;
        };
        
        analyze();
        api.showToast('Analyzer Ready', 'success');
    }
};`
            },
            optimizer: {
                name: "Gate Optimizer",
                icon: "⚡",
                description: "Suggest optimizations for your circuit",
                code: `window.LoadedPlugin = {
    init: function(api) {
        const win = api.createPluginWindow('optimizer', 'Gate Optimizer', { width: '300px', height: '220px' });
        win.innerHTML = \`
            <div style="padding: 15px; color: #e2e8f0;">
                <h3 style="margin: 0 0 10px; color: #4ade80;">⚡ Optimizer</h3>
                <p style="font-size: 12px; color: #94a3b8;">Click to analyze potential optimizations.</p>
                <button id="opt-run" style="margin-top: 10px; padding: 8px 16px; background: #16a34a; border: none; border-radius: 6px; color: white; cursor: pointer;">
                    Run Optimization Check
                </button>
                <div id="opt-result" style="margin-top: 15px; font-size: 12px;"></div>
            </div>
        \`;
        
        document.getElementById('opt-run').onclick = () => {
            const gates = api.getCircuitState();
            const suggestions = [];
            
            // Check for consecutive same gates
            for (let i = 1; i < gates.length; i++) {
                if (gates[i].type === gates[i-1].type && gates[i].wire === gates[i-1].wire) {
                    if (['X', 'Y', 'Z', 'H'].includes(gates[i].type)) {
                        suggestions.push(\`Two consecutive \${gates[i].type} gates on q[\${gates[i].wire}] cancel out\`);
                    }
                }
            }
            
            document.getElementById('opt-result').innerHTML = suggestions.length 
                ? '<strong style="color: #fbbf24;">Suggestions:</strong><br>' + suggestions.join('<br>')
                : '<span style="color: #4ade80;">✓ No obvious optimizations found</span>';
        };
    }
};`
            },
            exporter: {
                name: "Circuit Exporter",
                icon: "📤",
                description: "Export circuit to various formats",
                code: `window.LoadedPlugin = {
    init: function(api) {
        const win = api.createPluginWindow('exporter', 'Circuit Exporter', { width: '280px', height: '200px' });
        win.innerHTML = \`
            <div style="padding: 15px; color: #e2e8f0;">
                <h3 style="margin: 0 0 15px;">📤 Export As</h3>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button onclick="exportJSON()" style="padding: 10px; background: #3b82f6; border: none; border-radius: 6px; color: white; cursor: pointer;">JSON</button>
                    <button onclick="exportQASM()" style="padding: 10px; background: #8b5cf6; border: none; border-radius: 6px; color: white; cursor: pointer;">OpenQASM</button>
                </div>
            </div>
        \`;
        
        window.exportJSON = () => {
            const data = JSON.stringify(api.getCircuitState(), null, 2);
            navigator.clipboard.writeText(data);
            api.showToast('JSON copied to clipboard!', 'success');
        };
        
        window.exportQASM = () => {
            const gates = api.getCircuitState();
            let qasm = 'OPENQASM 2.0;\\ninclude "qelib1.inc";\\nqreg q[5];\\ncreg c[5];\\n\\n';
            gates.forEach(g => {
                if (g.type === 'CNOT') qasm += \`cx q[\${g.wire}], q[\${g.target}];\\n\`;
                else if (g.type === 'MEASURE') qasm += \`measure q[\${g.wire}] -> c[\${g.wire}];\\n\`;
                else qasm += \`\${g.type.toLowerCase()} q[\${g.wire}];\\n\`;
            });
            navigator.clipboard.writeText(qasm);
            api.showToast('QASM copied to clipboard!', 'success');
        };
    }
};`
            }
        };
    }

    createModal() {
        if (this.modal) return this.modal;

        const modal = document.createElement('div');
        modal.id = 'pluginWorkshopModal';
        modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] hidden flex items-center justify-center';
        modal.innerHTML = `
            <div class="bg-gray-900 border border-purple-500/30 rounded-xl w-[700px] max-h-[85vh] overflow-hidden shadow-2xl">
                <!-- Header -->
                <div class="flex items-center justify-between p-4 border-b border-gray-800">
                    <h2 class="text-lg font-bold text-purple-400">🔧 Plugin Workshop</h2>
                    <button id="closeWorkshop" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                
                <!-- Tabs -->
                <div class="flex border-b border-gray-800">
                    <button class="workshop-tab active flex-1 py-3 text-sm font-medium" data-tab="ai">🤖 AI Builder</button>
                    <button class="workshop-tab flex-1 py-3 text-sm font-medium" data-tab="templates">📦 Templates</button>
                    <button class="workshop-tab flex-1 py-3 text-sm font-medium" data-tab="code">💻 Code Editor</button>
                </div>
                
                <!-- Content -->
                <div class="p-5 overflow-y-auto max-h-[60vh]">
                    <!-- AI Builder Tab -->
                    <div id="tab-ai" class="workshop-content">
                        <p class="text-gray-400 text-sm mb-4">Describe the plugin you want to create in natural language.</p>
                        <textarea id="aiPrompt" class="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white text-sm resize-none focus:border-purple-500 focus:outline-none" 
                                  placeholder="Example: Create a plugin that shows a pie chart of gate type distribution..."></textarea>
                        <button id="aiGenerate" class="mt-4 w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium text-white hover:opacity-90 transition">
                            ✨ Generate Plugin
                        </button>
                        <div id="aiResult" class="mt-4 hidden">
                            <pre id="aiCode" class="bg-gray-950 rounded-lg p-4 text-xs text-green-400 overflow-x-auto max-h-48"></pre>
                            <div class="flex gap-3 mt-3">
                                <button id="aiDeploy" class="flex-1 py-2 bg-green-600 rounded-lg text-white text-sm">Deploy</button>
                                <button id="aiCopy" class="flex-1 py-2 bg-gray-700 rounded-lg text-white text-sm">Copy</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Templates Tab -->
                    <div id="tab-templates" class="workshop-content hidden">
                        <p class="text-gray-400 text-sm mb-4">Choose a pre-made template to get started quickly.</p>
                        <div id="templateGrid" class="grid grid-cols-2 gap-4"></div>
                    </div>
                    
                    <!-- Code Editor Tab -->
                    <div id="tab-code" class="workshop-content hidden">
                        <p class="text-gray-400 text-sm mb-3">Write your plugin code directly. Use the <code class="bg-gray-800 px-1 rounded">api</code> object.</p>
                        <textarea id="codeEditor" class="w-full h-64 bg-gray-950 border border-gray-700 rounded-lg p-3 text-green-400 font-mono text-xs resize-none focus:border-purple-500 focus:outline-none"
                                  placeholder="window.LoadedPlugin = {\n    init: function(api) {\n        // Your code here\n    }\n};"></textarea>
                        <div class="flex gap-3 mt-4">
                            <button id="codeTest" class="flex-1 py-2 bg-yellow-600 rounded-lg text-white text-sm">🧪 Test</button>
                            <button id="codeDeploy" class="flex-1 py-2 bg-green-600 rounded-lg text-white text-sm">🚀 Deploy</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;
        this.bindEvents();
        this.renderTemplates();
        return modal;
    }

    bindEvents() {
        // Close
        document.getElementById('closeWorkshop').onclick = () => this.hide();
        this.modal.onclick = (e) => { if (e.target === this.modal) this.hide(); };

        // Tabs
        this.modal.querySelectorAll('.workshop-tab').forEach(tab => {
            tab.onclick = () => {
                this.modal.querySelectorAll('.workshop-tab').forEach(t => t.classList.remove('active'));
                this.modal.querySelectorAll('.workshop-content').forEach(c => c.classList.add('hidden'));
                tab.classList.add('active');
                document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
            };
        });

        // AI Builder
        document.getElementById('aiGenerate').onclick = () => this.generateFromAI();
        document.getElementById('aiDeploy')?.addEventListener('click', () => this.deployCode(document.getElementById('aiCode').textContent));
        document.getElementById('aiCopy')?.addEventListener('click', () => {
            navigator.clipboard.writeText(document.getElementById('aiCode').textContent);
            window.showToast?.('Copied!', 'success');
        });

        // Code Editor
        document.getElementById('codeTest').onclick = () => this.testCode(document.getElementById('codeEditor').value);
        document.getElementById('codeDeploy').onclick = () => this.deployCode(document.getElementById('codeEditor').value);
    }

    renderTemplates() {
        const grid = document.getElementById('templateGrid');
        if (!grid) return;

        grid.innerHTML = Object.entries(this.templates).map(([key, tmpl]) => `
            <div class="template-card bg-gray-800/50 border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-purple-500 transition" data-template="${key}">
                <div class="text-2xl mb-2">${tmpl.icon}</div>
                <h4 class="font-medium text-white text-sm">${tmpl.name}</h4>
                <p class="text-gray-500 text-xs mt-1">${tmpl.description}</p>
            </div>
        `).join('');

        grid.querySelectorAll('.template-card').forEach(card => {
            card.onclick = () => {
                const key = card.dataset.template;
                const template = this.templates[key];
                document.getElementById('codeEditor').value = template.code;
                // Switch to code tab
                this.modal.querySelector('[data-tab="code"]').click();
                window.showToast?.(`Loaded: ${template.name}`, 'info');
            };
        });
    }

    async generateFromAI() {
        const prompt = document.getElementById('aiPrompt').value.trim();
        if (!prompt) {
            window.showToast?.('Please describe the plugin you want.', 'error');
            return;
        }

        const btn = document.getElementById('aiGenerate');
        btn.disabled = true;
        btn.innerHTML = '<span class="animate-pulse">Generating...</span>';

        try {
            if (!window.geminiClient) throw new Error('Gemini Client not available');
            const code = await window.geminiClient.generateFeature(prompt);

            document.getElementById('aiCode').textContent = code;
            document.getElementById('aiResult').classList.remove('hidden');
            window.showToast?.('Plugin generated!', 'success');
        } catch (e) {
            window.showToast?.(`Error: ${e.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '✨ Generate Plugin';
        }
    }

    testCode(code) {
        if (!code.trim()) {
            window.showToast?.('No code to test', 'error');
            return;
        }

        const result = window.featureLoader?.shadowTestFeature?.(code);
        if (result?.success) {
            window.showToast?.('✓ Code passed sandbox test!', 'success');
        } else {
            window.showToast?.(`Test failed: ${result?.error || 'Unknown error'}`, 'error');
        }
    }

    deployCode(code) {
        if (!code.trim()) {
            window.showToast?.('No code to deploy', 'error');
            return;
        }

        try {
            // Security test first
            const test = window.featureLoader?.shadowTestFeature?.(code);
            if (test && !test.success) {
                window.showToast?.(`Security check failed: ${test.error}`, 'error');
                return;
            }

            // Cleanup previous plugin to prevent memory leaks and namespace pollution
            if (window.LoadedPlugin) {
                if (typeof window.LoadedPlugin.destroy === 'function') {
                    try { window.LoadedPlugin.destroy(); } catch(e) { console.warn('Plugin cleanup error:', e); }
                }
                window.LoadedPlugin = null;
            }

            // Execute in scoped function to limit global pollution
            const pluginLoader = new Function('QuantaVibeAPI', code + '\nreturn window.LoadedPlugin;');
            const plugin = pluginLoader(window.QuantaVibeAPI);

            if (plugin?.init || window.LoadedPlugin?.init) {
                const activePlugin = plugin || window.LoadedPlugin;
                activePlugin.init(window.QuantaVibeAPI);
                // Track deployed plugin for future cleanup
                this._activePlugin = activePlugin;
                window.showToast?.('Plugin deployed successfully!', 'success');
                this.hide();
            } else {
                window.showToast?.('Invalid plugin structure: missing init()', 'error');
            }
        } catch (e) {
            window.showToast?.(`Deploy error: ${e.message}`, 'error');
        }
    }

    show() {
        this.createModal();
        this.modal.classList.remove('hidden');
    }

    hide() {
        this.modal?.classList.add('hidden');
    }
}

// Styles
const workshopStyles = document.createElement('style');
workshopStyles.textContent = `
    .workshop-tab { color: #6b7280; border-bottom: 2px solid transparent; transition: all 0.2s; }
    .workshop-tab:hover { color: #a78bfa; }
    .workshop-tab.active { color: #a78bfa; border-bottom-color: #a78bfa; background: rgba(147, 51, 234, 0.1); }
`;
document.head.appendChild(workshopStyles);

// Global instance
window.pluginWorkshop = new PluginWorkshop();
