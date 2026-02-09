window.LoadedPlugin = {
  init: function () {
    console.log("Quantum Puzzle Game Initialized!");
    console.log("Quantum Puzzle Game Initialized!");
    const appContainer = document.body;
    if (appContainer) {
      const gameDiv = document.createElement('div');
      gameDiv.id = 'quantum-puzzle-game-container';
      gameDiv.innerHTML = `
        <style>
          #quantum-puzzle-game-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            font-family: 'Inter', sans-serif;
            text-align: center;
            z-index: 1000;
            width: 80%; /* Make it wider */
            max-width: 600px; /* Max width for larger screens */
          }
           #quantum-puzzle-game-close {
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
          }
          #quantum-puzzle-game-close:hover {
            color: white;
          }
          /* ... existing styles ... */
          #quantum-puzzle-game-container h2 {
            margin-top: 0;
            color: #00e6e6; /* Cyan */
          }
          #quantum-puzzle-game-container p {
            color: #a0a0a0;
            margin-bottom: 10px;
          }
          #quantum-puzzle-game-container button {
            background-color: #00e6e6; /* Fallback */
            color: #000;
          }
           /* ... */
        </style>
        <button id="quantum-puzzle-game-close" onclick="document.getElementById('quantum-puzzle-game-container').remove()">×</button>
        <h2>Quantum Puzzle Game</h2>
        <p>Your mission: Achieve the target quantum state using the available gates. Good luck!</p>
        <div class="circuit-display">
          <h3>Current Circuit:</h3>
          <pre id="puzzle-current-circuit">-- Initial State --</pre>
          <h3>Target State:</h3>
          <pre id="puzzle-target-state">|0⟩</pre>
          <p>This is a placeholder. Full game logic will be implemented shortly.</p>
        </div>
        <div class="gate-buttons">
          <button onclick="window.LoadedPlugin.addGate('H', 0)">H (Qubit 0)</button>
          <button onclick="window.LoadedPlugin.addGate('X', 0)">X (Qubit 0)</button>
          <button onclick="window.LoadedPlugin.addGate('CNOT', 0, 1)">CNOT (0->1)</button>
        </div>
        <button onclick="window.LoadedPlugin.resetCircuit()">Reset Circuit</button>
        <button onclick="window.LoadedPlugin.checkSolution()">Check Solution</button>
      `;
      appContainer.appendChild(gameDiv);

      let currentCircuit = [];
      const targetState = { "0": 1000, "1": 0 }; // Example target state for |0>

      window.LoadedPlugin.addGate = function (type, qubit, target = -1) {
        currentCircuit.push({ type, qubit, target });
        document.getElementById('puzzle-current-circuit').textContent = JSON.stringify(currentCircuit, null, 2);
        console.log("Circuit updated:", currentCircuit);
        window.LoadedPlugin.simulateCircuit(currentCircuit);
      };

      window.LoadedPlugin.resetCircuit = function () {
        currentCircuit = [];
        document.getElementById('puzzle-current-circuit').textContent = '-- Initial State --';
        console.log("Circuit reset.");
      };

      window.LoadedPlugin.simulateCircuit = async function (circuit) {
        // This is where you would call the agent_simulate tool
        // For now, we'll just log
        console.log("Simulating circuit:", circuit);
        // Placeholder for simulation result display
      };

      window.LoadedPlugin.checkSolution = async function () {
        console.log("Checking solution...");
        // In a real scenario, you would simulate and compare states
        const simulatedResult = await new Promise(resolve => setTimeout(() => resolve({ "0": 500, "1": 500 }), 500)); // Mock simulation
        console.log("Simulated Result:", simulatedResult);

        // Simple check (needs proper state comparison for actual game)
        if (JSON.stringify(simulatedResult) === JSON.stringify(targetState)) {
          alert("Congratulations! You solved the puzzle!");
        } else {
          alert("Not quite right. Keep trying!");
        }
      };

      // Initial display
      document.getElementById('puzzle-target-state').textContent = JSON.stringify(targetState, null, 2);
    }
  }
};