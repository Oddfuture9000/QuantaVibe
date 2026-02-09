class SentinelVoice {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.init();
    }

    init() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false; // Single command mode
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = false;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateUI(true);
                this.showToast("Sentinel Listening...", "info");
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateUI(false);
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log("Sentinel Heard:", transcript);
                this.processCommand(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error("Sentinel Voice Error:", event.error);
                this.updateUI(false);
                if (event.error !== 'no-speech') {
                    this.showToast("Voice Error: " + event.error, "error");
                }
            };
        } else {
            console.warn("SentinelVoice: Web Speech API not supported.");
        }
    }

    toggle() {
        if (!this.recognition) return;
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
            } catch (e) {
                console.warn("Recognition already started");
            }
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    updateUI(listening) {
        // Look for the mic button in the Sentinel Panel or Header
        const btn = document.getElementById('sentinel-mic-btn');
        if (btn) {
            if (listening) {
                btn.classList.add('animate-pulse', 'text-red-400', 'border-red-500');
                btn.classList.remove('text-gray-400', 'border-gray-600');
            } else {
                btn.classList.remove('animate-pulse', 'text-red-400', 'border-red-500');
                btn.classList.add('text-gray-400', 'border-gray-600');
            }
        }
    }

    processCommand(text) {
        const cmd = text.toLowerCase();

        // --- Gate Commands ---
        if (cmd.includes("hadamard") || cmd.includes("h gate")) {
            if (window.addGate) window.addGate('H');
            this.speak("Applied Hadamard gate.");
        }
        else if (cmd.includes("pauli x") || cmd.includes("x gate") || cmd.includes("not gate")) {
            if (window.addGate) window.addGate('X');
            this.speak("Applied X gate.");
        }
        else if (cmd.includes("z gate") || cmd.includes("phase flip")) {
            if (window.addGate) window.addGate('Z');
            this.speak("Applied Z gate.");
        }
        else if (cmd.includes("t gate")) {
            if (window.addGate) window.addGate('T');
            this.speak("Applied T gate.");
        }
        else if (cmd.includes("cnot") || cmd.includes("controlled not")) {
            if (window.addGate) window.addGate('CNOT');
            this.speak("Applied C-NOT gate.");
        }

        // --- Execution ---
        else if (cmd.includes("run") || cmd.includes("simulate") || cmd.includes("execute")) {
            if (window.runSimulation) window.runSimulation();
            this.speak("Simulation started.");
        }
        else if (cmd.includes("clear") || cmd.includes("reset") || cmd.includes("delete all")) {
            if (window.resetCircuit) window.resetCircuit();
            this.speak("Circuit cleared.");
        }

        // --- Agent Interaction ---
        else {
            // Pass generic queries to Sentinel Architect
            const chatInput = document.getElementById('persistentChatInput');
            if (chatInput) {
                chatInput.value = text;
                // Trigger send event
                const btn = document.getElementById('persistentSendBtn');
                if (btn) {
                    this.speak("Analyzing.");
                    btn.click();
                }
            }
        }
    }

    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            // Try to find a female voice like Zira or Google US English
            const voices = window.speechSynthesis.getVoices();
            const preferred = voices.find(v => v.name.includes("Zira") || v.name.includes("Google US English"));
            if (preferred) utterance.voice = preferred;
            window.speechSynthesis.speak(utterance);
        }
    }

    showToast(msg, type) {
        if (window.showToast) window.showToast(msg, type);
    }
}

// Attach to window
window.SentinelVoice = SentinelVoice;
