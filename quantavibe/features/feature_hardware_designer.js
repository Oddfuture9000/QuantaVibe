window.LoadedPlugin = {
    // ======================================================================
    // Heavy-Hex Sub-Patch Mapping (IBM Heron R2 156-Qubit Lattice)
    // ======================================================================
    // Even though we simulate 5 qubits for the demo, they map to a real
    // sub-patch of the Heron R2 heavy-hex lattice. Physical qubit IDs
    // on the 156-qubit chip: [0, 1, 2, 4, 15].
    //
    // Heavy-Hex adjacency: degree-3 "hub" qubits connected to degree-1
    // "leaf" qubits via degree-2 "bridge" qubits.
    //
    //  Physical Layout (Sub-Patch):
    //
    //       Q0 (phys 0)
    //        |
    //       Q1 (phys 1) ---- Q2 (phys 2)     [Hub-Leaf]
    //        |
    //       Q3 (phys 4)                       [Bridge]
    //        |
    //       Q4 (phys 15) ---- ...             [Hub → next cell]
    //
    // ======================================================================
    HERON_SUBPATCH: {
        // Maps demo qubit index → physical Heron R2 qubit ID
        physicalMap: { 0: 0, 1: 1, 2: 2, 3: 4, 4: 15 },
        // Heavy-Hex adjacency list (undirected, stored as pairs)
        adjacency: [
            [0, 1],   // phys 0 ↔ phys 1  (leaf → hub)
            [1, 2],   // phys 1 ↔ phys 2  (hub → leaf)
            [1, 3],   // phys 1 ↔ phys 4  (hub → bridge)
            [3, 4]    // phys 4 ↔ phys 15 (bridge → hub)
        ],
        // Coupling map for simulator (bidirectional)
        coupling_map: [
            [0, 1], [1, 0],
            [1, 2], [2, 1],
            [1, 3], [3, 1],
            [3, 4], [4, 3]
        ],
        // Node roles in heavy-hex topology
        roles: {
            0: 'leaf',     // degree 1 — pendant qubit
            1: 'hub',      // degree 3 — heavy-hex hub
            2: 'leaf',     // degree 1 — pendant qubit
            3: 'bridge',   // degree 2 — inter-cell bridge
            4: 'hub'       // degree 3 — next cell hub (truncated)
        },
        // Canvas positions for sub-patch rendering
        positions: {
            0: { x: 400, y: 100 },   // Leaf (top)
            1: { x: 400, y: 200 },   // Hub
            2: { x: 500, y: 200 },   // Leaf (right)
            3: { x: 400, y: 300 },   // Bridge
            4: { x: 400, y: 400 }    // Hub (bottom)
        },
        // CZ is the native 2-qubit gate on Heron (tunable coupler)
        native_2q_gate: 'CZ'
    },

    init: function (api) {
        if (this.initialized) return;
        this.initialized = true;

        console.log("Initialize Hardware Designer");
        window.HwDesigner = this; // DATA EXPOSE
        this.api = api;
        try {
            this.createUI();
            this.addToCustomHardwareMenu();

            // Listen for Edit Events
            window.addEventListener('openHardwareDesigner', (e) => {
                this.open(e.detail);
            });

            console.log("Hardware Designer Ready");
        } catch (e) {
            console.error("Hardware Designer Init Error", e);
        }
    },

    addToCustomHardwareMenu: function () {
        const dropdown = document.getElementById('customHardwareList');
        // Prevent dupes
        if (dropdown && !document.getElementById('btn-hw-designer')) {
            const btn = document.createElement('div');
            btn.id = 'btn-hw-designer';
            btn.className = "px-4 py-2 border-b border-purple-500/30 mb-2";
            btn.innerHTML = `<button onclick="window.HwDesigner.open()" class="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-1.5 rounded flex items-center justify-center gap-2 shadow-lg shadow-purple-900/50 transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Design New Chip
            </button>`;
            dropdown.prepend(btn);
        }
    },

    createUI: function () {
        if (document.getElementById('hardwareDesignerModal')) return;

        // Create Modal Backdrop
        const modal = document.createElement('div');
        modal.id = 'hardwareDesignerModal';
        modal.className = "fixed inset-0 bg-black/80 z-[60] flex items-center justify-center hidden backdrop-blur-sm";

        // Modal Content
        modal.innerHTML = `
            <div class="bg-slate-900 border border-purple-500/50 rounded-xl shadow-2xl w-[500px] overflow-hidden">
                <!-- Header -->
                <div class="bg-gray-800/50 px-6 py-4 flex justify-between items-center border-b border-gray-700">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                    <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg> Hardware Designer
                </h2>
                    <button id="closeHwDesigner" class="text-gray-400 hover:text-white transition">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <!-- Body -->
                <div class="p-6 space-y-4">
                    
                    <!-- Name -->
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Chip Name</label>
                        <input type="text" id="hwName" class="w-full bg-gray-800 border-gray-700 rounded p-2 text-white focus:border-purple-500 focus:outline-none placeholder-gray-600" placeholder="e.g. My Custom Chip">
                    </div>

                    <!-- Layout Selector -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Topology</label>
                            <select id="hwLayout" class="w-full bg-gray-800 border-gray-700 rounded p-2 text-white focus:border-purple-500 focus:outline-none">
                                <option value="linear">Linear (Chain)</option>
                                <option value="grid">2D Grid (Lattice)</option>
                                <option value="hex">Heavy Hex (IBM)</option>
                            </select>
                        </div>
                     <!-- Visualization Mode Selector -->
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Analysis Mode</label>
                        <select id="hwVisualMode" class="w-full bg-gray-800 border-gray-700 rounded p-2 text-white focus:border-purple-500 focus:outline-none">
                            <option value="full_tomo">Full Tomography</option>
                            <option value="pauli_shadow">Pauli Shadow (High Perf)</option>
                            <option value="state_cloud">State Cloud (Sparse)</option>
                        </select>
                    </div>
                        <div id="hwDimensionsGroup" class="hidden">
                            <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Dimensions (WxH)</label>
                            <div class="flex gap-2">
                                <input type="number" id="hwWidth" value="4" min="2" max="10" class="w-full bg-gray-800 border-gray-700 rounded p-2 text-white focus:border-purple-500 focus:outline-none text-center">
                                <span class="text-gray-500 self-center">x</span>
                                <input type="number" id="hwHeight" value="4" min="2" max="10" class="w-full bg-gray-800 border-gray-700 rounded p-2 text-white focus:border-purple-500 focus:outline-none text-center">
                            </div>
                        </div>
                    </div>

                    <!-- Noise Config -->
                    <div class="bg-gray-800/30 rounded p-3 border border-gray-700/50">
                        <label class="block text-xs font-bold text-purple-400 uppercase mb-2">Noise Characteristics</label>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] text-gray-500">T1 Relaxation (\u00B5s)</label>
                                <input type="number" id="hwT1" value="50" class="w-full bg-gray-900 border-gray-700 rounded p-1 text-white text-sm">
                            </div>
                            <div>
                                <label class="text-[10px] text-gray-500">T2 Dephasing (\u00B5s)</label>
                                <input type="number" id="hwT2" value="25" class="w-full bg-gray-900 border-gray-700 rounded p-1 text-white text-sm">
                            </div>
                        </div>
                    </div>

                    <!-- Preview -->
                    <div id="hwPreview" class="text-xs text-center text-gray-500 italic mt-2">
                        Linear Chain: 5 Qubits
                    </div>

                </div>

                <!-- Footer -->
                <div class="bg-gray-800/50 px-6 py-4 flex justify-end gap-3 border-t border-gray-700">
                    <button id="cancelHw" class="px-4 py-2 text-sm text-gray-300 hover:text-white transition">Cancel</button>
                    <button id="saveHw" class="px-4 py-2 text-sm text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 rounded hover:bg-cyan-900/20 transition mr-auto">
                        Save Profile
                    </button>
                    <button id="createHw" class="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded shadow-lg shadow-purple-900/20 transition transform hover:scale-105">
                        Build Chip
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Events
        this.bindEvents();
    },

    bindEvents: function () {
        const modal = document.getElementById('hardwareDesignerModal');
        const layoutSel = document.getElementById('hwLayout');
        const dimGroup = document.getElementById('hwDimensionsGroup');
        const preview = document.getElementById('hwPreview');

        // Toggle Grid Inputs
        layoutSel.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'grid') {
                dimGroup.classList.remove('hidden');
                document.getElementById('hwWidth').parentElement.parentElement.classList.remove('col-span-2');
            } else {
                dimGroup.classList.add('hidden');
            }
            this.updatePreview();
        });

        // Live Update
        ['hwWidth', 'hwHeight', 'hwLayout'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.updatePreview());
        });

        // Close
        const close = () => modal.classList.add('hidden');
        document.getElementById('closeHwDesigner').onclick = close;
        document.getElementById('cancelHw').onclick = close;

        // Save
        document.getElementById('saveHw').onclick = () => {
            const profile = this.getProfileFromUI();

            // 1. File Download (Existing)
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", (profile.name || "hardware_profile") + ".json");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();

            // 2. LocalStorage Save (New for Custom Hardware Menu)
            try {
                const saved = localStorage.getItem('custom_hardware_profiles');
                let profiles = saved ? JSON.parse(saved) : [];
                // Remove existing with same name to update
                profiles = profiles.filter(p => p.name !== profile.name);
                profiles.push(profile);
                localStorage.setItem('custom_hardware_profiles', JSON.stringify(profiles));
                console.log("Hardware Profile Saved to LocalStorage");

                // Refresh list if app function exists
                if (window.refreshCustomHardwareList) window.refreshCustomHardwareList();

            } catch (e) {
                console.warn("Failed to save profile to LocalStorage", e);
            }
        };

        // Create (Build Chip) - Now Auto-Saves to Menu
        document.getElementById('createHw').onclick = () => {
            console.log("Build Chip Clicked");
            const profile = this.getProfileFromUI();

            console.log("Submitting Profile:", profile);

            // Auto-Save to LocalStorage for Menu Persistence
            try {
                const saved = localStorage.getItem('custom_hardware_profiles');
                let profiles = saved ? JSON.parse(saved) : [];
                profiles = profiles.filter(p => p.name !== profile.name);
                profiles.push(profile);
                localStorage.setItem('custom_hardware_profiles', JSON.stringify(profiles));
                if (window.refreshCustomHardwareList) window.refreshCustomHardwareList();
            } catch (e) { console.warn("Auto-save failed", e); }

            // Call API
            try {
                if (this.api.setCustomDeviceProfile(profile)) {
                    console.log("API Success");
                    close();
                } else {
                    console.error("API Rejected Profile");
                    alert("Error: API rejected profile. Check console.");
                }
            } catch (e) {
                console.error("API Call Exception", e);
                alert("Critical Error: " + e.message);
            }
        };
    },

    updatePreview: function () {
        const layout = document.getElementById('hwLayout').value;
        const w = document.getElementById('hwWidth').value;
        const h = document.getElementById('hwHeight').value;
        const div = document.getElementById('hwPreview');

        if (layout === 'grid') {
            const q = w * h;
            div.innerText = `Grid Topology: ${w}x${h} = ${q} Qubits`;
            if (q > 36) div.innerHTML += ' <span class="text-red-400 font-bold">(Exceeds 36 Qubits)</span>';

            // Smart Lock: Disable Full Tomography for > 12 Qubits
            const visualSel = document.getElementById('hwVisualMode');
            const fullTomoOpt = visualSel.querySelector('option[value="full_tomo"]');
            if (q > 12) {
                if (fullTomoOpt && !fullTomoOpt.disabled) {
                    fullTomoOpt.disabled = true;
                    fullTomoOpt.innerText = "Full Tomography (Too Large)";
                    if (visualSel.value === 'full_tomo') visualSel.value = 'pauli_shadow';
                }
            } else {
                if (fullTomoOpt) {
                    fullTomoOpt.disabled = false;
                    fullTomoOpt.innerText = "Full Tomography";
                }
            }
        } else if (layout === 'hex') {
            div.innerHTML = "Heavy-Hex Topology: 5-Qubit Sub-Patch of IBM Heron R2 (156Q)<br><span class='text-purple-400'>Physical Qubits: 0, 1, 2, 4, 15 \u2022 Native Gate: CZ</span>";
        } else {
            div.innerText = "Linear Chain: 5 Qubits (Default)";
        }
    },

    open: function (profile = null) {
        document.getElementById('hardwareDesignerModal').classList.remove('hidden');

        // Populate if profile provided (Edit Mode)
        if (profile) {
            document.getElementById('hwName').value = profile.name || "";
            document.getElementById('hwLayout').value = profile.layout || "linear";
            document.getElementById('hwT1').value = profile.t1 || 50;
            document.getElementById('hwT2').value = profile.t2 || 25;
            if (profile.visualMode) document.getElementById('hwVisualMode').value = profile.visualMode;

            // Trigger Layout Change to show/hide dims
            document.getElementById('hwLayout').dispatchEvent(new Event('change'));

            if (profile.layout === 'grid') {
                document.getElementById('hwWidth').value = profile.grid_width || 4;
                document.getElementById('hwHeight').value = profile.grid_height || 4;
            }

            this.updatePreview();
        }
    },

    getProfileFromUI: function () {
        const name = document.getElementById('hwName').value || "Custom Chip";
        const layout = document.getElementById('hwLayout').value;
        const visualMode = document.getElementById('hwVisualMode').value;
        const t1 = parseInt(document.getElementById('hwT1').value);
        const t2 = parseInt(document.getElementById('hwT2').value);

        let profile = {
            name: name,
            layout: layout,
            visualMode: visualMode,
            t1: t1,
            t2: t2
        };

        if (layout === 'grid') {
            const w = parseInt(document.getElementById('hwWidth').value);
            const h = parseInt(document.getElementById('hwHeight').value);
            profile.grid_width = w;
            profile.grid_height = h;
        }

        // Heavy-Hex: inject Heron R2 sub-patch metadata
        if (layout === 'hex') {
            const subpatch = this.HERON_SUBPATCH;
            profile.coupling_map = subpatch.coupling_map;
            profile.fixed_positions = subpatch.positions;
            profile.physicalMap = subpatch.physicalMap;
            profile.node_roles = subpatch.roles;
            profile.native_2q_gate = subpatch.native_2q_gate;
            profile.topology_note = 'Heavy-Hex sub-patch of 156-qubit IBM Heron R2 lattice (Qubits 0, 1, 2, 4, 15)';
        }

        return profile;
    },

    // Get the Heavy-Hex sub-patch data for external consumers (SentinelCore, PDF, etc.)
    getHeronSubpatch: function () {
        return this.HERON_SUBPATCH;
    }
};

// Register via Loader if present
// Auto-registration removed to prevent duplicates when loaded by FeatureLoader

