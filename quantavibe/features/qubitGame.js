
window.LoadedPlugin = {
    init: function () {
        console.log("Qubit Transformer Game Initialized");

        // Create a container for the game
        const gameContainer = document.createElement('div');
        gameContainer.id = 'qubitGameContainer';
        gameContainer.style.cssText = `
            position: fixed; /* Use fixed to keep it in view regardless of scroll */
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px); /* For Safari support */
            border-radius: 15px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 20px;
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
            color: #fff;
            text-align: center;
            font-family: 'Segoe UI', sans-serif;
            z-index: 1000; /* Ensure it's above other elements */
            width: 400px;
            max-width: 90vw; /* Responsive width */
            min-height: 250px;
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            align-items: center;
            opacity: 0; /* Start hidden */
            transition: opacity 0.3s ease-in-out;
        `;
        document.body.appendChild(gameContainer);

        // Show the game container after a short delay to allow transition
        setTimeout(() => {
            gameContainer.style.opacity = '1';
        }, 100);

        // Close Button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            font-size: 24px;
            cursor: pointer;
            line-height: 1;
            z-index: 1001;
        `;
        closeBtn.onmouseover = () => closeBtn.style.color = 'white';
        closeBtn.onmouseout = () => closeBtn.style.color = 'rgba(255, 255, 255, 0.6)';
        closeBtn.onclick = () => {
            gameContainer.style.opacity = '0';
            setTimeout(() => gameContainer.remove(), 300);
        };
        gameContainer.appendChild(closeBtn);

        const title = document.createElement('h2');
        title.textContent = "Qubit Transformer Game";
        title.style.marginBottom = '15px';
        gameContainer.appendChild(title);

        const problemDisplay = document.createElement('p');
        problemDisplay.id = 'problemDisplay';
        problemDisplay.textContent = "Transform |0⟩ to |1⟩"; // Initial simple problem
        problemDisplay.style.cssText = `
            font-size: 1.2em;
            margin-bottom: 20px;
            font-weight: bold;
        `;
        gameContainer.appendChild(problemDisplay);

        const feedbackDisplay = document.createElement('p');
        feedbackDisplay.id = 'feedbackDisplay';
        feedbackDisplay.style.cssText = `
            color: yellow;
            height: 20px; /* Reserve space */
            margin-bottom: 15px;
        `;
        gameContainer.appendChild(feedbackDisplay);

        const gateButtonsDiv = document.createElement('div');
        gateButtonsDiv.id = 'gateButtons';
        gateButtonsDiv.style.cssText = `
            display: flex;
            gap: 10px;
            flex-wrap: wrap; /* Allow buttons to wrap */
            justify-content: center;
        `;
        gameContainer.appendChild(gateButtonsDiv);

        const gates = ['H', 'X', 'Y', 'Z'];
        gates.forEach(gateType => {
            const button = document.createElement('button');
            button.textContent = gateType;
            button.style.cssText = `
                background: rgba(255, 255, 255, 0.2);
                border: none;
                padding: 10px 15px;
                border-radius: 8px;
                color: #fff;
                font-size: 1em;
                cursor: pointer;
                transition: background 0.3s ease, transform 0.1s ease;
                min-width: 60px; /* Ensure consistent button size */
            `;
            button.onmouseover = () => button.style.background = 'rgba(255, 255, 255, 0.3)';
            button.onmouseout = () => button.style.background = 'rgba(255, 255, 255, 0.2)';
            button.onmousedown = () => button.style.transform = 'scale(0.95)';
            button.onmouseup = () => button.style.transform = 'scale(1)';
            button.onclick = () => this.applyGate(gateType); // Use 'this' to refer to LoadedPlugin
            gateButtonsDiv.appendChild(button);
        });

        // Game state
        this.currentState = "|0⟩";
        this.targetState = "|1⟩";
        // In a more complex game, you would track qubit vectors or apply actual gate operations.
        // For this simple version, we're just checking the textual state change.

        this.updateDisplay = () => {
            problemDisplay.textContent = `Transform ${this.currentState} to ${this.targetState}`;
        };

        this.checkWin = () => {
            if (this.currentState === this.targetState) {
                feedbackDisplay.textContent = "Correct! You transformed the qubit.";
                feedbackDisplay.style.color = 'lightgreen';
                setTimeout(() => {
                    feedbackDisplay.textContent = "";
                    this.startGame(); // Start a new game after a delay
                }, 2000);
                return true;
            }
            return false;
        };

        this.startGame = () => {
            // For now, always reset to the same problem for simplicity and educational focus.
            this.currentState = "|0⟩";
            this.targetState = "|1⟩";
            feedbackDisplay.textContent = "";
            this.updateDisplay();
        };

        this.applyGate = (gateType) => {
            feedbackDisplay.textContent = ""; // Clear previous feedback

            // This is the core logic for the simple game:
            // Only 'X' gate correctly transforms '|0⟩' to '|1⟩' in this specific problem.
            if (this.currentState === "|0⟩" && this.targetState === "|1⟩") {
                if (gateType === "X") {
                    this.currentState = "|1⟩";
                    this.checkWin();
                } else {
                    feedbackDisplay.textContent = "Incorrect! Try a different gate.";
                    feedbackDisplay.style.color = 'red';
                }
            } else {
                // Future expansion: handle other initial/target states and corresponding gates.
                feedbackDisplay.textContent = "This game currently focuses on |0⟩ to |1⟩ with X gate.";
                feedbackDisplay.style.color = 'orange';
            }
        };

        // Start the first game when the plugin loads
        this.startGame();
    }
};
