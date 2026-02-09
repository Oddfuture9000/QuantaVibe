
window.GateCostCalculator = {
    init: function () {
        console.log("The Budgeteer (AI Mode) Initialized");
        // Override the global trigger function
        window.triggerResourceEstimator = this.estimateResources.bind(this);
    },

    estimateResources: async function () {
        const modal = document.getElementById('resourceModal');
        const content = document.getElementById('resourceContent');
        if (!modal || !content) return;

        modal.classList.remove('hidden');
        if (typeof toggleAdvancedMenu === 'function') toggleAdvancedMenu();

        // Loading State
        content.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8">
                <svg class="animate-spin h-8 w-8 text-blue-500 mb-4" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="text-gray-400 animate-pulse">Consulting The Budgeteer...</span>
            </div>
        `;

        try {
            const gates = window.gates || [];
            const activeProfile = window.activeDeviceProfile || { name: "Generic Quantum Processor" };

            const payload = {
                gates: gates,
                device_profile: activeProfile
            };

            const systemPrompt = `
                You are "The Budgeteer", a specialized Quantum Resource Estimator for QuantaVibe.
                Analyze the provided circuit and device profile.
                
                Estimate:
                1. Total Gates
                2. Circuit Depth
                3. T-Gate Count (approximate based on rotations if any)
                4. Two-Qubit Gates (CNOT, SWAP, etc)
                5. Fidelity Score (0.0 to 1.0)
                6. Fidelity Rating (Low, Medium, High, Ultra)
                
                output strictly valid JSON in this format:
                {
                  "total_gates": 0,
                  "circuit_depth": 0,
                  "t_gates": 0,
                  "two_qubit_gates": 0,
                  "fidelity_score": 0.95,
                  "fidelity_rating": "High",
                  "profile_used": "Name of device"
                }
            `;

            if (!window.geminiClient) throw new Error("AI Connectivity Offline");

            const responseText = await window.geminiClient.generateContent(
                `Estimate resources for this circuit state: ${JSON.stringify(payload)}`,
                systemPrompt
            );

            // Robust JSON parsing
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("The Budgeteer returned malformed data.");

            const data = JSON.parse(jsonMatch[0]);

            if (data.error) throw new Error(data.error);

            this.renderReport(content, data);

        } catch (e) {
            console.error("Budgeteer Error:", e);
            content.innerHTML = `
                <div class="text-center p-4">
                    <div class="text-red-400 font-bold mb-2">Estimation Failed</div>
                    <div class="text-xs text-red-300/70">${e.message}</div>
                    <button onclick="triggerResourceEstimator()" class="mt-4 bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-xs">Retry</button>
                </div>
            `;
        }
    },

    renderReport: function (container, data) {
        const scoreColor = data.fidelity_score > 0.9 ? 'text-emerald-400' : (data.fidelity_score > 0.7 ? 'text-blue-400' : 'text-red-400');
        const barColor = data.fidelity_score > 0.9 ? 'bg-emerald-500' : (data.fidelity_score > 0.7 ? 'bg-blue-500' : 'bg-red-500');

        container.innerHTML = `
            <div class="grid grid-cols-2 gap-4 text-xs">
                <div class="bg-gray-900 p-3 rounded border border-gray-700">
                    <div class="text-gray-500 mb-1 uppercase tracking-wider text-[10px]">Total Gates</div>
                    <div class="text-xl text-white font-mono">${data.total_gates}</div>
                </div>
                <div class="bg-gray-900 p-3 rounded border border-gray-700">
                    <div class="text-gray-500 mb-1 uppercase tracking-wider text-[10px]">Circuit Depth</div>
                    <div class="text-xl text-white font-mono">${data.circuit_depth}</div>
                </div>
                <div class="bg-gray-900 p-3 rounded border border-gray-700">
                    <div class="text-gray-500 mb-1 uppercase tracking-wider text-[10px]">T-Gate Count</div>
                    <div class="text-xl text-purple-400 font-mono">${data.t_gates}</div>
                </div>
                <div class="bg-gray-900 p-3 rounded border border-gray-700">
                    <div class="text-gray-500 mb-1 uppercase tracking-wider text-[10px]">CX / 2-Qubit</div>
                    <div class="text-xl text-orange-400 font-mono">${data.two_qubit_gates}</div>
                </div>
            </div>
            
            <div class="mt-4 bg-gray-900/50 p-4 rounded border border-gray-700">
                <div class="flex justify-between items-end mb-2">
                     <span class="text-gray-400 font-bold text-xs uppercase tracking-wider">Fidelity Prediction</span>
                     <span class="${scoreColor} font-bold text-lg">${(data.fidelity_score * 100).toFixed(1)}%</span>
                </div>
                <div class="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div class="h-full ${barColor} transition-all duration-1000" style="width: ${data.fidelity_score * 100}%"></div>
                </div>
                <div class="mt-2 text-[10px] text-gray-500 flex justify-between">
                    <span>Profile: ${data.profile_used}</span>
                    <span>Rating: <span class="${scoreColor}">${data.fidelity_rating}</span></span>
                </div>
            </div>
        `;
    }
};

// Auto-init if loaded via script tag
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.GateCostCalculator.init();
} else {
    document.addEventListener('DOMContentLoaded', () => window.GateCostCalculator.init());
}
