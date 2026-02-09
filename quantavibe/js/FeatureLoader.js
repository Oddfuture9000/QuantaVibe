if (typeof FeatureLoader === 'undefined') {
    class FeatureLoader {
        constructor() {
            if (FeatureLoader.instance) {
                return FeatureLoader.instance;
            }
            FeatureLoader.instance = this;

            // Expose Global API for Agent
            window.registerCustomFeature = (name, icon, callback) => {
                console.log(`[FeatureLoader] Registering: ${name}`);
                this.register({ name, icon, callback });
            };
        }

        get menu() {
            return document.getElementById('custom-features-list');
        }

        get sandbox() {
            return document.getElementById('feature-sandbox');
        }

        register(feature) {
            // Add to UI immediately
            if (!this.menu) {
                // Wait for DOM
                setTimeout(() => this.register(feature), 100);
                return;
            }

            // Prevent duplicates
            if (this.loadedPlugins && this.loadedPlugins.has(feature.name)) {
                // Already registered in UI?
                // Just ensure internal state
            }

            // Deduplication Check: Look for existing button with same name in UI
            const existingItems = Array.from(this.menu.querySelectorAll('li span.font-medium'));
            if (existingItems.some(span => span.textContent === feature.name)) {
                // console.log(`[FeatureLoader] Feature "${feature.name}" already registered in UI. Skipping.`);
                return;
            }

            // Remove "No plugins" message if present
            if (this.menu.querySelector('li.text-gray-600')) {
                this.menu.innerHTML = '';
            }

            const li = document.createElement('li');
            const btn = document.createElement('button');
            // Restore Sophisticated Styling
            btn.className = "w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] rounded-xl flex items-center gap-3 transition-all duration-200 border border-white/5 hover:border-purple-500/30 group";
            btn.innerHTML = `
                <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600/50 to-cyan-600/50 flex items-center justify-center text-sm shadow-inner">${feature.icon || '🧩'}</span> 
                <span class="flex-1 font-medium">${feature.name}</span>
            `;

            // Add Edit & Delete Buttons for VFS features
            if (feature.type === 'custom') {
                const actionsDiv = document.createElement('div');
                actionsDiv.className = "flex gap-1 opacity-0 group-hover:opacity-100 transition";

                // Edit Button
                const editBtn = document.createElement('span');
                editBtn.innerHTML = '✏️';
                editBtn.className = "text-gray-500 hover:text-purple-400 px-1 cursor-pointer text-[10px]";
                editBtn.title = "Edit Feature";
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.openEditModal(feature);
                };
                actionsDiv.appendChild(editBtn);

                // Delete Button
                const delBtn = document.createElement('span');
                delBtn.innerHTML = '&times;';
                delBtn.className = "text-gray-500 hover:text-red-400 px-1 cursor-pointer text-lg leading-none";
                delBtn.title = "Delete Feature";
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete feature "${feature.name}"?`)) {
                        if (typeof FileSystemManager !== 'undefined') {
                            FileSystemManager.deleteFile(feature.file);
                            const reg = FileSystemManager.getRegistry().filter(f => f.file !== feature.file);
                            FileSystemManager.saveRegistry(reg);
                        }
                        li.remove();
                        if (window.showToast) window.showToast(`Deleted ${feature.name}`, "info");
                    }
                };
                actionsDiv.appendChild(delBtn);

                btn.appendChild(actionsDiv);
            }

            btn.onclick = () => {
                console.log(`[FeatureLoader] Activating ${feature.name}`);
                if (feature.callback) {
                    try {
                        feature.callback(window.QuantaVibeAPI);
                        if (window.showToast) window.showToast(`Activated: ${feature.name}`, "success");
                    } catch (e) {
                        console.error(e);
                        if (window.showToast) window.showToast(`Error: ${e.message}`, "error");
                    }
                } else {
                    this.activateFeature(feature);
                }
            };

            li.appendChild(btn);
            this.menu.appendChild(li);

            // Track loaded
            if (!this.loadedPlugins) this.loadedPlugins = new Set();
            this.loadedPlugins.add(feature.name);
        }

        async load() {
            // Guard against concurrent or duplicate load() calls
            if (this._loading) {
                console.log("[FeatureLoader] load() already running. Skipping.");
                return;
            }
            // Allow reload if previously loaded, but clear first
            if (this._loaded) {
                console.log("[FeatureLoader] Reloading plugins...");
                this.loadedPlugins = new Set();
            }

            this._loading = true;
            console.log("[DEBUG] FeatureLoader.load() called");
            this.ensureEntryPoint();

            // 1. Load Registry from VFS
            if (typeof FileSystemManager === 'undefined' || !FileSystemManager || typeof FileSystemManager.getRegistry !== 'function') {
                console.warn("[FeatureLoader] FileSystemManager not available. Cannot load plugins.");
                this._loading = false;
                return;
            }
            const allFeatures = FileSystemManager.getRegistry();

            this.renderMenu(allFeatures);

            // 2. Autoload Plugins
            for (const f of allFeatures) {
                if (f.autoload) {
                    await this.activateFeature(f);
                }
            }

            this._loaded = true;
            this._loading = false;
        }

        ensureEntryPoint() {
            const dropdown = document.getElementById('advancedDropdown');
            if (!dropdown) return;

            const existingBtn = document.getElementById('btn-custom-features') ||
                dropdown.querySelector('button[onclick="openCustomFeaturesModal()"]');

            if (!existingBtn) {
                const btn = document.createElement('button');
                btn.id = 'btn-custom-features';
                btn.setAttribute('onclick', 'openCustomFeaturesModal()');
                btn.className = "text-left px-4 py-3 text-sm font-bold text-purple-300 bg-gray-800 hover:bg-gray-700 transition border-t border-gray-700 flex items-center gap-2";
                btn.innerHTML = '<span>🧩</span> Custom Features';
                dropdown.appendChild(btn);
            }
        }

        renderMenu(features) {
            if (!this.menu) return;
            this.menu.innerHTML = '';

            if (features.length === 0) {
                this.menu.innerHTML = '<li class="text-[10px] text-gray-600 px-2">No plugins installed</li>';
                return;
            }

            features.forEach(f => {
                this.register(f);
            });
        }

        async activateFeature(feature) {
            try {
                if (!this.loadedPlugins) this.loadedPlugins = new Set();

                // Prevent duplicate activation — if plugin is already loaded,
                // just show its UI (if it has one) instead of re-loading the script
                if (this.loadedPlugins.has(feature.file || feature.name)) {
                    console.log(`[FeatureLoader] "${feature.name}" already loaded. Skipping re-activation.`);
                    if (window.showToast) window.showToast(`${feature.name} is already active`, "info");
                    return;
                }

                this.loadedPlugins.add(feature.file || feature.name);

                window.LoadedPlugin = null;

                if (feature.type === 'custom') {
                    if (typeof FileSystemManager !== 'undefined') {
                        const content = FileSystemManager.readFile(feature.file);
                        if (!content) throw new Error(`File not found: ${feature.file}`);

                        const blob = new Blob([content], { type: 'application/javascript' });
                        const url = URL.createObjectURL(blob);
                        await this.loadScript(url);
                        URL.revokeObjectURL(url);
                    }
                } else {
                    await this.loadScript(`./features/${feature.file}`);
                }

                if (window.LoadedPlugin && window.LoadedPlugin.init) {
                    window.LoadedPlugin.init(window.QuantaVibeAPI);
                    if (window.showToast) window.showToast(`Loaded Plugin: ${feature.name}`, "success");
                } else {
                    if (window.showToast) window.showToast(`Loaded: ${feature.name}`, "info");
                }
            } catch (e) {
                console.error(`Could not load feature ${feature.name}`, e);
                if (window.showToast) window.showToast(`Plugin Error: ${e.message}`, "error");
            }
        }

        loadScript(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                if (src.startsWith('blob:')) {
                    script.src = src;
                } else {
                    script.src = src + '?t=' + Date.now();
                }
                script.onload = () => resolve();
                script.onerror = (e) => reject(new Error("Script load failed: " + src));
                document.body.appendChild(script);
            });
        }

        createEditModal() {
            if (document.getElementById('featureEditModal')) return;

            const modal = document.createElement('div');
            modal.id = 'featureEditModal';
            modal.className = "hidden fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm";
            modal.innerHTML = `
                    <div class="bg-gray-900 border border-purple-500/30 rounded-lg p-6 w-96 shadow-2xl">
                        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span>✏️</span> Edit Feature <span id="editFeatureName" class="text-purple-400 text-sm font-mono ml-auto"></span>
                        </h3>
                        
                        <div class="mb-4">
                            <label class="block text-gray-400 text-xs mb-2">Instructions for Gemini 3:</label>
                            <textarea id="editFeaturePrompt" class="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm h-32 focus:border-purple-500 focus:outline-none resize-none" placeholder="Make the particles move faster..."></textarea>
                        </div>

                        <div class="flex justify-end gap-2">
                            <button id="closeEditModalBtn" class="px-3 py-1 text-gray-400 hover:text-white text-sm">Cancel</button>
                            <button id="submitEditModalBtn" class="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-bold shadow-lg">
                                Update Feature
                            </button>
                        </div>
                    </div>
                `;
            document.body.appendChild(modal);

            document.getElementById('closeEditModalBtn').onclick = () => {
                modal.classList.add('hidden');
            };
        }

        openEditModal(feature) {
            const listModal = document.getElementById('pluginManagerModal');
            if (listModal) listModal.classList.add('hidden');

            this.createEditModal();
            const modal = document.getElementById('featureEditModal');
            const nameSpan = document.getElementById('editFeatureName');
            const promptInput = document.getElementById('editFeaturePrompt');
            const submitBtn = document.getElementById('submitEditModalBtn');

            nameSpan.innerText = feature.name;
            promptInput.value = "";
            modal.classList.remove('hidden');
            promptInput.focus();

            submitBtn.onclick = async () => {
                const instructions = promptInput.value.trim();
                if (!instructions) return;

                promptInput.disabled = true;
                submitBtn.disabled = true;
                submitBtn.innerHTML = `Updating...`;

                try {
                    await this.handleEditSubmit(feature, instructions);
                    modal.classList.add('hidden');
                    if (window.showToast) window.showToast(`Updated ${feature.name}`, "success");
                } catch (e) {
                    console.error(e);
                    if (window.showToast) window.showToast(`Update Failed: ${e.message}`, "error");
                } finally {
                    promptInput.disabled = false;
                    submitBtn.disabled = false;
                    submitBtn.innerText = "Update Feature";
                }
            };
        }

        async handleEditSubmit(feature, instructions) {
            if (typeof FileSystemManager === 'undefined') throw new Error("FileSystemManager missing");

            const currentCode = FileSystemManager.readFile(feature.file);
            if (!currentCode) throw new Error("Could not read original feature file");

            const prompt = `
        Original Code for "${feature.name}":
        \`\`\`javascript
        ${currentCode}
        \`\`\`

        User Update Request:
        "${instructions}"

        Task: Rewrite the code to implement the user's request. 
        CRITICAL: You must REFACTOR this code to use the new \`window.LoadedPlugin\` pattern and ONLY use valid \`window.QuantaVibeAPI\` methods. 
        Do NOT preserve the old structure if it uses \`setCouplingMap\` or other invalid methods.
        Return the FULL updated javascript file.
        `;

            if (!window.geminiClient) throw new Error("GeminiClient missing");
            const result = await window.geminiClient.generateFeature(prompt);
            const newCode = typeof result === 'string' ? result : result.code;

            if (typeof result === 'object' && result.name) {
                const reg = FileSystemManager.getRegistry();
                const entry = reg.find(f => f.file === feature.file);
                if (entry) {
                    entry.name = result.name;
                    if (result.icon) entry.icon = result.icon;
                    FileSystemManager.saveRegistry(reg);
                }
            }

            FileSystemManager.saveFile(feature.file, newCode);
            this.load();
        }

        openWorkshop() {
            if (window.pluginWorkshop) {
                window.pluginWorkshop.show();
            } else {
                console.error("PluginWorkshop not loaded");
            }
        }

        exportPlugin(feature) {
            if (window.p2pBridge && feature) {
                const code = FileSystemManager.readFile(feature.file);
                window.p2pBridge.createShareModal({
                    name: feature.name,
                    icon: feature.icon,
                    code: code
                });
            }
        }

        importPlugin() {
            if (window.p2pBridge) {
                window.p2pBridge.createImportModal();
            }
        }

        async hotDeployPlugin(code, metadata = {}) {
            try {
                const name = metadata.name || 'Sentinel Plugin';
                const icon = metadata.icon || '\uD83E\uDD16';
                const fileName = 'sentinel_' + name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '.js';

                // Save to VFS
                if (typeof FileSystemManager !== 'undefined') {
                    FileSystemManager.saveFile(fileName, code);
                    const reg = FileSystemManager.getRegistry();
                    // Remove existing with same file to avoid duplicates
                    const filtered = reg.filter(f => f.file !== fileName);
                    filtered.push({ name, icon, file: fileName, type: 'custom' });
                    FileSystemManager.saveRegistry(filtered);
                }

                // Execute the plugin code
                window.LoadedPlugin = null;
                const blob = new Blob([code], { type: 'application/javascript' });
                const url = URL.createObjectURL(blob);
                await this.loadScript(url);
                URL.revokeObjectURL(url);

                if (window.LoadedPlugin && window.LoadedPlugin.init) {
                    window.LoadedPlugin.init(window.QuantaVibeAPI);
                }

                // Track as loaded
                if (!this.loadedPlugins) this.loadedPlugins = new Set();
                this.loadedPlugins.add(fileName);

                // Refresh plugin list UI
                await this.load();

                return { success: true, name };
            } catch (e) {
                console.error('[FeatureLoader] hotDeployPlugin error:', e);
                return { success: false, error: e.message };
            }
        }

        async shadowTestFeature(code) {
            // Simplified Shadow Test stub for safety
            return { success: true };
        }
    }

    // Expose Global
    window.FeatureLoader = FeatureLoader;
}
