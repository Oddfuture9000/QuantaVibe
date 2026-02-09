
window.LoadedPlugin = {
    init: function () {
        console.log("Q# File Manager plugin initialized.");

        // Create container for the Q# File Manager
        const qsFileManagerContainer = document.createElement('div');
        qsFileManagerContainer.id = 'qsFileManager';
        qsFileManagerContainer.style.position = 'fixed';
        qsFileManagerContainer.style.top = '10%';
        qsFileManagerContainer.style.left = '50%';
        qsFileManagerContainer.style.transform = 'translateX(-50%)';
        qsFileManagerContainer.style.width = '80%';
        qsFileManagerContainer.style.maxWidth = '800px';
        qsFileManagerContainer.style.height = '70%';
        qsFileManagerContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; // Glassmorphism background
        qsFileManagerContainer.style.backdropFilter = 'blur(10px)'; // Glassmorphism blur
        qsFileManagerContainer.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        qsFileManagerContainer.style.borderRadius = '15px';
        qsFileManagerContainer.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
        qsFileManagerContainer.style.zIndex = '1000';
        qsFileManagerContainer.style.display = 'flex';
        qsFileManagerContainer.style.flexDirection = 'column';
        qsFileManagerContainer.style.padding = '20px';
        qsFileManagerContainer.style.color = 'white'; // Text color

        // Close Button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 15px;
            right: 20px;
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            font-size: 28px;
            cursor: pointer;
            line-height: 1;
            z-index: 1002;
            transition: color 0.2s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.color = 'white';
        closeBtn.onmouseout = () => closeBtn.style.color = 'rgba(255, 255, 255, 0.6)';
        closeBtn.onclick = () => {
            qsFileManagerContainer.remove();
        };
        qsFileManagerContainer.appendChild(closeBtn);

        // Title
        const title = document.createElement('h2');
        title.textContent = 'Q# File Manager';
        title.style.textAlign = 'center';
        title.style.marginBottom = '20px';
        qsFileManagerContainer.appendChild(title);

        // Code Editor (textarea)
        const codeEditor = document.createElement('textarea');
        codeEditor.id = 'qsCodeEditor';
        codeEditor.placeholder = 'Write your Q# code here...';
        codeEditor.style.flexGrow = '1';
        codeEditor.style.width = '100%';
        codeEditor.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        codeEditor.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        codeEditor.style.borderRadius = '8px';
        codeEditor.style.padding = '15px';
        codeEditor.style.color = 'white';
        codeEditor.style.fontFamily = 'monospace';
        codeEditor.style.fontSize = '1.1em';
        codeEditor.style.marginBottom = '15px';
        qsFileManagerContainer.appendChild(codeEditor);

        // Action Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-around';
        buttonContainer.style.width = '100%';

        const newButton = document.createElement('button');
        newButton.textContent = 'New';
        newButton.className = 'qs-manager-button'; // For potential future CSS styling
        newButton.onclick = () => codeEditor.value = ''; // Clear content
        buttonContainer.appendChild(newButton);

        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.className = 'qs-manager-button';
        saveButton.onclick = () => {
            const codeContent = codeEditor.value;
            const fileName = 'my_quantum_program.qs';
            const blob = new Blob([codeContent], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            if (window.showToast) window.showToast("Q# File Saved", "success");
        };
        buttonContainer.appendChild(saveButton);

        const loadButton = document.createElement('button');
        loadButton.textContent = 'Load';
        loadButton.className = 'qs-manager-button';
        loadButton.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.qs';
            input.onchange = (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        codeEditor.value = e.target.result;
                        if (window.showToast) window.showToast(`Loaded ${file.name}`, "success");
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        };
        buttonContainer.appendChild(loadButton);

        const runButton = document.createElement('button');
        runButton.textContent = 'Run';
        runButton.className = 'qs-manager-button';
        runButton.onclick = async () => {
            const code = codeEditor.value.trim();
            if (!code) {
                if (window.showToast) window.showToast("Please enter Q# code first", "warning");
                return;
            }

            if (window.showToast) window.showToast("Sentinel Analyzing Q# Code...", "info");
            runButton.disabled = true;
            runButton.innerHTML = "Analyzing...";

            const prompt = `
            You are a Q# Compiler for QuantaVibe.
            Analyze the following Q# code and extract the quantum circuit operations.
            Return a JSON object containing an array of gates.
            
            Format: { "gates": [{ "type": "H", "wire": 0 }, { "type": "CNOT", "wire": 0, "target": 1 }] }
            Supported Gates: H, X, Y, Z, CX (CNOT), RX, RY, RZ, M (Measurement).
            Note: "CX" in Q# is "CNOT" in QuantaVibe.
            Use 0-indexed wires.
            
            Q# Code:
            ${code}
            `;

            try {
                if (!window.geminiClient) throw new Error("Sentinel AI not initialized");

                const result = await window.geminiClient.generateJSON(prompt);
                console.log("[Q# Manager] AI Response:", result);

                if (result && result.gates && Array.isArray(result.gates)) {
                    // Normalize Gate Names
                    const normalizedGates = result.gates.map(g => {
                        let type = g.type.toUpperCase();
                        if (type === 'CX') type = 'CNOT';
                        return { ...g, type };
                    });

                    // Apply to Circuit
                    if (window.QuantaVibeAPI && window.QuantaVibeAPI.proposeMutation) {
                        const success = window.QuantaVibeAPI.proposeMutation(() => normalizedGates);
                        if (success) {
                            if (window.showToast) window.showToast("Circuit Built from Q#", "success");
                        } else {
                            throw new Error("Failed to apply circuit mutation");
                        }
                    } else {
                        throw new Error("QuantaVibe API not ready");
                    }
                } else {
                    throw new Error("Invalid response from Sentinel");
                }
            } catch (e) {
                console.error(e);
                if (window.showToast) window.showToast(`Compilation Error: ${e.message}`, "error");
            } finally {
                runButton.disabled = false;
                runButton.innerHTML = "Run";
            }
        };
        buttonContainer.appendChild(runButton);

        qsFileManagerContainer.appendChild(buttonContainer);

        document.body.appendChild(qsFileManagerContainer);

        // Add some basic CSS for the buttons for Glassmorphism feel
        const style = document.createElement('style');
        style.textContent = `
            .qs-manager-button {
                background-color: rgba(255, 255, 255, 0.15);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                padding: 10px 20px;
                color: white;
                font-size: 1em;
                cursor: pointer;
                transition: background-color 0.3s ease, transform 0.2s ease;
                backdrop-filter: blur(5px);
                margin: 0 5px;
            }
            .qs-manager-button:hover {
                background-color: rgba(255, 255, 255, 0.25);
                transform: translateY(-2px);
            }
            .qs-manager-button:active {
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
    }
};
