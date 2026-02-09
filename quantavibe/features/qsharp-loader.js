
window.LoadedPlugin = {
    init: function() {
        console.log("Q# File Loader plugin initialized.");

        // Create a button for loading Q# files
        const loadButton = document.createElement('button');
        loadButton.textContent = 'Load Q# File';
        loadButton.style.cssText = `
            padding: 10px 15px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: #00e6e6;
            font-size: 14px;
            cursor: pointer;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            transition: background 0.3s ease, border-color 0.3s ease;
            margin-top: 10px;
            position: absolute; /* Positioning it for visibility, will need better integration */
            top: 20px;
            right: 20px;
            z-index: 1000;
        `;

        loadButton.onmouseover = function() {
            this.style.background = 'rgba(0, 230, 230, 0.2)';
            this.style.borderColor = '#00e6e6';
        };
        loadButton.onmouseout = function() {
            this.style.background = 'rgba(255, 255, 255, 0.1)';
            this.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        };

        loadButton.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.qs'; // Accept Q# files

            input.onchange = (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const content = e.target.result;
                        console.log("Loaded Q# file content:", content);
                        // Here, you would typically update the Q# editor or display area
                        // For demonstration, we'll log it and alert the user.
                        alert("Q# file loaded! Check console for content.");

                        // Assuming there's a global function or event to update the Q# editor
                        // If not, this is where integration with the existing Q# UI would happen.
                        // Example: window.qsharpEditor.setValue(content);
                        // Or a custom event: document.dispatchEvent(new CustomEvent('qsharpFileLoaded', { detail: content }));
                        if (window.qsharpEditor && typeof window.qsharpEditor.setValue === 'function') {
                            window.qsharpEditor.setValue(content);
                            console.log("Q# editor updated with loaded file content.");
                        } else {
                            console.warn("window.qsharpEditor not found or setValue not a function. Cannot update editor directly.");
                            // Fallback: Store it in a temporary global variable for debugging
                            window.lastLoadedQSharpContent = content;
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        };

        // Append the button to a suitable place in the DOM
        // For a plugin, it's safer to attach it to a known container, or let the main app handle placement.
        // For now, I'll attach it to the body for immediate visibility, but a better approach would be
        // to have a dedicated plugin container or use the existing quadrant system.
        document.body.appendChild(loadButton);
    }
};
