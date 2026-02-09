/**
 * OracleConnector.js
 * Bridges QuantaVibe with the external Quantum World.
 * Features:
 * - Framework Export (Qiskit, Cirq)
 * - Remote Execution (Cloud Mockup)
 * - Research Access (arXiv)
 */

class OracleConnector {
    constructor() {
        this.providers = new Map();
        this.activeConnection = null;
        this.jobQueue = [];

        // Register Default Providers
        this.registerProvider('ibm', { name: 'IBM Quantum', backend: 'ibmq_qasm_simulator' });
        this.registerProvider('google', { name: 'Google Quantum AI', backend: 'weber' });
        this.registerProvider('rigetti', { name: 'Rigetti', backend: 'Aspen-M-3' });
        this.registerProvider('ionq', { name: 'IonQ', backend: 'aria-1' });

        console.log("ORACLE: Initialized");
    }

    registerProvider(id, config) {
        this.providers.set(id, config);
    }

    connect(providerId, apiKey) {
        if (this.providers.has(providerId)) {
            // Mock connection validation
            if (!apiKey) return { success: false, error: "API Key required" };

            this.activeConnection = {
                id: providerId,
                config: this.providers.get(providerId),
                key: apiKey,
                connectedAt: Date.now()
            };

            console.log(`ORACLE: Connected to ${this.activeConnection.config.name}`);
            if (window.showToast) window.showToast(`Active: ${this.activeConnection.config.name} (Simulated Mode)`, "success");
            return { success: true, provider: this.activeConnection.config.name };
        }
        return { success: false, error: "Provider not found" };
    }

    /**
     * Converts internal gate list to Qiskit (Python) code
     */
    /**
     * Converts internal gate list to Qiskit (Python) code using AI
     */
    async exportToQiskit(gates, numQubits) {
        if (!window.geminiClient) return "# Error: AI Client not initialized";

        const qasm = this.generateQASM(gates);
        const prompt = `Convert this OpenQASM 2.0 code to a high-quality, comment-annotated Qiskit (Python) script. 
        Ensure it includes visualization using 'plot_histogram' and execution on 'AerSimulator'.

        QASM:
        ${qasm}
        
        Provide ONLY the Python code.`;

        try {
            const code = await window.geminiClient.generateCode(prompt, 'python');
            return code;
        } catch (e) {
            console.error("AI Generation Failed:", e);
            return "# Error: AI Generation Failed. Falling back to simple conversion...\n" + this._legacyExportToQiskit(gates, numQubits);
        }
    }

    _legacyExportToQiskit(gates, numQubits) {
        // Fallback to original manual generation
        let code = [
            "from qiskit import QuantumCircuit, transpile",
            "from qiskit_aer import AerSimulator",
            "from qiskit.visualization import plot_histogram",
            "",
            `qc = QuantumCircuit(${numQubits}, ${numQubits})`,
            ""
        ];

        gates.forEach(g => {
            const q = g.wire;
            const t = g.target;
            const p = g.params ? g.params.join(',') : '';
            switch (g.type) {
                case 'H': code.push(`qc.h(${q})`); break;
                case 'X': code.push(`qc.x(${q})`); break;
                case 'Y': code.push(`qc.y(${q})`); break;
                case 'Z': code.push(`qc.z(${q})`); break;
                case 'S': code.push(`qc.s(${q})`); break;
                case 'T': code.push(`qc.t(${q})`); break;
                case 'CNOT':
                case 'CX': code.push(`qc.cx(${q}, ${t})`); break;
                case 'CZ': code.push(`qc.cz(${q}, ${t})`); break;
                case 'SWAP': code.push(`qc.swap(${q}, ${t})`); break;
                case 'RX': code.push(`qc.rx(${p}, ${q})`); break;
                case 'RY': code.push(`qc.ry(${p}, ${q})`); break;
                case 'RZ': code.push(`qc.rz(${p}, ${q})`); break;
                case 'MEASURE': code.push(`qc.measure(${q}, ${q})`); break;
                case 'BARRIER': code.push(`qc.barrier()`); break;
                default: code.push(`# Unsupported gate: ${g.type}`);
            }
        });

        code.push("", "# Execution", "backend = AerSimulator()", "compiled = transpile(qc, backend)", "job = backend.run(compiled, shots=1024)", "result = job.result()", "print(result.get_counts())");
        return code.join("\n");
    }

    /**
     * Converts internal gate list to Cirq (Python) code
     */
    /**
     * Converts internal gate list to Cirq (Python) code using AI
     */
    async exportToCirq(gates, numQubits) {
        if (!window.geminiClient) return "# Error: AI Client not initialized";

        const qasm = this.generateQASM(gates);
        const prompt = `Convert this OpenQASM 2.0 code to a high-quality Cirq (Python) script.
        
        QASM:
        ${qasm}
        
        Provide ONLY the Python code.`;

        try {
            const code = await window.geminiClient.generateCode(prompt, 'python');
            return code;
        } catch (e) {
            console.error("AI Generation Failed:", e);
            return "# Error: AI Generation Failed. Falling back to simple conversion...\n" + this._legacyExportToCirq(gates, numQubits);
        }
    }

    _legacyExportToCirq(gates, numQubits) {
        let code = [
            "import cirq",
            "",
            `qubits = cirq.LineQubit.range(${numQubits})`,
            "circuit = cirq.Circuit()",
            ""
        ];

        gates.forEach(g => {
            const q = `qubits[${g.wire}]`;
            const t = g.target !== undefined ? `qubits[${g.target}]` : '';
            const p = g.params ? g.params[0] : 0;
            switch (g.type) {
                case 'H': code.push(`circuit.append(cirq.H(${q}))`); break;
                case 'X': code.push(`circuit.append(cirq.X(${q}))`); break;
                case 'Y': code.push(`circuit.append(cirq.Y(${q}))`); break;
                case 'Z': code.push(`circuit.append(cirq.Z(${q}))`); break;
                case 'S': code.push(`circuit.append(cirq.S(${q}))`); break;
                case 'T': code.push(`circuit.append(cirq.T(${q}))`); break;
                case 'CNOT':
                case 'CX': code.push(`circuit.append(cirq.CNOT(${q}, ${t}))`); break;
                case 'CZ': code.push(`circuit.append(cirq.CZ(${q}, ${t}))`); break;
                case 'SWAP': code.push(`circuit.append(cirq.SWAP(${q}, ${t}))`); break;
                case 'RX': code.push(`circuit.append(cirq.rx(${p}).on(${q}))`); break;
                case 'RY': code.push(`circuit.append(cirq.ry(${p}).on(${q}))`); break;
                case 'RZ': code.push(`circuit.append(cirq.rz(${p}).on(${q}))`); break;
                case 'MEASURE': code.push(`circuit.append(cirq.measure(${q}))`); break;
                default: code.push(`# Unsupported gate: ${g.type}`);
            }
        });
        code.push("", "print(circuit)", "simulator = cirq.Simulator()", "result = simulator.run(circuit, repetitions=1024)", "print(result.histogram(key='m'))");
        return code.join("\n");
    }

    /**
     * Submits a job to the IBM Quantum API via direct REST call.
     * Note: CORS policies may restrict browser-to-cloud calls without a proxy.
     */
    async submitJob(gates) {
        if (!this.activeConnection) throw new Error("No active cloud connection.");

        // Generate QASM for the circuit
        // We assume a simple single-file QASM for this "direct" connection
        // For a full Qiskit Runtime, we'd need to upload a program, but we'll try the standard job submission if available,
        // or simplest QASM execution endpoint.

        // Since we are "deployment ready", we will attempt to hit the real endpoint.
        // Endpoint: https://api.quantum-computing.ibm.com/runtime/jobs (Generic placeholder for actual endpoint)
        // In a real browser-only scenario, Qiskit.js or similar SDK is preferred, but here we raw fetch.

        const qasm = this.generateQASM(gates);
        const url = 'https://api.quantum-computing.ibm.com/runtime/jobs';

        console.log(`ORACLE: Submitting real job to ${this.activeConnection.config.name} at ${url}...`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.activeConnection.key}`,
                    'x-quantum-backend': this.activeConnection.config.backend
                },
                body: JSON.stringify({
                    program_id: 'qasm-runner', // Hypothetical standard runner
                    params: {
                        qasm: qasm,
                        shots: 1024
                    }
                })
            });

            if (!response.ok) {
                // Return a structured error that resembles a job status so the UI can show it
                const errText = await response.text();
                // If it's a CORS error (opaque), we might not catch it here, but fetch throws.
                console.warn("ORACLE: API Request failed (Likely Auth or CORS)", response.status, errText);
                throw new Error(`Cloud Execution Failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return {
                jobId: data.id || `job_${Date.now()}`,
                status: 'QUEUED', // Assume queued if successful
                backend: this.activeConnection.config.backend,
                eta: 'Unknown'
            };

        } catch (error) {
            console.error("ORACLE: Network Error", error);
            // In strict "no mock" mode, we propagate the error.
            throw error;
        }
    }

    /**
     * Search arXiv for quantum papers using the public API
     */
    async searchArxiv(query) {
        console.log(`ORACLE: JSON Querying arXiv for "${query}"...`);
        const cleanQuery = encodeURIComponent(query);
        const url = `https://export.arxiv.org/api/query?search_query=all:${cleanQuery}&start=0&max_results=5`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("ArXiv API failed");

            const text = await response.text();

            // Parse XML (Atom format)
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");

            const entries = xmlDoc.getElementsByTagName("entry");
            const results = [];

            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const title = entry.getElementsByTagName("title")[0]?.textContent.replace(/\n/g, '').trim();
                const summary = entry.getElementsByTagName("summary")[0]?.textContent.replace(/\n/g, ' ').trim();
                const published = entry.getElementsByTagName("published")[0]?.textContent;
                const authors = Array.from(entry.getElementsByTagName("author")).map(a => a.textContent.trim()).join(", ");
                const id = entry.getElementsByTagName("id")[0]?.textContent;

                results.push({
                    title: title,
                    authors: authors,
                    year: published ? published.substring(0, 4) : "N/A",
                    id: id ? id.split('/').pop() : "Unknown",
                    summary: summary
                });
            }

            return results;

        } catch (error) {
            console.error("ORACLE: ArXiv Search Error", error);
            return [];
        }
    }

    /**
     * Simple internal QASM generator for direct API submission
     */
    generateQASM(gates) {
        // Determine number of qubits needed
        let maxWire = 0;
        gates.forEach(g => {
            if (g.wire > maxWire) maxWire = g.wire;
            if (g.target !== undefined && g.target > maxWire) maxWire = g.target;
        });
        const numQubits = maxWire + 1;

        let qasm = `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[${numQubits}];\ncreg c[${numQubits}];\n`;

        gates.forEach(g => {
            const q = g.wire;
            const t = g.target;
            const params = g.params || [0];

            switch (g.type) {
                case 'H': qasm += `h q[${q}];\n`; break;
                case 'X': qasm += `x q[${q}];\n`; break;
                case 'Y': qasm += `y q[${q}];\n`; break;
                case 'Z': qasm += `z q[${q}];\n`; break;

                // Phase Gates
                case 'S': qasm += `s q[${q}];\n`; break;
                case 'Sdg': qasm += `sdg q[${q}];\n`; break;
                case 'T': qasm += `t q[${q}];\n`; break;
                case 'Tdg': qasm += `tdg q[${q}];\n`; break;

                // Controlled Gates
                case 'CNOT':
                case 'CX': qasm += `cx q[${q}], q[${t}];\n`; break;
                case 'CZ': qasm += `cz q[${q}], q[${t}];\n`; break;

                // Swap
                case 'SWAP': qasm += `swap q[${q}], q[${t}];\n`; break;

                // Rotations
                case 'RX': qasm += `rx(${params[0]}) q[${q}];\n`; break;
                case 'RY': qasm += `ry(${params[0]}) q[${q}];\n`; break;
                case 'RZ': qasm += `rz(${params[0]}) q[${q}];\n`; break;

                // Measurement
                case 'MEASURE': qasm += `measure q[${q}] -> c[${q}];\n`; break;

                default:
                    console.warn(`Oracle: Unsupported gate for QASM export: ${g.type}`);
            }
        });

        return qasm;
    }
}

// Global Instance
window.oracle = new OracleConnector();
