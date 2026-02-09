/**
 * Feature: Sentinel Probe
 * Description: Verifies the "Sentinel IDE Architect" protocol and API Bridge.
 * Author: Sentinel Architect (Gemini)
 */
window.LoadedPlugin = {
    init: function (api) {
        console.log("[Sentinel Probe] Initializing...");

        // 1. Verify API Bridge
        if (!api) {
            console.error("[Sentinel Probe] Critical: QuantaVibeAPI is missing!");
            if (window.showToast) window.showToast("Sentinel Probe Failed: API Missing", "error");
            return;
        }

        // 2. Announce Presence
        api.showToast_API("Sentinel Probe Online: API Bridge Verified", "success");

        // 3. Read Internal State (Test)
        const gates = api.getGridState();
        console.log(`[Sentinel Probe] Current Circuit has ${gates.length} gates.`);

        // 4. Create a "Sandbox" UI in the features panel (if needed)
        // For this probe, we just log to console and show toast.

        // 5. Bonus: Rotate a qubit on the Bloch sphere (Show visual control)
        // Rotate Qubit 0 to |-> state (X-axis) as a visual signal
        api.updateBloch(0, { x: 1, y: 0, z: 0 });
        console.log("[Sentinel Probe] Visual signal sent to Qubit 0.");
    }
};
