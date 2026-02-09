/**
 * PluginTemplates.js
 * Standard templates for Gemini-generated plugins to ensure consistency and safety.
 */

window.PLUGIN_TEMPLATES = {
    VISUALIZATION: `
window.LoadedPlugin = {
    init: function(api) {
        const win = api.createPluginWindow("viz-plugin-${Date.now()}", "New Visualization", { width: "400px", height: "300px" });
        
        // Canvas Setup
        const canvas = document.createElement('canvas');
        canvas.width = 380;
        canvas.height = 250;
        win.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        // Draw Loop
        function draw() {
            if(!document.contains(canvas)) return; // Cleanup check
            
            // Get Data
            const results = api.getLastSimulationResult();
            const counts = results ? results.counts : {};

            // Render Logic (Template)
            ctx.fillStyle = '#111827';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#22d3ee';
            let x = 10;
            for(let key in counts) {
                const h = counts[key] * 200; // Scale
                ctx.fillRect(x, 250 - h, 20, h);
                x += 25;
            }

            requestAnimationFrame(draw);
        }
        draw();
    }
};`,

    ANALYSIS: `
window.LoadedPlugin = {
    init: function(api) {
        const win = api.createPluginWindow("analysis-plugin-${Date.now()}", "Analysis Tool", { width: "300px" });
        const content = document.createElement('div');
        content.className = "p-4 text-sm text-gray-300 space-y-2";
        
        const btn = document.createElement('button');
        btn.innerText = "Run Analysis";
        btn.className = "w-full bg-purple-600 hover:bg-purple-500 rounded p-2 text-white font-bold";
        
        const output = document.createElement('div');
        output.className = "p-2 bg-gray-800 rounded border border-gray-700 font-mono mt-2";
        
        btn.onclick = () => {
             const res = api.getLastSimulationResult();
             if(!res) {
                 output.innerText = "No simulation data found.";
                 return;
             }
             // Analysis Logic
             const totalShots = Object.values(res.counts).reduce((a,b)=>a+b, 0);
             output.innerText = "Total Shots: " + totalShots;
        };

        content.appendChild(btn);
        content.appendChild(output);
        win.appendChild(content);
    }
};`
};
