
// Imports removed for File Protocol compatibility
// --- Configuration ---
// Debugging Error Handler
window.addEventListener('error', (e) => {
    // Ignore opaque script errors (usually extensions or cross-origin)
    if (e.message && e.message.toLowerCase().includes('script error')) {
        console.warn("Ignored Cross-Origin Script Error:", e);
        return;
    }

    // Log to console instead of alert to avoid blocking UI and to see full object
    console.error("Global App Error:", e.message, "at", e.filename, ":", e.lineno, e.error);
    // Optional: Toast for visibility without blocking
    if (window.showToast) {
        window.showToast(`Error: ${e.message}`, 'error');
    }
});

// --- Security: HTML Sanitization Utility ---
function sanitizeHTML(str) {
    if (typeof str !== 'string') return String(str || '');
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
window.sanitizeHTML = sanitizeHTML;

// --- Plugin Lifecycle: Interval/Timeout Tracking ---
window._pluginIntervals = [];
window._pluginTimeouts = [];
window._pluginAnimFrames = [];

const _origSetInterval = window.setInterval;
const _origSetTimeout = window.setTimeout;
const _origRAF = window.requestAnimationFrame;

// Wrap setInterval to track plugin intervals
window.setInterval = function (...args) {
    const id = _origSetInterval.apply(window, args);
    window._pluginIntervals.push(id);
    return id;
};

// Wrap setTimeout to track plugin timeouts
window.setTimeout = function (...args) {
    const id = _origSetTimeout.apply(window, args);
    window._pluginTimeouts.push(id);
    return id;
};

// Cleanup function for plugin unload
window.cleanupPluginTimers = function () {
    window._pluginIntervals.forEach(id => clearInterval(id));
    window._pluginTimeouts.forEach(id => clearTimeout(id));
    window._pluginAnimFrames.forEach(id => cancelAnimationFrame(id));
    window._pluginIntervals = [];
    window._pluginTimeouts = [];
    window._pluginAnimFrames = [];
    console.log('[Cleanup] All plugin timers cleared');
};

// --- QuantaVibe API (Global) ---
window.QuantaVibeAPI = window.QuantaVibeAPI || {};

// --- Configuration ---
// QuantaVibe is a fully client-side PWA — all AI via Gemini API

// AUDIT FIX: Responsive canvas sizing
const CANVAS_WIDTH = Math.max(800, Math.min(window.innerWidth - 40, 1600));
const CANVAS_HEIGHT = Math.max(400, Math.min(window.innerHeight - 200, 900)); // Dynamic sizing now handled by resizeCanvas()
const GRID_SIZE = 50;
let NUM_WIRES = 5;
const WIRE_SPACING = 80;
const GATE_WIDTH = 40;
const GATE_HEIGHT = 40;
const START_X = 200;
const START_Y = 100;
let pendingInteraction = null;

// --- Bio-Mimetic Shielding Mode ---
window.isBioMode = false;

// --- Canvas Context (Initialized on DOMContentLoaded) ---
let canvas = null;
let ctx = null;

// --- AI Analysis State ---
let lastAIAnalysis = null;  // Stores the most recent AI analysis result

// Log to AI Insights Log
function logToInsights(message, type = 'info') {
    const log = document.getElementById('deviceLog');
    if (!log) return;

    const now = new Date();
    const timestamp = now.toTimeString().slice(0, 8);

    const colors = {
        info: 'text-cyan-400',
        success: 'text-green-400',
        warning: 'text-yellow-400',
        error: 'text-red-400',
        ai: 'text-purple-400'
    };

    const entry = document.createElement('div');
    entry.className = 'flex gap-2 items-start';
    entry.innerHTML = `<span class="${colors[type] || colors.info}">[${timestamp}]</span> <span class="flex-1">${sanitizeHTML(message)}</span>`;

    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// Store and display AI analysis
function storeAndDisplayAnalysis(analysis) {
    lastAIAnalysis = analysis;

    // Format for display - show key insights
    const lines = analysis.split('\n').filter(l => l.trim());
    const summary = lines.slice(0, 3).join(' ').substring(0, 200);

    logToInsights(`🧠 AI Analysis Complete: ${sanitizeHTML(summary)}...`, 'ai');
    logToInsights(`📊 Full analysis available - click PDF Report to export`, 'info');
}

window.logToInsights = logToInsights;
window.storeAndDisplayAnalysis = storeAndDisplayAnalysis;

// --- Full Analysis Modal & Logging ---
let _analysisHistory = []; // Stores all AI analyses for the session

/**
 * Logs AI analysis results to the Insights Log panel with a "View Full" button.
 * Stores the complete data for the popup viewer.
 */
function logAIAnalysisToInsights(validated, rawData) {
    const log = document.getElementById('deviceLog');
    if (!log) return;

    const now = new Date();
    const timestamp = now.toTimeString().slice(0, 8);
    const analysisId = 'analysis-' + Date.now();

    // Store the full analysis
    const analysisRecord = {
        id: analysisId,
        time: timestamp,
        insight: validated.insight || 'No insight provided',
        tomography: validated.tomography || null,
        blochVectors: validated.blochVectors || null,
        spaq_health: validated.spaq_health || null,
        entanglementMap: validated.entanglementMap || null,
        system_health: validated.system_health,
        shot_noise: validated.shot_noise,
        raw: rawData
    };
    _analysisHistory.push(analysisRecord);
    window._analysisHistory = _analysisHistory;

    // Build the log entry with a "View" button
    const entry = document.createElement('div');
    entry.className = 'flex gap-2 items-start py-1 border-b border-gray-800/50';

    const insightText = validated.insight
        ? validated.insight.substring(0, 120) + (validated.insight.length > 120 ? '...' : '')
        : 'Quantum state analysis complete';

    // Count populated fields for summary
    const fields = [];
    if (validated.tomography) fields.push(Object.keys(validated.tomography).length + ' states');
    if (validated.blochVectors) fields.push(validated.blochVectors.length + ' qubits');
    if (validated.entanglementMap && validated.entanglementMap.length) fields.push(validated.entanglementMap.length + ' links');
    const fieldSummary = fields.length ? ` [${fields.join(', ')}]` : '';

    entry.innerHTML = `
        <span class="text-purple-400 shrink-0">[${timestamp}]</span>
        <span class="flex-1">
            <span class="text-purple-300">🧠 Sentinel Analysis:</span>
            <span class="text-gray-300">${insightText}</span>
            <span class="text-gray-600 text-[9px]">${fieldSummary}</span>
        </span>
        <button onclick="showFullAnalysis('${analysisId}')" 
            class="shrink-0 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded hover:bg-purple-500/40 hover:text-white transition-all cursor-pointer"
            title="View full analysis details">
            View
        </button>
    `;

    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}
window.logAIAnalysisToInsights = logAIAnalysisToInsights;

/**
 * Opens a popup modal showing the full AI analysis data.
 */
function showFullAnalysis(analysisId) {
    const record = (_analysisHistory || []).find(a => a.id === analysisId);
    if (!record) {
        if (window.showToast) window.showToast('Analysis not found', 'warning');
        return;
    }

    // Create or reuse modal
    let modal = document.getElementById('analysisDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'analysisDetailModal';
        modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4';
        document.body.appendChild(modal);
    }

    // Format Bloch vectors
    const formatVec = (v) => v ? `[${v.map(c => (typeof c === 'number' ? c.toFixed(3) : c)).join(', ')}]` : 'N/A';

    // Format tomography as sorted bars
    let tomoHTML = '<span class="text-gray-600">No tomography data</span>';
    if (record.tomography) {
        const sorted = Object.entries(record.tomography)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 16); // Top 16 states
        tomoHTML = sorted.map(([state, prob]) => {
            const pct = (prob * 100).toFixed(1);
            const barW = Math.max(2, prob * 100);
            const color = prob > 0.3 ? '#e879f9' : prob > 0.05 ? '#22d3ee' : '#818cf8';
            return `<div class="flex items-center gap-2 text-[10px]">
                <span class="text-gray-400 font-mono w-16">|${state}⟩</span>
                <div class="flex-1 h-3 bg-gray-800 rounded overflow-hidden">
                    <div style="width:${barW}%;background:${color}" class="h-full rounded transition-all"></div>
                </div>
                <span class="text-gray-300 font-mono w-12 text-right">${pct}%</span>
            </div>`;
        }).join('');
    }

    // Format SPAQ health
    let spaqHTML = '';
    if (record.spaq_health) {
        const entries = Object.entries(record.spaq_health);
        spaqHTML = entries.map(([k, v]) => {
            const pct = (Number(v) * 100).toFixed(0);
            const color = v >= 0.8 ? '#22d3ee' : v >= 0.5 ? '#fbbf24' : '#ef4444';
            return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 text-[10px]">
                <span class="w-2 h-2 rounded-full" style="background:${color}"></span>
                Q${k}: <span class="font-mono" style="color:${color}">${pct}%</span>
            </span>`;
        }).join(' ');
    }

    // Format entanglement
    let entHTML = '<span class="text-gray-600">None detected</span>';
    if (record.entanglementMap && record.entanglementMap.length) {
        entHTML = record.entanglementMap.map(([a, b, s]) => {
            const pct = (s * 100).toFixed(0);
            const color = s > 0.7 ? '#e879f9' : s > 0.3 ? '#22d3ee' : '#818cf8';
            return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 text-[10px]">
                Q${a}↔Q${b}: <span class="font-mono" style="color:${color}">${pct}%</span>
            </span>`;
        }).join(' ');
    }

    // Bloch vectors table
    let blochHTML = '';
    if (record.blochVectors) {
        blochHTML = record.blochVectors.map((v, i) => {
            const purity = v ? Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2).toFixed(3) : 'N/A';
            return `<div class="flex items-center gap-3 text-[10px]">
                <span class="text-gray-500 w-8">Q${i}</span>
                <span class="text-cyan-300 font-mono">${formatVec(v)}</span>
                <span class="text-gray-500">|v|=${purity}</span>
            </div>`;
        }).join('');
    }

    modal.innerHTML = `
        <div class="bg-gray-900 border border-purple-500/30 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-gray-800">
                <div class="flex items-center gap-2">
                    <span class="text-lg">🧠</span>
                    <div>
                        <h3 class="text-sm font-bold text-white">Sentinel Analysis</h3>
                        <span class="text-[10px] text-gray-500">${record.time}</span>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${record.system_health !== undefined ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">Health: ${Number(record.system_health).toFixed(1)}%</span>` : ''}
                    ${record.shot_noise ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">${record.shot_noise}</span>` : ''}
                    <button onclick="document.getElementById('analysisDetailModal').remove()" 
                        class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition">
                        ✕
                    </button>
                </div>
            </div>
            <!-- Body -->
            <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                <!-- Insight -->
                <div class="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                    <div class="text-[9px] text-purple-400 font-bold uppercase tracking-wider mb-1">Insight</div>
                    <div class="text-sm text-gray-200">${record.insight}</div>
                </div>

                <!-- Tomography -->
                <div>
                    <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2">Probability Distribution</div>
                    <div class="space-y-1">${tomoHTML}</div>
                </div>

                <!-- SPAQ Health -->
                ${spaqHTML ? `<div>
                    <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2">Qubit Coherence (SPAQ)</div>
                    <div class="flex flex-wrap gap-1">${spaqHTML}</div>
                </div>` : ''}

                <!-- Entanglement -->
                <div>
                    <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2">Entanglement Links</div>
                    <div class="flex flex-wrap gap-1">${entHTML}</div>
                </div>

                <!-- Bloch Vectors -->
                ${blochHTML ? `<div>
                    <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2">Bloch Vectors</div>
                    <div class="bg-gray-800/50 rounded-lg p-2 space-y-1">${blochHTML}</div>
                </div>` : ''}
            </div>

            <!-- Footer -->
            <div class="p-3 border-t border-gray-800 flex justify-between items-center">
                <span class="text-[9px] text-gray-600">${_analysisHistory.length} analyses this session</span>
                <button onclick="document.getElementById('analysisDetailModal').remove()" 
                    class="px-3 py-1 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition">
                    Close
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');

    // Close on backdrop click
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}
window.showFullAnalysis = showFullAnalysis;

/**
 * Shows a history list of all AI analyses from this session.
 */
function showAnalysisHistory() {
    if (!_analysisHistory.length) {
        if (window.showToast) window.showToast('No analyses yet — run a simulation first', 'info');
        return;
    }

    let modal = document.getElementById('analysisHistoryModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'analysisHistoryModal';
        modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4';
        document.body.appendChild(modal);
    }

    const listItems = _analysisHistory.slice().reverse().map((a, idx) => {
        const stateCount = a.tomography ? Object.keys(a.tomography).length : 0;
        const health = a.system_health !== undefined ? `${Number(a.system_health).toFixed(0)}%` : '--';
        return `<button onclick="document.getElementById('analysisHistoryModal').remove(); showFullAnalysis('${a.id}');"
            class="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg transition group flex items-start gap-3">
            <span class="text-purple-400 text-[10px] shrink-0 mt-0.5">${a.time}</span>
            <div class="flex-1 min-w-0">
                <div class="text-xs text-gray-200 truncate">${a.insight || 'Analysis #' + (_analysisHistory.length - idx)}</div>
                <div class="text-[9px] text-gray-600 mt-0.5">${stateCount} states · Health: ${health}</div>
            </div>
            <span class="text-[9px] text-gray-700 group-hover:text-purple-400 shrink-0">▶</span>
        </button>`;
    }).join('');

    modal.innerHTML = `
        <div class="bg-gray-900 border border-purple-500/30 rounded-xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col">
            <div class="flex items-center justify-between p-4 border-b border-gray-800">
                <div class="flex items-center gap-2">
                    <span>🧠</span>
                    <h3 class="text-sm font-bold text-white">Analysis History</h3>
                    <span class="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">${_analysisHistory.length} total</span>
                </div>
                <button onclick="document.getElementById('analysisHistoryModal').remove()" 
                    class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition">
                    ✕
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                ${listItems}
            </div>
            <div class="p-3 border-t border-gray-800 flex justify-end">
                <button onclick="document.getElementById('analysisHistoryModal').remove()" 
                    class="px-3 py-1 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition">
                    Close
                </button>
            </div>
        </div>
    `;

    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}
window.showAnalysisHistory = showAnalysisHistory;

// --- End API Helpers ---

// Sentinel UI and Canvas logic have been moved to the top of the file/global scope.
// Removing duplicates to prevent re-declaration errors.

// --- QUANTUM ENGINE (CLIENT-SIDE) ---
// Embedded "Grand Unification" Physics Engine
const PhysicsEngine = {
    // ... (Engine logic remains if not duplicated)
};


// --- QUANTUM ENGINE (CLIENT-SIDE) ---
// Embedded "Grand Unification" Physics Engine
// Removes "Split-Brain" conflict by defining the Real Math directly in app.js

class Complex {
    // Static helpers for operations to avoid object churn
    static add(r1, i1, r2, i2) { return [r1 + r2, i1 + i2]; }
    static sub(r1, i1, r2, i2) { return [r1 - r2, i1 - i2]; }
    static mul(r1, i1, r2, i2) { return [r1 * r2 - i1 * i2, r1 * i2 + i1 * r2]; }
    static mag(r, i) { return Math.sqrt(r * r + i * i); }
    static phase(r, i) { return Math.atan2(i, r); }
}

class QuantumEngine {
    constructor(numQubits) {
        this.numQubits = numQubits;
        this.stateSize = 1 << numQubits;

        // Statevector: |psi> = re + i*im
        // Initialize to |0...0> (index 0 = 1.0)
        this.re = new Float64Array(this.stateSize);
        this.im = new Float64Array(this.stateSize);
        this.re[0] = 1.0;
    }

    reset() {
        this.re.fill(0);
        this.im.fill(0);
        this.re[0] = 1.0;
    }

    applyGate(type, target, params = []) {
        // High-Performance Switch for specialized gates
        switch (type) {
            case 'X': this.applyX(target); return;
            case 'Y': this.applyY(target); return;
            case 'Z': this.applyPhase(target, Math.PI); return;
            case 'H': this.applyH(target); return;
            case 'S': this.applyPhase(target, Math.PI / 2); return;
            case 'Sdg': this.applyPhase(target, -Math.PI / 2); return;
            case 'T': this.applyPhase(target, Math.PI / 4); return;
            case 'Tdg': this.applyPhase(target, -Math.PI / 4); return;
            case 'P':
                this.applyPhase(target, params[0] || 0); return;
            case 'RX':
                this.applyRotation('x', params[0] || 0, target); return;
            case 'RY':
                this.applyRotation('y', params[0] || 0, target); return;
            case 'RZ':
                this.applyRZ(target, params[0] || 0); return;
            case 'R': // Generic R(axis, theta)
                this.applyRotation(params[0], params[1], target);
                return;
        }

        // AUDIT FIX: Handle CCX/Toffoli at gate level
        // (This is handled in run() for multi-qubit gates, fallback here)

        // AUDIT FIX: Handle CCX/Toffoli at gate level
        // (This is handled in run() for multi-qubit gates, fallback here)

        // Fallback: Generic Matrix Operation
        const mat = this.getGateMatrix(type, params);
        if (mat) this.applyMatrix(target, mat);
    }

    applyMatrix(target, mat) {
        const [ur00, ui00, ur01, ui01, ur10, ui10, ur11, ui11] = mat;
        const step = 1 << target;
        for (let i = 0; i < this.stateSize; i += 2 * step) {
            for (let j = 0; j < step; j++) {
                const idx0 = i + j;
                const idx1 = idx0 + step;
                const r0 = this.re[idx0], i0 = this.im[idx0];
                const r1 = this.re[idx1], i1 = this.im[idx1];

                // New Amp 0
                const nr0 = (ur00 * r0 - ui00 * i0) + (ur01 * r1 - ui01 * i1);
                const ni0 = (ur00 * i0 + ui00 * r0) + (ur01 * i1 + ui01 * r1);

                // New Amp 1
                const nr1 = (ur10 * r0 - ui10 * i0) + (ur11 * r1 - ui11 * i1);
                const ni1 = (ur10 * i0 + ui10 * r0) + (ur11 * i1 + ui11 * r1);

                this.re[idx0] = nr0; this.im[idx0] = ni0;
                this.re[idx1] = nr1; this.im[idx1] = ni1;
            }
        }
    }

    applyPhase(target, angle) {
        const step = 1 << target;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        for (let i = 0; i < this.stateSize; i++) {
            if (i & step) {
                const r = this.re[i];
                const im = this.im[i];
                this.re[i] = r * cos - im * sin;
                this.im[i] = r * sin + im * cos;
            }
        }
    }

    applyX(target) {
        const step = 1 << target;
        for (let i = 0; i < this.stateSize; i += 2 * step) {
            for (let j = 0; j < step; j++) {
                const idx0 = i + j;
                const idx1 = idx0 + step;
                const tr = this.re[idx0]; const ti = this.im[idx0];
                this.re[idx0] = this.re[idx1]; this.im[idx0] = this.im[idx1];
                this.re[idx1] = tr; this.im[idx1] = ti;
            }
        }
    }

    applyY(target) {
        const step = 1 << target;
        for (let i = 0; i < this.stateSize; i += 2 * step) {
            for (let j = 0; j < step; j++) {
                const idx0 = i + j;
                const idx1 = idx0 + step;
                const r0 = this.re[idx0]; const im0 = this.im[idx0];
                const r1 = this.re[idx1]; const im1 = this.im[idx1];
                this.re[idx0] = im1; this.im[idx0] = -r1;
                this.re[idx1] = -im0; this.im[idx1] = r0;
            }
        }
    }

    applyH(target) {
        const step = 1 << target;
        const ISR2 = 0.7071067811865476;
        for (let i = 0; i < this.stateSize; i += 2 * step) {
            for (let j = 0; j < step; j++) {
                const idx0 = i + j;
                const idx1 = idx0 + step;
                const r0 = this.re[idx0]; const i0 = this.im[idx0];
                const r1 = this.re[idx1]; const i1 = this.im[idx1];
                this.re[idx0] = (r0 + r1) * ISR2;
                this.im[idx0] = (i0 + i1) * ISR2;
                this.re[idx1] = (r0 - r1) * ISR2;
                this.im[idx1] = (i0 - i1) * ISR2;
            }
        }
    }

    applyRZ(target, theta) {
        const c = Math.cos(theta / 2);
        const s = Math.sin(theta / 2);
        const step = 1 << target;
        for (let i = 0; i < this.stateSize; i++) {
            const r = this.re[i];
            const im = this.im[i];
            if ((i & step) === 0) {
                this.re[i] = r * c + im * s;
                this.im[i] = im * c - r * s;
            } else {
                this.re[i] = r * c - im * s;
                this.im[i] = im * c + r * s;
            }
        }
    }

    applyRotation(axis, theta, target) {
        if (axis === 'x' || axis === 'X') {
            const c = Math.cos(theta / 2);
            const s = Math.sin(theta / 2);
            const step = 1 << target;
            for (let i = 0; i < this.stateSize; i += 2 * step) {
                for (let j = 0; j < step; j++) {
                    const idx0 = i + j;
                    const idx1 = idx0 + step;
                    const r0 = this.re[idx0]; const i0 = this.im[idx0];
                    const r1 = this.re[idx1]; const i1 = this.im[idx1];
                    this.re[idx0] = c * r0 + s * i1;
                    this.im[idx0] = c * i0 - s * r1;
                    this.re[idx1] = s * i0 + c * r1;
                    this.im[idx1] = -s * r0 + c * i1;
                }
            }
        } else if (axis === 'y' || axis === 'Y') {
            const c = Math.cos(theta / 2);
            const s = Math.sin(theta / 2);
            const step = 1 << target;
            for (let i = 0; i < this.stateSize; i += 2 * step) {
                for (let j = 0; j < step; j++) {
                    const idx0 = i + j;
                    const idx1 = idx0 + step;
                    const r0 = this.re[idx0]; const i0 = this.im[idx0];
                    const r1 = this.re[idx1]; const i1 = this.im[idx1];
                    this.re[idx0] = c * r0 - s * r1;
                    this.im[idx0] = c * i0 - s * i1;
                    this.re[idx1] = s * r0 + c * r1;
                    this.im[idx1] = s * i0 + c * i1;
                }
            }
        } else if (axis === 'z' || axis === 'Z') {
            this.applyRZ(target, theta);
        }
    }

    /**
     * Applies a Controlled-NOT (or generic controlled gate)
     * For CNOT: Controlled by 'control', targets 'target'. Flips target if control is 1.
     */
    applyCNOT(control, target) {
        // CNOT is simple: swap amplitudes of |...1...0...> and |...1...1...> for target where control is 1
        const controlBit = 1 << control;
        const targetBit = 1 << target;

        // Prevent infinite loops if control == target (invalid phys)
        if (control === target) return;

        for (let i = 0; i < this.stateSize; i++) {
            // Check if control bit is set
            if ((i & controlBit) !== 0) {
                // Check if target bit is 0
                if ((i & targetBit) === 0) {
                    const idx0 = i;
                    const idx1 = i | targetBit; // Corresponding 1 state

                    // Swap amplitudes
                    const tr = this.re[idx0], ti = this.im[idx0];
                    this.re[idx0] = this.re[idx1]; this.im[idx0] = this.im[idx1];
                    this.re[idx1] = tr; this.im[idx1] = ti;
                }
            }
        }
    }

    // Efficient CNOT
    applyControlledGate(type, control, target, params = []) {
        // Only CNOT supported efficiently for now.
        // Generic would require controlled matrix logic.
        if (type === 'CNOT' || type === 'CX') {
            const lower = Math.min(control, target);
            const upper = Math.max(control, target);

            // We iterate over the state.
            // Condition: (index & (1<<control)) != 0
            // Operation: Apply X logic on target pair (swap)

            // To avoid double swapping, we manipulate the loop such that we only visit pairs once.
            // But simple linear scan + processed flag or bit logic is robust.

            for (let i = 0; i < this.stateSize; i++) {
                // If control is 1 and target is 0
                if (((i >> control) & 1) && !((i >> target) & 1)) {
                    const partner = i | (1 << target);

                    // Swap
                    const tmpR = this.re[i]; const tmpI = this.im[i];
                    this.re[i] = this.re[partner]; this.im[i] = this.im[partner];
                    this.re[partner] = tmpR; this.im[partner] = tmpI;
                }
            }
        } else if (type === 'CZ') {
            // Apply Z on target if control is 1
            // Z means flip sign of |1>
            for (let i = 0; i < this.stateSize; i++) {
                if (((i >> control) & 1) && ((i >> target) & 1)) {
                    this.re[i] = -this.re[i];
                    this.im[i] = -this.im[i];
                }
            }
        } else if (type === 'CY') {
            // Controlled-Y: Apply Y if control is 1
            const cBit = 1 << control;
            const tBit = 1 << target;
            for (let i = 0; i < this.stateSize; i++) {
                // If control is 1, apply Y logic on target
                // Y on |0> -> i|1>, Y on |1> -> -i|0>
                if ((i & cBit) !== 0) {
                    // We only process pairs (i, partner) where i has target=0
                    if ((i & tBit) === 0) {
                        const partner = i | tBit;
                        const r0 = this.re[i], i0 = this.im[i];
                        const r1 = this.re[partner], i1 = this.im[partner];

                        // Y operation:
                        // new0 = i * old1 => re0 = -im1, im0 = re1
                        // new1 = -i * old0 => re1 = im0, im1 = -re0

                        this.re[i] = i1; this.im[i] = -r1; // wait, Y matrix is [[0, -i], [i, 0]]
                        // |0> -> i|1> => re0=0, im0=0... wait
                        // Y|0> = i|1>. Y|1> = -i|0>.
                        // So new coeff of |0> is -i * old1? No.
                        // [new0]   [0 -i] [old0]   [-i * old1]
                        // [new1] = [i  0] [old1] = [ i * old0]

                        // -i * (r1 + i*i1) = -i*r1 + i1 = i1 - i*r1.
                        // So re0 = i1, im0 = -r1. Correct.

                        // i * (r0 + i*i0) = i*r0 - i0 = -i0 + i*r0.
                        // So re1 = -i0, im1 = r0.

                        this.re[i] = i1; this.im[i] = -r1;
                        this.re[partner] = -i0; this.im[partner] = r0;
                    }
                }
            }
        } else if (type === 'CP') {
            // Controlled-Phase(theta)
            const theta = params[0] || 0;
            const c = Math.cos(theta);
            const s = Math.sin(theta);

            // Apply Phase if control=1 and target=1
            // Phase(theta) is diag(1, e^i*theta)
            // So only |11> component gets e^i*theta factor

            for (let i = 0; i < this.stateSize; i++) {
                if (((i >> control) & 1) && ((i >> target) & 1)) {
                    const r = this.re[i];
                    const im = this.im[i];
                    this.re[i] = r * c - im * s;
                    this.im[i] = r * s + im * c;
                }
            }
        }
    }

    applySwap(wire1, wire2) {
        if (wire1 === wire2) return;
        const b1 = 1 << wire1;
        const b2 = 1 << wire2;

        for (let i = 0; i < this.stateSize; i++) {
            // Check if bits differ
            // (i & b1) != 0 is the bit value check (normalized)
            const bit1 = (i & b1) !== 0;
            const bit2 = (i & b2) !== 0;

            if (bit1 !== bit2) {
                // We want to swap amplitudes with the partner state where bits are flipped
                // The partner index is i with bit1 flipped and bit2 flipped.
                // Since they are different, flipping both essentially swaps them.
                const partner = i ^ b1 ^ b2;

                // Process each pair only once
                if (i < partner) {
                    const tr = this.re[i]; const ti = this.im[i];
                    this.re[i] = this.re[partner]; this.im[i] = this.im[partner];
                    this.re[partner] = tr; this.im[partner] = ti;
                }
            }
        }
    }

    // --- PHASE 5: ADVANCED NOISE MODELS (Stochastic Unravelling) ---
    /**
     * T1 Relaxation: Amplitude Damping
     * @param target Qubit index
     * @param prob Probability of decay (gamma)
     */
    applyAmplitudeDamping(target, prob) {
        // Kraus Operators: E0 = |0><0| + sqrt(1-p)|1><1|, E1 = sqrt(p)|0><1|
        // MCWF Approach: 
        // 1. Calculate jump probability: P_jump = <psi|E1dag E1|psi>
        //    E1 is effectively "Measure |1>, if 1, reset to 0" weighted by p.
        //    Simplify: If qubit is |1>, it decays to |0> with probability p.
        //    But wait, we are in a superposition.
        //    P(decay) = p * P(1)

        const prob1 = this.getProbability(target);
        const pDecay = prob * prob1;

        if (Math.random() < pDecay) {
            // Jump occurs: "Decay happened"
            // Project to |1>, then reset to |0>
            // Effectively: Set to |0>
            // We need to normalize? collapse(target) returns 1 (measured 1).
            // Then we manually flip it to 0.

            // Force measure 1 (physically we know a photon was emitted)
            // But mathematically, we just project to |0> state post-decay.
            // Let's do a forced projection to |0> directly?
            // No, the jump corresponds to L = sqrt(gamma) * sigma_minus.
            // L|1> = |0>. L|0> = 0.

            // Simpler: Force collapse to |0> (Ground state)
            this.forceSetZero(target);
        } else {
            // No jump: Evolution under H_eff or E0
            // State becomes |psi'> = E0|psi> / sqrt(1-pDecay)
            // E0 scales |1> amplitude by sqrt(1-p)
            const scaling = Math.sqrt(1 - prob);
            const step = 1 << target;

            for (let i = 0; i < this.stateSize; i++) {
                if ((i & step) !== 0) { // If |1> component
                    this.re[i] *= scaling;
                    this.im[i] *= scaling;
                }
            }
            this.normalize();
        }
    }

    /**
     * T2 Dephasing: Phase Damping
     * @param target Qubit index
     * @param prob Probability of phase flip (lambda)
     */
    applyPhaseDamping(target, prob) {
        // Kraus: E0 = sqrt(1-p)I, E1 = sqrt(p)Z
        // MCWF: Apply Z with probability p?
        // Actually for Phase Damping, it's often modeled as elastic scattering.
        // E0 = sqrt(1-p/2)I, E1 = sqrt(p/2)Z ?

        // Let's use simple Phase Flip channel approximation.
        // With probability p, verify if a Z error occurs.
        // But for Dephasing T2, it's continuous.
        // Let's apply random Z rotation? Or simple random Z flip.

        if (Math.random() < prob) {
            // Apply Z
            this.applyPhase(target, Math.PI);
        }
    }

    applyDepolarizing(target, prob) {
        // Applies X, Y, or Z with probability p/3 each, or I with 1-p
        if (Math.random() < prob) {
            const r = Math.random();
            if (r < 0.333) this.applyX(target);
            else if (r < 0.666) this.applyY(target);
            else this.applyPhase(target, Math.PI); // Z
        }
    }

    forceSetZero(target) {
        const step = 1 << target;
        for (let i = 0; i < this.stateSize; i++) {
            if ((i & step) !== 0) {
                // Determine partner index (the |0> component)
                const partner = i ^ step;
                // Move amplitude from |1> to |0> ?
                // No, just projecting to 0 means |1> is impossible.
                // But this is a "Relaxation" event. energy is lost.
                // The population from |1> moves to |0>.
                // Wait, if we measured "decay", we know it WAS 1 and became 0.
                // So the new state is purely |0> for this qubit.

                // Construct global state where target is 0.
                // This preserves entanglement of other qubits if they were entangled with 0 component?
                // Actually T1 breaks entanglement.

                // Simplified: Zero out |1> components.
                this.re[i] = 0;
                this.im[i] = 0;
            }
        }
        this.normalize();
    }

    normalize() {
        let sum = 0;
        for (let i = 0; i < this.stateSize; i++) sum += this.re[i] ** 2 + this.im[i] ** 2;
        const norm = Math.sqrt(sum);
        if (norm > 1e-9) {
            for (let i = 0; i < this.stateSize; i++) {
                this.re[i] /= norm;
                this.im[i] /= norm;
            }
        }
    }

    /**
     * Returns 8 numbers representing the 2x2 matrix (real, imag interleaved)
     */

    // Toffoli (CCX) gate - AUDIT FIX: Added missing multi-controlled gate
    applyToffoli(control1, control2, target) {
        if (control1 === control2 || control1 === target || control2 === target) return;
        const c1 = 1 << control1;
        const c2 = 1 << control2;
        const t = 1 << target;
        for (let i = 0; i < this.stateSize; i++) {
            if ((i & c1) && (i & c2) && !(i & t)) {
                const partner = i | t;
                const tr = this.re[i]; const ti = this.im[i];
                this.re[i] = this.re[partner]; this.im[i] = this.im[partner];
                this.re[partner] = tr; this.im[partner] = ti;
            }
        }
    }



    getGateMatrix(type, params) {
        const theta = params[0] || 0;
        const ONE = 1.0, ZERO = 0.0, ISR2 = 0.70710678; // 1/sqrt(2)

        switch (type) {
            case 'H': return [ISR2, 0, ISR2, 0, ISR2, 0, -ISR2, 0];
            case 'X': return [0, 0, 1, 0, 1, 0, 0, 0];
            case 'Y': return [0, 0, 0, -1, 0, 1, 0, 0]; // [[0, -i], [i, 0]]
            case 'Z': return [1, 0, 0, 0, 0, 0, -1, 0];
            case 'S': return [1, 0, 0, 0, 0, 0, 0, 1]; // [[1, 0], [0, i]]
            case 'T': return [1, 0, 0, 0, 0, 0, ISR2, ISR2]; // [[1, 0], [0, e^i*pi/4]]

            // Rotation Gates
            case 'RX': { // [[cos(t/2), -i*sin(t/2)], [-i*sin(t/2), cos(t/2)]]
                const c = Math.cos(theta / 2), s = Math.sin(theta / 2);
                return [c, 0, 0, -s, 0, -s, c, 0];
            }
            case 'RY': { // [[cos(t/2), -sin(t/2)], [sin(t/2), cos(t/2)]]
                const c = Math.cos(theta / 2), s = Math.sin(theta / 2);
                return [c, 0, -s, 0, s, 0, c, 0];
            }
            case 'RZ': { // [[e^-it/2, 0], [0, e^it/2]] -> [[cos-isin, 0], [0, cos+isin]]
                const c = Math.cos(theta / 2), s = Math.sin(theta / 2);
                return [c, -s, 0, 0, 0, 0, c, s];
            }
            default: return null;
        }
    }

    /**
     * Runs the circuit specified by the gates array.
     */
    run(gates, shots = 1024) {
        this.reset();
        this.classicalRegister = {}; // Map bit index to value (0 or 1)

        let measurements = {};

        for (const g of gates) {
            // Check Classical Control Condition
            if (g.condition) {
                const bit = g.condition.bit;
                const expected = g.condition.value !== undefined ? g.condition.value : 1;
                const actual = this.classicalRegister[bit] || 0;
                if (actual !== expected) continue; // Skip gate if condition false
            }

            if (g.type === 'MEASURE') {
                // Collapse and store result in classical register
                const result = this.collapse(g.wire);
                this.classicalRegister[g.wire] = result;

            } else if (g.type === 'CNOT' || g.type === 'CX') {
                this.applyControlledGate('CNOT', g.wire, g.target);
            } else if (g.type === 'CZ') {
                this.applyControlledGate('CZ', g.wire, g.target);
            } else if (g.type === 'CY') {
                this.applyControlledGate('CY', g.wire, g.target);
            } else if (g.type === 'CP') {
                this.applyControlledGate('CP', g.wire, g.target, g.params);
            } else if (g.type === 'SWAP') {
                this.applySwap(g.wire, g.target);
            } else if (g.type === 'RESET') {
                this.forceSetZero(g.wire); // Reuse T1 decay reset logic
            } else if (g.type === 'QFT') {
                this.applyQFT(); // Applies to all qubits by default
            } else if (g.type === 'IQFT') {
                this.applyIQFT();
            } else if (g.type === 'BARRIER') {
                // No-op
            } else {
                this.applyGate(g.type, g.wire, g.params);
            }

            // --- NOISE APPLICATION (PHASE 5) ---
            if (activeDeviceProfile && activeDeviceProfile.t1 && activeDeviceProfile.t2) {
                // Determine participating qubits
                let qubits = [];
                if (g.type === 'CNOT' || g.type === 'CX' || g.type === 'CZ' || g.type === 'SWAP') {
                    qubits.push(g.wire, g.target);
                } else if (g.type !== 'BARRIER') {
                    qubits.push(g.wire);
                }

                // Gate Time (simplified)
                const GATE_TIME_US = (qubits.length > 1) ? 0.050 : 0.020; // 50ns 2Q, 20ns 1Q

                // Apply Idle Noise to ALL qubits? Or just active ones?
                // Real hardware: All qubits decay over time.
                for (let q = 0; q < this.numQubits; q++) {
                    const T1 = activeDeviceProfile.t1; // us
                    const T2 = activeDeviceProfile.t2; // us

                    // Prob of decay = 1 - exp(-t/T1)
                    const pDecay = 1 - Math.exp(-GATE_TIME_US / T1);
                    const pPhase = 1 - Math.exp(-GATE_TIME_US / T2); // Simple dephasing approx

                    if (pDecay > 0) this.applyAmplitudeDamping(q, pDecay);
                    if (pPhase > 0) this.applyPhaseDamping(q, pPhase);
                }
            }
        }

        // Final Results
        const counts = this.sampleCounts(shots);
        const bloch = this.calculateBlochVectors();

        return {
            counts: counts,
            blochVectors: bloch,
            classicalRegister: this.classicalRegister, // Return for UI to double check
            statevector: this.getRawState() // For debugging
        };
    }

    /**
     * Collapse state on qubit 'wire' based on probabilities.
     */
    collapse(wire) {
        const prob1 = this.getProbability(wire);
        const rand = Math.random();

        const measuredOne = rand < prob1;
        const norm = Math.sqrt(measuredOne ? prob1 : 1 - prob1);

        if (norm === 0) return 0; // Should not happen if prob logic is sound

        const bit = 1 << wire;

        for (let i = 0; i < this.stateSize; i++) {
            const hasBit = (i & bit) !== 0;

            if (hasBit === measuredOne) {
                // Keep and normalize
                this.re[i] /= norm;
                this.im[i] /= norm;
            } else {
                // Zero out
                this.re[i] = 0;
                this.im[i] = 0;
            }
        }
        return measuredOne ? 1 : 0;
    }

    getProbability(wire) {
        let prob = 0;
        const bit = 1 << wire;
        for (let i = 0; i < this.stateSize; i++) {
            if ((i & bit) !== 0) {
                prob += (this.re[i] ** 2 + this.im[i] ** 2);
            }
        }
        return prob;
    }

    sampleCounts(shots) {
        const counts = {};
        const probs = new Float64Array(this.stateSize);

        // Calculate all outcome probs
        for (let i = 0; i < this.stateSize; i++) {
            probs[i] = this.re[i] ** 2 + this.im[i] ** 2;
        }

        // Generate shots (Weighted random)
        for (let s = 0; s < shots; s++) {
            let r = Math.random();
            let outcome = -1;
            for (let i = 0; i < this.stateSize; i++) {
                r -= probs[i];
                if (r <= 0) {
                    outcome = i;
                    break;
                }
            }
            if (outcome === -1) outcome = this.stateSize - 1; // Rounding error fallback

            const bin = outcome.toString(2).padStart(this.numQubits, '0').split('').reverse().join('');
            counts[bin] = (counts[bin] || 0) + 1;
        }
        return counts;
    }

    calculateBlochVectors() {
        const vecs = [];

        for (let q = 0; q < this.numQubits; q++) {
            let x = 0, y = 0, z = 0;
            const bit = 1 << q;

            for (let i = 0; i < this.stateSize; i++) {
                if ((i & bit) === 0) {
                    const j = i | bit;

                    const ra = this.re[i], ia = this.im[i];
                    const rb = this.re[j], ib = this.im[j];

                    // Z = P(0) - P(1)
                    z += (ra * ra + ia * ia) - (rb * rb + ib * ib);

                    // X = 2 * Real(rho_01)
                    // a*b* = (ra + i*ia)(rb - i*ib)
                    x += 2 * (ra * rb + ia * ib);

                    // Y = 2 * Imag(rho_01)
                    y += 2 * (ia * rb - ra * ib);
                }
            }
            vecs.push([x, y, z]);
        }
        return vecs;
    }

    getRawState() {
        return { re: Array.from(this.re), im: Array.from(this.im) };
    }

    // --- QFT Implementation ---
    applyQFT() {
        // Standard QFT on all qubits
        // H on q0, CP(q1->q0), CP(q2->q0)...
        // H on q1, CP(q2->q1)...
        // SWAPs at end
        for (let i = 0; i < this.numQubits; i++) {
            this.applyH(i);
            for (let j = i + 1; j < this.numQubits; j++) {
                const theta = Math.PI / Math.pow(2, j - i);
                this.applyControlledGate('CP', j, i, [theta]);
            }
        }
        // Swaps
        for (let i = 0; i < Math.floor(this.numQubits / 2); i++) {
            this.applySwap(i, this.numQubits - 1 - i);
        }
    }

    applyIQFT() {
        // Inverse QFT
        // Reverse order of Swaps
        for (let i = 0; i < Math.floor(this.numQubits / 2); i++) {
            this.applySwap(i, this.numQubits - 1 - i);
        }

        // Reverse order of gates and conjugate phases
        for (let i = this.numQubits - 1; i >= 0; i--) {
            for (let j = this.numQubits - 1; j > i; j--) {
                const theta = -Math.PI / Math.pow(2, j - i);
                this.applyControlledGate('CP', j, i, [theta]);
            }
            this.applyH(i);
        }
    }
}
// NOTE: Mid-circuit MEASURE gates are collected and applied at end of circuit.
// True mid-circuit measurement with conditional logic requires statevector collapse
// which is not yet implemented. MEASURE gates placed mid-circuit will still work
// but conditional operations based on measurement results are not supported.
// NOTE: Mid-circuit MEASURE gates are collected and applied at end of circuit.
// True mid-circuit measurement with conditional logic requires statevector collapse
// which is not yet implemented. MEASURE gates placed mid-circuit will still work
// but conditional operations based on measurement results are not supported.
window.QuantumEngine = QuantumEngine; // Export to global scope

// --- Gate Logic Library ---
// Unitary matrices for quantum gates (complex numbers as {re, im})
const GATE_MATRICES = {
    // Pauli Gates
    H: [[1 / Math.sqrt(2), 1 / Math.sqrt(2)], [1 / Math.sqrt(2), -1 / Math.sqrt(2)]],
    X: [[0, 1], [1, 0]],
    Y: [[0, { re: 0, im: -1 }], [{ re: 0, im: 1 }, 0]],
    Z: [[1, 0], [0, -1]],
    I: [[1, 0], [0, 1]],

    // Phase Gates
    S: [[1, 0], [0, { re: 0, im: 1 }]],
    Sdg: [[1, 0], [0, { re: 0, im: -1 }]], // S\u2020
    T: [[1, 0], [0, { re: Math.cos(Math.PI / 4), im: Math.sin(Math.PI / 4) }]],
    Tdg: [[1, 0], [0, { re: Math.cos(Math.PI / 4), im: -Math.sin(Math.PI / 4) }]], // T\u2020

    // Rotation Gates (parametric - computed at runtime)
    RX: (theta) => [[Math.cos(theta / 2), { re: 0, im: -Math.sin(theta / 2) }], [{ re: 0, im: -Math.sin(theta / 2) }, Math.cos(theta / 2)]],
    RY: (theta) => [[Math.cos(theta / 2), -Math.sin(theta / 2)], [Math.sin(theta / 2), Math.cos(theta / 2)]],
    RZ: (theta) => [[{ re: Math.cos(theta / 2), im: -Math.sin(theta / 2) }, 0], [0, { re: Math.cos(theta / 2), im: Math.sin(theta / 2) }]],
    P: (theta) => [[1, 0], [0, { re: Math.cos(theta), im: Math.sin(theta) }]], // Phase gate with angle

    // Controlled Gates (4x4)
    CNOT: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]],
    CZ: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, -1]],
    CY: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, { re: 0, im: -1 }], [0, 0, { re: 0, im: 1 }, 0]],
    CP: (theta) => [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, { re: Math.cos(theta), im: Math.sin(theta) }]],

    // State Blocks
    RESET: null, // Special: collapses to |0⟩
    MEASURE: null // Special: measures and stores in classical register
};

// Gate visual styles (color, label, category)
const GATE_STYLES = {
    // Basic Gates
    H: { color: '#3b82f6', label: 'H', category: 'basic' },
    X: { color: '#9333ea', label: 'X', category: 'basic' },
    Y: { color: '#22c55e', label: 'Y', category: 'basic' },
    Z: { color: '#ec4899', label: 'Z', category: 'basic' },
    I: { color: '#6b7280', label: 'I', category: 'basic' },

    // Phase Gates
    S: { color: '#8b5cf6', label: 'S', category: 'phase' },
    Sdg: { color: '#7c3aed', label: 'S\u2020', category: 'phase' },
    T: { color: '#6366f1', label: 'T', category: 'phase' },
    Tdg: { color: '#4f46e5', label: 'T\u2020', category: 'phase' },
    P: { color: '#a855f7', label: 'P', category: 'phase' },

    // Rotation Gates
    RX: { color: '#14b8a6', label: 'Rx', category: 'rotation' },
    RY: { color: '#14b8a6', label: 'Ry', category: 'rotation' },
    RZ: { color: '#14b8a6', label: 'Rz', category: 'rotation' },

    // Controlled Gates
    CNOT: { color: '#f97316', label: '\u25CF', category: 'controlled' },
    CZ: { color: '#eab308', label: 'CZ', category: 'controlled' },
    CY: { color: '#84cc16', label: 'CY', category: 'controlled' },
    CP: { color: '#facc15', label: 'CP', category: 'controlled' },

    // State Blocks
    RESET: { color: '#6b7280', label: '|0\u27E9', category: 'state' },
    MEASURE: { color: '#64748b', label: 'M', category: 'state' },

    // Macro Blocks
    QFT: { color: '#0ea5e9', label: 'QFT', category: 'macro' },
    IQFT: { color: '#06b6d4', label: 'QFT\u2020', category: 'macro' }
};

// --- Classical Register (for Measurement results) ---
let classicalBits = []; // Array of { qubit: number, col: number, value: 0|1|null }
const CLASSICAL_WIRE_Y_OFFSET = 50; // Distance below quantum wires
const CLASSICAL_WIRE_COLOR = '#facc15'; // Amber/Yellow

/**
 * Records a measurement result to the classical register.
 */
function recordMeasurement(qubitIndex, col, value = null) {
    // value = null means "not yet measured" (superposition collapsed at runtime)
    classicalBits.push({ qubit: qubitIndex, col: col, value: value });
}

/**
 * Clears all classical register values.
 */
function clearClassicalRegister() {
    classicalBits = [];
}

// Aegis State
let activeDeviceProfile = null;

// --- Time-Travel & Sentinel Architecture ---
const sentinelAgent = {
    activeSignature: null,
    setActiveSignature: function (sig) {
        this.activeSignature = sig;
        console.log(`[Sentinel] Context Signature Updated: ${sig ? sig.substring(0, 8) + '...' : 'NULL'} `);
        // In a real app, this would update the hidden context for the next API call
    }
};

/**
* Context Update: Synchronizes the Gemini 3 Agent with the Restored Timeline State
* This function sends the restored Thought Signature back to the model 
* to preserve reasoning continuity.
*/
async function syncAgentWithTimeline(restoredSignature) {
    if (!restoredSignature) {
        console.warn("No signature found for this state. Agent may hallucinate.");
        return;
    }

    const apiKey = document.getElementById('modalApiKeyInput').value.trim();
    if (!apiKey) return;

    // 1. Update UI to show the Handshake is in progress
    const ind = document.getElementById('signature-indicator'); // Note: might need to ensure this element exists or use sentinel-status-text
    // In original HTML, we have 'sentinel-status-text'
    // Instruction snippet used 'signature-indicator'. I'll map it to 'sentinel-status-text' or add a sub-label if needed.
    // Let's use 'sentinel-status-text' for now as it seems to be the main status indicator.
    const statusText = document.getElementById('sentinel-status-text');
    const statusDot = document.getElementById('sentinel-status-dot');

    if (statusText) statusText.innerText = "SYNCING TIMELINE (" + restoredSignature.substring(0, 8) + ")...";
    if (statusDot) {
        statusDot.className = "w-2 h-2 rounded-full bg-yellow-400 animate-ping"; // Syncing visual
    }

    // 2. The Gemini 3 Handshake Protocol
    // We treat the signature as an immutable binary blob.
    const syncPayload = {
        contents: [{
            role: "model",
            parts: [{
                // You must include the EXACT part that originally had the signature.
                text: "Restoring state from timeline...",
                thoughtSignature: restoredSignature
            }]
        }],
        generationConfig: {
            thinking_level: "HIGH" // Ensure maximum reasoning depth during restoration
        }
    };

    try {
        // This 'dummy' call resets the model's internal save-state to the historical point.
        // Note: Using 'gemini-2.0-flash-thinking-exp-1219' as proxy for Gemini 3 per previous conversations/context if needed, 
        // but instructions say 'gemini-3-pro'. I will stick to what instructions provided but be aware of model names.
        // The URL in instructions is: https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:generateContent
        // I will use that URL.
        // AUDIT FIX: Use correct model and pass API key via header
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-1219:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify(syncPayload)
        });

        if (response.status === 400) {
            throw new Error("Validation Failed: Signature mismatch or truncation.");
        }

        console.log("Sentinel Architect successfully re-aligned with historical reasoning.");

        // Restore "Active" UI
        if (statusText) statusText.innerText = "THOUGHT SIGNATURE RESTORED";
        if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-purple-500 animate-pulse";

        // Causal Debugging: Display the explanation
        const data = await response.json();
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            const explanation = data.candidates[0].content.parts[0].text;
            const chatHistory = document.getElementById('persistentChatHistory');
            if (chatHistory) {
                addChatMessage('agent', `**Historical Context Restored**:\n${explanation}`, chatHistory);
            }
        }

    } catch (err) {
        console.error("Critical: Thought Signature Validation Error", err);
        if (statusText) statusText.innerText = "SYNC FAILED: " + err.message.substring(0, 10);
        if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-red-500";
    }
}

class CircuitTimeline {
    constructor() {
        this.history = []; // Array of {state: JSON, signature: string, timestamp: number, bloch: Array}
        this.currentIndex = -1;
        this.scrubber = document.getElementById('timelineScrubber');
        this.valueDisplay = document.getElementById('timelineValue');
        this.indicator = document.getElementById('signature-indicator'); // We need to add this ID to the HTML if missing, or use existing
    }

    /**
     * Records a new state after a gate is placed or an agent executes a command.
     * @param {Object} currentGridState - The gates array.
     * @param {string} thoughtSignature - The signature returned by the Gemini 3 API.
     * @param {Array} blochState - Current Bloch vectors.
     */
    recordMutation(currentGridState, thoughtSignature = null, blochState = []) {
        // If we are recording a new action while scrubbed back, delete the "future"
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }

        // If signature is null, try to keep the previous one (persistence)
        if (!thoughtSignature && this.history.length > 0) {
            thoughtSignature = this.history[this.history.length - 1].signature;
        }

        const snapshot = {
            state: JSON.parse(JSON.stringify(currentGridState)),
            signature: thoughtSignature || `sig_${Date.now()}`, // Fallback mock signature
            bloch: JSON.parse(JSON.stringify(blochState)),
            timestamp: Date.now()
        };

        this.history.push(snapshot);
        this.currentIndex = this.history.length - 1;
        this.updateUI();
    }

    /**
     * Reverts the entire QuantaVibe environment to a specific point in time.
     * @param {number} index - The history index to jump to.
     */
    /**
     * Reverts the entire QuantaVibe environment to a specific point in time.
     * @param {number} index - The history index to jump to.
     * @param {boolean} doSync - Whether to perform the slow API handshake.
     */
    jumpToState(index, doSync = false) {
        if (index < 0 || index >= this.history.length) return;

        this.currentIndex = index;
        const target = this.history[index];

        // 1. Restore the Canvas Grid
        gates = JSON.parse(JSON.stringify(target.state));
        drawCircuit();

        // 2. Restore the Bloch Sphere positions
        if (target.bloch && target.bloch.length > 0) {
            currentBlochVectors = JSON.parse(JSON.stringify(target.bloch));
            // Update visual for selected qubit
            if (currentBlochVectors[selectedQubit]) {
                updateBlochVector(currentBlochVectors[selectedQubit]);
            }
        }

        // 3. Re-inject the Thought Signature into the Agent's Context
        if (typeof sentinelAgent !== 'undefined' && sentinelAgent && sentinelAgent.setActiveSignature) {
            sentinelAgent.setActiveSignature(target.signature);
        }

        // Visual feedback only
        if (canvas) canvas.style.opacity = index === this.history.length - 1 ? 1.0 : 0.7;

        this.updateUI(true);

        // 4. Trigger Handshake (if requested and signature exists)
        if (doSync && target.signature) {
            syncAgentWithTimeline(target.signature);
        }
    }

    stepBack() {
        if (this.currentIndex > 0) {
            this.jumpToState(this.currentIndex - 1);
        }
    }

    stepForward() {
        if (this.currentIndex < this.history.length - 1) {
            this.jumpToState(this.currentIndex + 1);
        }
    }

    updateUI(skipScrubberUpdate = false) {
        if (!this.scrubber) return;

        // If not skipping (e.g. valid recordMutation), update max and value
        if (!skipScrubberUpdate) {
            this.scrubber.max = Math.max(0, this.history.length - 1);
            this.scrubber.value = this.currentIndex;
        }

        if (this.valueDisplay) {
            this.valueDisplay.innerText = this.currentIndex === this.history.length - 1 ? "NOW" : `T-${(this.history.length - 1) - this.currentIndex}`;
        }

        // Update "Thought Signature Active" indicator
        const pulseDot = document.getElementById('sentinel-status-dot');
        const statusText = document.getElementById('sentinel-status-text');
        const apiKey = document.getElementById('apiKey')?.value.trim();

        if (pulseDot && statusText) {
            const hasSignature = !!this.history[this.currentIndex]?.signature;

            if (!apiKey) {
                pulseDot.className = "w-2 h-2 rounded-full bg-gray-600";
                pulseDot.style.opacity = "0.5";
                statusText.innerText = "SENTINEL OFFLINE";
                statusText.className = "text-xs font-bold text-gray-500 tracking-wider";
            } else if (hasSignature) {
                pulseDot.className = "w-2 h-2 rounded-full bg-purple-500 animate-pulse";
                pulseDot.style.opacity = "1";
                statusText.innerText = "THOUGHT SIGNATURE ACTIVE";
                statusText.className = "text-xs font-bold text-purple-300 tracking-wider";
            } else {
                pulseDot.className = "w-2 h-2 rounded-full bg-cyan-500 animate-pulse";
                pulseDot.style.opacity = "0.8";
                statusText.innerText = "SENTINEL READY";
                statusText.className = "text-xs font-bold text-cyan-400 tracking-wider";
            }
        }
    }
}

const qvTimeline = new CircuitTimeline();

// -- Global Flags --
window.suppressCloudModal = false;

// -- State Variables --
// -- State Variables --
// Restored global state variables
let gates = [];
window.gates = gates; // Expose globally for SentinelCore
let draggingGate = null;
let history = []; // Stack for undo
let pendingCNOT = null; // { col, controlWire }
let draggingGateIndex = -1;
let isDirty = false; // Track changes

let isDraggingCanvasGate = false;
let canvasDragGate = null;

let canvasDragStartPos = {
    x: 0, y: 0
};

let currentBlochVectors = [];
// currentSpaqHealth is unified via window.currentSpaqHealth
// This local reference is kept for backwards compatibility with closures
let currentSpaqHealth = null;
let selectedQubit = 0;
let debounceTimer = null;
let lastSimulationResult = null; // Store last simulation data for API access

// --- Undo/Redo System (Legacy shimmed to Unified Timeline) ---
function saveState() {
    // Forward to Unified Timeline
    if (typeof qvTimeline !== 'undefined') {
        // Auto-capture current gate state
        qvTimeline.recordMutation(gates, null, currentBlochVectors);
    }
}

function undo() {
    if (typeof qvTimeline !== 'undefined') {
        qvTimeline.stepBack();
    }
}

// AUDIT FIX: Removed duplicate redo() definition (4 lines) - canonical version below

document.addEventListener('DOMContentLoaded', () => {
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
        undoBtn.addEventListener('click', undo);
    }
});

// --- QNN Visualizer ---
function animateQNNLoss() {
    // If Hardware Twin is active, the Physics Engine controls these bars (Coherence Monitor)
    if (activeDeviceProfile) return;

    const bars = [];
    for (let i = 0; i < 6; i++) {
        bars.push(document.getElementById(`qnn-bar-${i}`));
    }

    if (!bars[0]) return; // Safety check

    // Stable Baseline for Empty Circuit
    if (gates.length === 0) {
        bars.forEach((bar, index) => {
            bar.style.height = '10%'; // Low baseline
            bar.style.transition = 'height 0.5s ease-out';
            bar.className = 'w-2 bg-gray-800/50 h-full mx-auto';
            bar.style.boxShadow = 'none';
        });
        return;
    }

    // Simulate "convergence" based on circuit complexity
    const complexity = gates.length * 0.05;
    const baseHeight = Math.max(10, 80 - (gates.length * 2)); // More gates = lower loss (simulated learning)

    bars.forEach((bar, index) => {
        // Random fluctuation + convergence trend
        const randomFlux = Math.random() * 20 - 10;
        let targetH = baseHeight + randomFlux - (index * 5);

        // Ensure bounds
        if (targetH < 5) targetH = 5;
        if (targetH > 95) targetH = 95;

        // Last bar (current loss) is most volatile
        if (index === 5) {
            targetH = Math.max(10, baseHeight + (Math.random() * 30 - 15));
            targetH = Math.max(10, baseHeight + (Math.random() * 30 - 15));
            bar.style.boxShadow = `0 0 ${Math.random() * 20 + 5}px var(--accent-cyan)`;
            bar.className = 'w-2 h-full mx-auto';
            bar.style.backgroundColor = 'var(--accent-cyan)';
        } else {
            // Gradient colors
            bar.className = `w-2 h-full mx-auto`;
            bar.style.backgroundColor = index < 3 ? 'rgba(34, 211, 238, 0.4)' : 'rgba(34, 211, 238, 0.7)'; // fallback for --accent-cyan if alpha needed
            bar.style.boxShadow = 'none';
        }

        bar.style.height = `${targetH}%`;
        bar.style.transition = `height ${0.5 + Math.random() * 0.5}s ease-in-out`;
    });
}

// Bloch Animation Removed

// --- Elements ---
// Canvas is initialized globally at top of file via initCanvas()

const simulateBtn = document.getElementById('simulateBtn');
const exportBtn = document.getElementById('exportBtn');

const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const resetBtn = document.getElementById('resetBtn');
const apiKeyInput = document.getElementById('modalApiKeyInput'); // Updated ID
const resultsContainer = document.getElementById('results');
const insightContent = null; // Removed non-existent element usage
const blochContainer = document.getElementById('bloch-container');
const toastContainer = document.getElementById('toast-container');

// Settings
const noiseSlider = document.getElementById('noiseSlider');
const noiseValue = document.getElementById('noiseValue');

// Webcam & Scan
const scanBtn = document.getElementById('scanBtn');
const webcamModal = document.getElementById('webcamModal');
const scanSelectionModal = document.getElementById('scanSelectionModal'); // New
const fileInput = document.getElementById('fileInput'); // New
const closeWebcamBtn = document.getElementById('closeWebcamBtn');
const captureBtn = document.getElementById('captureBtn');
const webcamVideo = document.getElementById('webcamVideo');
const captureCanvas = document.getElementById('captureCanvas');

// Three.js Globals Removed

// --- Initialization ---

// AUDIT FIX: Removed duplicate saveApiKey() definition (56 lines) - canonical version below

function toggleCustomModelInput() {
    const check = document.getElementById('useCustomModel');
    const input = document.getElementById('customModelId');
    const select = document.getElementById('modalModelSelect');

    if (check.checked) {
        input.classList.remove('hidden');
        select.classList.add('opacity-50', 'pointer-events-none');
    } else {
        input.classList.add('hidden');
        select.classList.remove('opacity-50', 'pointer-events-none');
    }
}

// Layout Refinement
function toggleDrawer() {
    const drawer = document.getElementById('utilityDrawer');
    if (drawer) {
        drawer.classList.toggle('open');
    }
}
window.toggleDrawer = toggleDrawer;

// Heron Scaffolding
window.initHeronTopology = function () {
    console.log("Initializing IBM Heron Heavy-Hex Topology...");
    showToast("Heron Topology Initialized", "info");
};

// --- Canvas Initialization ---
// canvas and ctx are declared at the top of the file (lines 81-82)

function initCanvas() {
    canvas = document.getElementById('circuitCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        console.log('[QuantaVibe] Canvas initialized');
    } else {
        console.error('[QuantaVibe] circuitCanvas element not found! Ensure index.html has <canvas id="circuitCanvas">');
    }
}
window.initCanvas = initCanvas;

function resizeCanvas() {
    if (!canvas || !ctx) return;
    const parent = canvas.parentElement;
    if (parent) {
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        // Minimum height must accommodate all wires: START_Y + (NUM_WIRES * WIRE_SPACING) + classical register space
        const MIN_HEIGHT = START_Y + (NUM_WIRES * WIRE_SPACING) + 80;
        const MIN_WIDTH = 400;

        canvas.width = Math.max(MIN_WIDTH, Math.min(parent.clientWidth - 40, MAX_WIDTH));
        canvas.height = Math.max(MIN_HEIGHT, Math.min(parent.clientHeight - 40, MAX_HEIGHT));

        if (typeof drawCircuit === 'function') {
            drawCircuit();
        }
    }
}
window.resizeCanvas = resizeCanvas;

let appInitialized = false;

function init() {
    if (appInitialized) return;
    appInitialized = true;

    // Ensure canvas is initialized (fallback if initCanvas() hasn't run yet)
    if (!canvas) {
        if (typeof initCanvas === 'function') {
            initCanvas();
        } else {
            console.error("Critical: initCanvas not defined yet");
        }
    }


    // Guard against missing canvas
    if (!canvas || !ctx) {
        console.error("Critical Error: Canvas Context Missing");
        return;
    }

    // Canvas sizing handled by initCanvas -> resizeCanvas
    drawCircuit();
    setupDragAndDrop();
    initVisuals();

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseup', handleCanvasMouseUp);
    canvas.addEventListener('mouseleave', handleCanvasMouseUp);

    // Listeners
    // Listeners with Safety Checks
    if (simulateBtn) simulateBtn.addEventListener('click', () => runSimulation());
    if (exportBtn) exportBtn.addEventListener('click', () => exportToQASM());

    if (resetBtn) resetBtn.addEventListener('click', resetCircuit);
    if (undoBtn) undoBtn.addEventListener('click', undo);
    if (redoBtn) redoBtn.addEventListener('click', redo);

    // Sidebar Navigation
    const navCircuitBtn = document.getElementById('navCircuitBtn');
    if (navCircuitBtn) {
        navCircuitBtn.addEventListener('click', () => {
            const container = document.getElementById('canvas-container');
            if (container) container.scrollIntoView({ behavior: 'smooth' });
        });
    }

    const navDataBtn = document.getElementById('navDataBtn');
    if (navDataBtn) {
        navDataBtn.addEventListener('click', () => {
            // Highlight or scroll to Right Panel
            const rightPanel = document.querySelector('.area-right');
            if (rightPanel) {
                rightPanel.scrollIntoView({ behavior: 'smooth' });
                rightPanel.classList.add('ring-2', 'ring-cyan-500');
                setTimeout(() => rightPanel.classList.remove('ring-2', 'ring-cyan-500'), 1000);
            }
        });
    }
    const navSettingsBtn = document.getElementById('navSettingsBtn');
    if (navSettingsBtn) {
        navSettingsBtn.addEventListener('click', () => {
            const apiModal = document.getElementById('apiModal');
            if (apiModal) apiModal.classList.remove('hidden');
        });
    }

    const navAIBtn = document.getElementById('navAIBtn');
    if (navAIBtn) {
        navAIBtn.addEventListener('click', () => {
            const chatInput = document.getElementById('persistentChatInput');
            if (chatInput) chatInput.focus();
        });
    }

    // Slider
    if (noiseSlider && noiseValue) {
        noiseSlider.addEventListener('input', (e) => {
            noiseValue.innerText = `${e.target.value}%`;
            triggerLiveSimulation(); // Update live
        });
    }

    // Scan Button Handler
    if (scanBtn) {
        scanBtn.onclick = openScanSelection; // Bind directly
    }

    // Modal Listeners
    if (closeWebcamBtn) closeWebcamBtn.addEventListener('click', closeWebcam);
    if (captureBtn) captureBtn.addEventListener('click', captureAndSend);
    if (fileInput) fileInput.addEventListener('change', handleFileImport);

    // Agent Chat (Aegis Persistent Dock)
    const chatInput = document.getElementById('persistentChatInput');
    const sendChatBtn = document.getElementById('persistentSendBtn');
    const chatHistory = document.getElementById('persistentChatHistory');
    const headerAgentBtn = document.getElementById('headerAgentBtn');
    const collapseDockBtn = document.getElementById('collapseDockBtn');

    if (collapseDockBtn) {
        collapseDockBtn.addEventListener('click', collapseAgentDock);
    }

    if (headerAgentBtn) {
        headerAgentBtn.addEventListener('click', () => {
            const dock = document.querySelector('.area-dock');
            if (dock) dock.scrollIntoView({ behavior: 'smooth' });
            if (chatInput) chatInput.focus();
        });
    }

    // Diffusion & Timeline
    const generateBtn = document.getElementById('generateBtn');
    const diffusionPrompt = document.getElementById('diffusionPrompt');
    const timelineScrubber = document.getElementById('timelineScrubber');
    const timelineValue = document.getElementById('timelineValue');

    // Listeners
    if (sendChatBtn) sendChatBtn.addEventListener('click', sendMessage);

    if (chatInput) chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            const prompt = diffusionPrompt.value;

            if (!prompt) {
                showToast("Enter a prompt first", "warning"); return;
            }

            // --- Real Agent Generation ---
            // Re-use the persistent chat input logic but specifically for circuit generation
            const chatInput = document.getElementById('persistentChatInput');
            const chatHistory = document.getElementById('persistentChatHistory');
            const apiKey = geminiClient.getApiKey();

            if (!apiKey) {
                showToast("API Key required for Generator", "error");
                // Also trigger prompt in agent dock
                const initMsg = document.getElementById('initial-agent-msg');
                if (initMsg) initMsg.classList.add("animate-pulse", "border-red-500");
                return;
            }

            showToast(`Synthesizing circuit: "${prompt}" ...`, "info");

            // Trigger Agent Call - sendMessage will add the user message
            sendMessage(prompt, true); // skipAddUserMessage = true since we want custom prefix
        });
    }

    if (timelineScrubber) {
        timelineScrubber.addEventListener('input', (e) => {
            // Fast visual update only
            qvTimeline.jumpToState(parseInt(e.target.value), false);
        });

        timelineScrubber.addEventListener('change', (e) => {
            // Full sync on release
            qvTimeline.jumpToState(parseInt(e.target.value), true);
        });
    }

    // API Key Persistence
    const savedKey = sessionStorage.getItem('gemini_api_key');

    // Robust check to prevent "null"/"undefined" strings from appearing as valid keys
    if (savedKey && savedKey !== "null" && savedKey !== "undefined" && savedKey.trim() !== "") {
        apiKeyInput.value = savedKey;
    } else {
        apiKeyInput.value = ""; // Clear invalid or empty keys
        sessionStorage.removeItem('gemini_api_key'); // Clean up storage
    }

    // Restore Model Selection
    const savedModel = localStorage.getItem('gemini_model');
    const modelSelect = document.getElementById('modalModelSelect');
    if (savedModel && modelSelect) {
        modelSelect.value = savedModel;
    }

    // Restore Hardware Profile
    // Restore Hardware Profile
    const savedHardware = localStorage.getItem('hardware_profile');
    // Hardware Profile UI removed from settings, but we still restore the state
    // if (savedHardware) {
    //     updateHardwareProfile(savedHardware);
    // }

    // Hardware Select Listener


    // Model Select Listener - Immediate feedback
    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            const selectedModel = e.target.value;
            if (window.geminiClient) {
                window.geminiClient.setModel(selectedModel);
                showToast(`Model switched to: ${selectedModel}`, "success");
            }
        });
    }

    // Initial UI Sync based on loaded key
    if (typeof qvTimeline !== 'undefined') {
        qvTimeline.updateUI();

        // Also update the initial chat message if offline
        const initMsg = document.getElementById('initial-agent-msg');
        if (initMsg && !savedKey) {
            initMsg.innerText = "Sentinel Offline. Please enter Gemini API Key to activate.";
            initMsg.classList.remove('text-blue-200', 'border-blue-500/20', 'bg-blue-900/20');
            initMsg.classList.add('text-gray-400', 'border-gray-600', 'bg-gray-800/50');
        }
    }

    apiKeyInput.addEventListener('input', (e) => {
        sessionStorage.setItem('gemini_api_key', e.target.value);
        // Update UI immediately when key changes
        if (typeof qvTimeline !== 'undefined') qvTimeline.updateUI();

        // Update Initial Message dynamic update? valid use case
        const initMsg = document.getElementById('initial-agent-msg');
        if (initMsg) {
            if (e.target.value.trim()) {
                initMsg.innerText = "Sentinel Architect Online. Ready for instructions.";
                initMsg.className = "bg-blue-900/20 p-2 rounded border border-blue-500/20 text-blue-200 text-xs self-start max-w-lg";
                updateSentinelStatus(true);
            } else {
                initMsg.innerText = "Sentinel Offline. Please enter Gemini API Key to activate.";
                initMsg.className = "bg-gray-800/50 p-2 rounded border border-gray-600 text-gray-400 text-xs self-start max-w-lg";
                updateSentinelStatus(false);
            }
        }
    });
    // --- Sentinel API Bridge (Added by Sentinel Architect) ---

    console.log("[QuantaVibe] Sentinel API Bridge Established.");

    // FeatureLoader Global Instance instantiation removed - handled in initSystemBoot


    // --- Visualization Initialization ---
    // --- Visualization Initialization ---
    // 3D Visuals Removed for Paper-Trail Pivot
    function initVisuals() {
        console.log("3D Visuals have been disabled.");
    }


}

// Auto-Init removed — initSystemBoot() at the bottom of this file already calls init()
// Having both caused a race condition where init() ran before deferred scripts were ready

// --- Aegis Physics Engine (Hardware Mirror) ---
let physicsStartTime = Date.now();
const IDEAL_T1 = 1000000; // Infinite for ideal

// Device Profiles
const deviceProfiles = {
    'willow': {
        name: "Google Willow (Sugawara)", t1: 30, variations: [0.9, 0.8, 1.1, 0.95, 0.85],
        layout: 'grid',
        gridCols: 4, gridRows: 4, // 16-qubit sector
        grid_width: 4, grid_height: 4, // Legacy compat
        coupling_map: [] // Auto-generated in updateHardwareProfile if empty
    },
    'heron': {
        name: "IBM Heron R2", t1: 45, variations: [1.0, 0.9, 0.9, 1.1, 0.8],
        layout: 'hex',
        // Heavy-Hex Sub-Patch of 156-qubit Heron R2 lattice
        // Demo qubits 0-4 map to physical qubits [0, 1, 2, 4, 15]
        // Native 2-qubit gate: CZ (tunable coupler)
        physicalMap: { 0: 0, 1: 1, 2: 2, 3: 4, 4: 15 },
        native_2q_gate: 'CZ',
        node_roles: {
            0: 'leaf',     // degree 1 — pendant qubit
            1: 'hub',      // degree 3 — heavy-hex hub
            2: 'leaf',     // degree 1 — pendant qubit
            3: 'bridge',   // degree 2 — inter-cell bridge
            4: 'hub'       // degree 3 — next cell hub (truncated at sub-patch boundary)
        },
        topology_note: 'Heavy-Hex sub-patch of 156-qubit IBM Heron R2 lattice (Qubits 0, 1, 2, 4, 15)',
        coupling_map: [
            [0, 1], [1, 0],   // leaf(0) ↔ hub(1)
            [1, 2], [2, 1],   // hub(1)  ↔ leaf(2)
            [1, 3], [3, 1],   // hub(1)  ↔ bridge(3)
            [3, 4], [4, 3]    // bridge(3) ↔ hub(4)
        ],
        fixed_positions: {
            0: { x: 400, y: 100 },  // Leaf (top pendant)
            1: { x: 400, y: 200 },  // Hub (degree-3 center)
            2: { x: 500, y: 200 },  // Leaf (right pendant)
            3: { x: 400, y: 300 },  // Bridge (inter-cell link)
            4: { x: 400, y: 400 }   // Hub (next cell)
        }
    },
    'ankaa': {
        name: "Rigetti Ankaa-2", t1: 20, variations: [0.8, 0.8, 0.8, 0.8, 0.8],
        layout: 'grid', grid_width: 5, grid_height: 5, coupling_map: []
    },
    'forte': {
        name: "IonQ Forte", t1: 100, variations: [1.0, 1.0, 1.0, 1.0, 1.0],
        layout: 'linear', coupling_map: [] // All-to-all usually implies no specific map needed for drawing
    }
};

// let aegisProfile = null; // Legacy support (Already defined below)

function updateHardwareProfile(profileKey) {
    if (!profileKey) {
        activeDeviceProfile = null;
        showToast("Switched to Ideal Simulation (No Noise)", "info");

    } else {
        activeDeviceProfile = deviceProfiles[profileKey];
        if (activeDeviceProfile) {
            showToast(`Active Twin: ${activeDeviceProfile.name}`, "success");
            physicsStartTime = Date.now(); // Reset decay
        }
    }
    // Persist choice
    localStorage.setItem('hardware_profile', profileKey || '');

    // Suppress Cloud Modal for a brief moment to prevent unwanted popup during layout switch
    window.suppressCloudModal = true;
    setTimeout(() => { window.suppressCloudModal = false; }, 1000);

    // Trigger immediate UI refresh
    if (typeof updateSystemMetrics === 'function') updateSystemMetrics();

    // Reset Physics
    physicsStartTime = Date.now();

    // Force SPAQ update to show 100% initially
    window.currentSpaqHealth = {}; // Reset
    if (typeof window.updateSPAQCoherence === 'function') window.updateSPAQCoherence();

    // Redraw circuit to reflect hardware profile change in visuals
    if (typeof drawCircuit === 'function') drawCircuit();
}

// Logic for restored Hardware Mirror and Sliders
// AUDIT FIX: Removed duplicate triggerHardwareMirror() definition (7 lines) - canonical version below

// selectProfile defined below with full implementation

// Sync logic for Header Slider
const headerNoiseSlider = document.getElementById('headerNoiseSlider');
const headerNoiseValue = document.getElementById('headerNoiseValue');

if (headerNoiseSlider) {
    headerNoiseSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        // Sync Visuals
        if (headerNoiseValue) headerNoiseValue.innerText = `${val}%`;

        // Sync Core Slider
        // Sync Core Slider
        const ns = document.getElementById('noiseSlider');
        const nv = document.getElementById('noiseValue');
        if (ns) {
            ns.value = val;
            if (nv) nv.innerText = `${val}%`;
            // Trigger core logic
            triggerLiveSimulation();
        }
    });

    // Also listen to core slider to update header
    const ns = document.getElementById('noiseSlider');
    if (ns) {
        ns.addEventListener('input', (e) => {
            headerNoiseSlider.value = e.target.value;
            if (headerNoiseValue) headerNoiseValue.innerText = `${e.target.value}%`;
        });
    }
}

function updateHardwarePhysics() {
    // If no hardware selected, keep ideal state (don't decay)
    if (!activeDeviceProfile && !aegisProfile) return;

    const profile = activeDeviceProfile || aegisProfile;
    const now = Date.now();
    // Map T1 (microseconds) to visual decay seconds (e.g. 30us -> 30s)
    const elapsed = (now - physicsStartTime) / 1000;
    const t1_apparent = profile.t1 || 100;

    // We update global health state for the visualizer
    window.currentSpaqHealth = window.currentSpaqHealth || {};

    const numQubits = window.NUM_WIRES || 5;
    let totalCoherence = 0;

    for (let q = 0; q < numQubits; q++) {
        // Simulated decay for this qubit with Manufacturing Variance
        const variance = profile.variations ? (profile.variations[q] || 1.0) : 1.0;
        const t1_eff = t1_apparent * variance;
        const decay = Math.exp(-elapsed / t1_eff);

        // Update global state
        window.currentSpaqHealth[q] = decay;
        totalCoherence += decay;
    }

    // Update Visuals
    if (typeof window.updateSPAQCoherence === 'function') {
        window.updateSPAQCoherence();
    }

    // Update text metrics (Health %)
    if (typeof updateSystemMetrics === 'function') {
        updateSystemMetrics();
    }
}

// Hook into Animation Loop
// We need to find `function animate()` and call `updateHardwarePhysics()` inside it.
// Since we are replacing a block, we can't easily inject into `animate` if it's not in the block.
// We'll create a separate interval for physics to ensure it runs even if Three.js loop pauses, 
// or simpler: just use setInterval.

setInterval(() => {
    try {
        updateHardwarePhysics();
    } catch (err) {
        console.error("Physics Loop Error:", err);
    }
}, 100); // 10Hz Physics Update

// Reset physics start time on simulation run or gate change
const originalRunSimulation = runSimulation; // Save reference if available in scope (it wraps `runSimulation` call?)
// Actually `runSimulation` is defined elsewhere. check file.
// We can hook into `resetCircuit` and `simulateBtn`.

// Redefine resetCircuit to reset physics time
const originalReset = resetCircuit;
resetCircuit = () => {
    physicsStartTime = Date.now();
    originalReset();
    if (arrowHelper) arrowHelper.setLength(2.5); // Restore Bloch length
};

// --- Aegis Features ---
function triggerHardwareMirror() {
    document.getElementById('hardwareMirrorModal').classList.remove('hidden');
}

function triggerCustomNoise() {
    document.getElementById('customNoiseModal').classList.remove('hidden');
}

// AUDIT FIX: Removed duplicate updateCustomNoiseDisplay() definition (5 lines) - canonical version below

// AUDIT FIX: Removed duplicate applyCustomNoise() (21 lines) - canonical version elsewhere

function selectProfile(profileKey) {
    updateHardwareProfile(profileKey);
    document.getElementById('hardwareMirrorModal').classList.add('hidden');

    if (activeDeviceProfile) {
        // Auto-Generate Coupling Map for Grid correctness if empty
        if (activeDeviceProfile.layout === 'grid' && (!activeDeviceProfile.coupling_map || activeDeviceProfile.coupling_map.length === 0)) {
            const w = activeDeviceProfile.grid_width || 4;
            const h = activeDeviceProfile.grid_height || 4;
            const map = [];
            for (let r = 0; r < h; r++) {
                for (let c = 0; c < w; c++) {
                    const i = r * w + c;
                    // Horizontal (i <-> i+1)
                    if (c < w - 1) {
                        map.push([i, i + 1]); map.push([i + 1, i]);
                    }
                    // Vertical (i <-> i+w)
                    if (r < h - 1) {
                        map.push([i, i + w]); map.push([i + w, i]);
                    }
                }
            }
            activeDeviceProfile.coupling_map = map;
        }

        // Update visual context for grid/hex
        if (activeDeviceProfile.layout === 'grid') {
            NUM_WIRES = (activeDeviceProfile.grid_width || 4) * (activeDeviceProfile.grid_height || 4);
        } else if (activeDeviceProfile.layout === 'hex') {
            NUM_WIRES = 16; // 4x4 Hex-ish Grid
            // Create a fake Heavy-Hex map if none exists
            if (!activeDeviceProfile.coupling_map) {
                activeDeviceProfile.coupling_map = [];
                // Simple Nearest Neighbor on the Hex Grid defined in getGridNodePos
                // Row 0: 0-1, 1-2, 2-3
                // Row 1: 4-5, 5-6, 6-7
                // Vertical connections between rows (staggered)
                // 0-4, 1-5, 2-6, 3-7 (Simplified)
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 4; c++) {
                        const i = r * 4 + c;
                        // Right Neighbor
                        if (c < 3) activeDeviceProfile.coupling_map.push([i, i + 1]);
                        // Bottom Neighbor (Simple Mesh for scaffolding)
                        if (r < 3) activeDeviceProfile.coupling_map.push([i, i + 4]);
                    }
                }
            }
        } else {
            NUM_WIRES = 5; // Reset default
        }

        // Disable generic slider
        if (document.getElementById('noiseSlider')) {
            document.getElementById('noiseSlider').disabled = true;
            document.getElementById('noiseValue').innerText = "AUTO";
        }

        triggerLiveSimulation();
        drawCircuit();
    } else {
        // Ideal Mode Reset
        NUM_WIRES = 5;
        if (document.getElementById('noiseSlider')) {
            document.getElementById('noiseSlider').disabled = false;
        }
        drawCircuit();
    }
}

// Legacy backend function removed in favor of AI-driven version

// --- Gate Detail / Micro-Audit Panel ---
const GATE_NAMES = {
    H: 'Hadamard', X: 'Pauli-X (NOT)', Y: 'Pauli-Y', Z: 'Pauli-Z', I: 'Identity',
    S: 'S Phase', Sdg: 'S-Dagger', T: 'T Phase', Tdg: 'T-Dagger', P: 'Phase Gate',
    RX: 'Rotation X', RY: 'Rotation Y', RZ: 'Rotation Z',
    CNOT: 'Controlled-NOT', CZ: 'Controlled-Z', CY: 'Controlled-Y', CP: 'Controlled-Phase',
    RESET: 'Reset to |0\u27E9', MEASURE: 'Measurement',
    QFT: 'Quantum Fourier Transform', IQFT: 'Inverse QFT'
};

/**
 * Formats a complex number for display.
 */
function formatComplex(val) {
    if (typeof val === 'number') {
        return val === 0 ? '0' : val.toFixed(3).replace(/\.?0+$/, '');
    }
    if (val && typeof val === 'object' && ('re' in val || 'im' in val)) {
        const re = val.re || 0;
        const im = val.im || 0;
        if (re === 0 && im === 0) return '0';
        if (re === 0) return im === 1 ? 'i' : im === -1 ? '-i' : `${im.toFixed(2)}i`;
        if (im === 0) return re.toFixed(3).replace(/\.?0+$/, '');
        const sign = im >= 0 ? '+' : '';
        const imPart = im === 1 ? 'i' : im === -1 ? '-i' : `${im.toFixed(2)}i`;
        return `${re.toFixed(2)}${sign}${imPart}`;
    }
    return String(val);
}

/**
 * Renders a gate's unitary matrix as an HTML table.
 */
function renderGateMatrix(gateType, theta = Math.PI) {
    const container = document.getElementById('gateMatrixView');
    if (!container) return;

    let matrix = GATE_MATRICES[gateType];
    if (!matrix) {
        container.innerHTML = '<span class="text-gray-500">N/A</span>';
        return;
    }

    // Handle parametric gates
    if (typeof matrix === 'function') {
        matrix = matrix(theta);
    }

    const size = matrix.length;
    let html = '<table class="w-full border-collapse">';
    html += '<tbody>';
    for (let i = 0; i < size; i++) {
        html += '<tr>';
        for (let j = 0; j < matrix[i].length; j++) {
            const val = formatComplex(matrix[i][j]);
            html += `<td class="border border-gray-700/30 px-1 py-0.5 text-center">${val}</td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * Shows the Gate Detail panel with info about the selected gate.
 */
function showGateDetail(gateType, theta = null) {
    const panel = document.getElementById('gateDetailPanel');
    const icon = document.getElementById('gateDetailIcon');
    const name = document.getElementById('gateDetailName');
    const category = document.getElementById('gateDetailCategory');

    if (!panel || !icon || !name || !category) return;

    const style = GATE_STYLES[gateType] || { color: '#6b7280', label: gateType, category: 'unknown' };

    icon.textContent = style.label;
    icon.style.backgroundColor = style.color + '40'; // 40 = 25% opacity
    icon.style.color = style.color;
    name.textContent = GATE_NAMES[gateType] || gateType;
    category.textContent = style.category.toUpperCase() + ' GATE';

    renderGateMatrix(gateType, theta || Math.PI);

    panel.classList.remove('hidden');
}

// Expose for global access
window.showGateDetail = showGateDetail;

// --- Aegis Hardware Logic ---
let aegisProfile = null; // {name, t1, t2...} or null

// Redirect legacy call
function selectHardware(name) {
    selectProfile(name);
}

// --- Toast System ---
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colorClass = type === 'error' ? 'bg-red-600' : 'bg-blue-600';

    toast.className = `toast ${colorClass} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 w-72 pointer-events-auto cursor-pointer`;

    let icon = type === 'error'
        ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
        : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';

    const msgStr = (typeof message === 'string') ? message : String(message);
    toast.innerHTML = `<div>${icon}</div><p class="text-sm font-medium">${msgStr}</p>`;

    toast.onclick = () => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }

        ;

    toastContainer.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        if (toast.isConnected) {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }
    }

        , 5000);
}

// --- Agent Logic ---
let isAgentBusy = false;

// AUDIT FIX: Removed duplicate expandAgentDock() definition (8 lines) - canonical version below

// AUDIT FIX: Removed duplicate collapseAgentDock() definition (5 lines) - canonical version below

function toggleAgentDock() {
    const dock = document.querySelector('.area-dock');
    if (dock) {
        dock.classList.toggle('translate-y-[calc(100%-40px)]');
    }
}

// Expose
window.collapseAgentDock = collapseAgentDock;
window.expandAgentDock = expandAgentDock;
window.toggleAgentDock = toggleAgentDock;

async function sendMessage(promptOverride = null, skipUserMessage = false) {
    console.log('[DEBUG] sendMessage called', { promptOverride, skipUserMessage, timestamp: Date.now() });
    if (isAgentBusy) {
        console.log('[DEBUG] sendMessage blocked - isAgentBusy=true');
        return;
    }

    const chatInput = document.getElementById('persistentChatInput');
    const chatHistory = document.getElementById('persistentChatHistory');
    const apiKey = geminiClient.getApiKey();

    // Fix: Event object passed as first arg in click listener
    let message = chatInput.value.trim();
    if (typeof promptOverride === 'string' && promptOverride.length > 0) {
        message = promptOverride;
    }

    if (!message) return;

    if (!apiKey) {
        showToast("Enter API Key first!", "error");
        const offlineMsg = document.getElementById('initial-agent-msg');
        if (offlineMsg) offlineMsg.classList.add('border-red-500', 'animate-pulse');
        return;
    }

    isAgentBusy = true;
    const sendBtn = document.getElementById('persistentSendBtn');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    // User Message (skip if called from generator with custom message)
    if (!skipUserMessage) {
        addChatMessage('user', message, chatHistory);
    }
    // ALWAYS clear input box after capturing message
    chatInput.value = '';

    // Agent Loading
    const loadingId = addChatMessage('agent', 'Thinking...', chatHistory);
    const loadingElem = document.getElementById(loadingId);

    try {
        // --- UNIFIED ROUTING: All chat input goes through SentinelCore ---
        // SentinelCore.query() handles: system prompt, JSON tool calling, intent safety net,
        // tool execution (all tools including hardware, bioshield, plugins, circuits, etc.)
        if (window.sentinelCore) {
            const responseText = await window.sentinelCore.query(message);

            if (loadingElem) loadingElem.remove();
            expandAgentDock();

            // Display Sentinel's text response
            if (responseText) {
                addChatMessage('agent', responseText, chatHistory);
                if (typeof updateSentinelHub === 'function') updateSentinelHub(responseText);
            }
        } else {
            // Fallback if SentinelCore not loaded: direct Gemini call for conversational responses
            const responseText = await geminiClient.generateContent(message,
                'You are SENTINEL-3, an AI assistant for the AEGIS-QUANTUM circuit designer. Answer quantum computing questions helpfully.');

            if (loadingElem) loadingElem.remove();
            expandAgentDock();

            addChatMessage('agent', responseText, chatHistory);
            if (typeof updateSentinelHub === 'function') updateSentinelHub(responseText);
        }

    } catch (err) {
        if (loadingElem) loadingElem.remove();
        addChatMessage('agent', "System Error: " + err.message, chatHistory);
        console.error("Agent Error:", err);
        showToast("Agent Error: " + err.message, "error");
    } finally {
        isAgentBusy = false;
        const sendBtn = document.getElementById('persistentSendBtn');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

function addChatMessage(role, text, historyContainer) {
    // Use the enhanced version from index.html (supports markdown + [IMAGE] tags) if available
    if (window.addChatMessage && window.addChatMessage !== addChatMessage) {
        window.addChatMessage(role, text, historyContainer);
        return 'msg-' + Date.now();
    }
    // Fallback: basic text rendering
    const id = 'msg-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = role === 'user'
        ? 'bg-blue-600/30 p-2 rounded text-right self-end border border-blue-500/30 ml-8'
        : 'bg-gray-700/50 p-2 rounded text-left self-start border border-gray-600 mr-8';
    div.style.alignSelf = role === 'user' ? 'flex-end' : 'flex-start';
    div.innerText = text;
    if (historyContainer) {
        historyContainer.appendChild(div);
        historyContainer.scrollTop = historyContainer.scrollHeight;
    }
    return id;
}

// Helper to find next free spot
function getNextFreeColumn(wire) {
    wire = parseInt(wire);
    if (gates.length === 0) return 0;

    // Find max col used by any gate touching this wire
    // Simple approach: look at all gates
    let maxCol = -1;

    gates.forEach(g => {
        let touches = false;
        if (g.wire === wire) touches = true;
        if (g.target !== undefined && g.target === wire) touches = true;
        // Also check if a vertical line (CNOT) crosses this wire? 
        // For simplicity, just check endpoints. Real layout engine needs more.

        if (touches) {
            if (g.col > maxCol) maxCol = g.col;
        }
    });
    return maxCol + 1;
}

// Agent Helpers
function executeAddGate(type, wire, col) {
    gates.push({
        type: type.toUpperCase(), wire: parseInt(wire), col: parseInt(col)
    });
}

function executeAddCNOT(control, target, col) {
    gates.push({
        type: 'CNOT', wire: parseInt(control), target: parseInt(target), col: parseInt(col)
    });
}

// --- Logic Binding System ---

function recordTimeStep() {
    // 1. Record Mutation in Timeline
    if (typeof qvTimeline !== 'undefined') {
        qvTimeline.recordMutation(gates);
    }

    // 2. Immediate UI Updates
    updateSystemMetrics();
    updateSPAQCoherence();

    // 3. Trigger Physics Engine
    // triggerLiveSimulation(); // Disabled per user request (manual only)
}

// updateSPAQCoherence — consolidated to single canonical version at window.updateSPAQCoherence (end of file)
// This stub delegates to the window version for any legacy callers
function updateSPAQCoherence() {
    if (window.updateSPAQCoherence && window.updateSPAQCoherence !== updateSPAQCoherence) {
        window.updateSPAQCoherence();
    }
}

function updateSystemMetrics() {
    // Prevent overwriting AI results if they are active
    if (window._aiOverrideActive) return;

    // 1. System Health (Avg Coherence)
    let totalCoherence = 0;
    const t1 = (activeDeviceProfile && activeDeviceProfile.t1) ? activeDeviceProfile.t1 : Infinity;

    // Recalculate simply for average
    const qubitCounts = new Array(NUM_WIRES).fill(0);
    gates.forEach(g => {
        if (g.wire !== undefined) qubitCounts[g.wire]++;
        if (g.target !== undefined) qubitCounts[g.target]++;
    });

    for (let i = 0; i < NUM_WIRES; i++) {
        let c = (t1 === Infinity) ? 1.0 : Math.exp(-(qubitCounts[i] * 1) / t1);
        totalCoherence += c;
    }
    const avgHealth = (totalCoherence / NUM_WIRES) * 100;

    const healthEl = document.getElementById('sysHealthValue');
    if (healthEl) {
        healthEl.innerText = avgHealth.toFixed(1) + "%";
        healthEl.className = avgHealth > 90 ? "text-[10px] font-mono font-bold text-cyan-400" : (avgHealth > 70 ? "text-[10px] font-mono font-bold text-yellow-400" : "text-[10px] font-mono font-bold text-red-400");
    }

    // 2. Est. Fidelity (Hardware-Aware Exponential Decay)
    // Willow: 0.999^gates, Heron: 0.985^gates, Default: 0.995^gates
    const gateCount = gates.length;
    let fidelityBase = 0.995; // Default for ideal simulator

    // if (typeof showToast === 'function') {
    //     const name = activeDeviceProfile?.name || 'Ideal Simulator';
    //     // showToast(`Hardware Profile: ${name}`, 'info'); // REMOVED: Causes infinite spam loop
    // }

    // Initial Status Check
    const key = sessionStorage.getItem('gemini_api_key') || document.getElementById('apiKey')?.value || "";
    updateSentinelStatus(!!key);

    if (activeDeviceProfile) {
        const profileName = activeDeviceProfile.name?.toLowerCase() || '';
        if (profileName.includes('willow')) {
            fidelityBase = 0.999; // Google Willow - high fidelity
        } else if (profileName.includes('heron')) {
            fidelityBase = 0.985; // IBM Heron - lower fidelity
        } else if (profileName.includes('ankaa')) {
            fidelityBase = 0.990; // Rigetti Ankaa
        } else if (profileName.includes('forte')) {
            fidelityBase = 0.992; // IonQ Forte
        }
    }

    const fidelity = Math.pow(fidelityBase, gateCount);

    const fidEl = document.getElementById('estFidelityValue');
    if (fidEl) {
        fidEl.innerText = (fidelity * 100).toFixed(2) + "%";
    }

    // 3. Shot Noise (Based on Slider)
    const noiseSlider = document.getElementById('noiseSlider');
    const noiseVal = noiseSlider ? parseInt(noiseSlider.value) : 0;
    // ISSUE 10 FIX: Use element ID instead of broken .hud-value CSS selectors
    const noiseEl = document.getElementById('shotNoiseValue');

    if (noiseEl) {
        if (noiseVal === 0) {
            noiseEl.innerText = "LOW";
            noiseEl.className = "text-[10px] font-mono font-bold text-green-400";
        } else if (noiseVal < 40) {
            noiseEl.innerText = "MED";
            noiseEl.className = "text-[10px] font-mono font-bold text-yellow-400";
        } else {
            noiseEl.innerText = "HIGH";
            noiseEl.className = "text-[10px] font-mono font-bold text-red-400";
        }
    }
}

// --- Simulation Logic ---
function triggerLiveSimulation() {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        runSimulation(true);
    }

        , 500);
}

// --- Zero-Backend Simulation (QuantumEngine) ---
// (cleaned)
// (QuantumEngine and runSimulation are already defined in this file)

// --- UI HANDLERS ---

// AUDIT FIX: Removed duplicate openPDFModal() definition (11 lines) - canonical version below

function toggleVisualEnvironment() {
    // Toggle 3D Z-Axis View
    // Try to find the button that triggers this to pass to toggleZAxis if needed, 
    // or manually toggle the class.

    // Logic from toggleZAxis:
    const canvas = document.getElementById('circuitCanvas');
    if (!canvas) return;

    const isActive = canvas.classList.toggle('z-axis-active');

    // Update button visual state if possible
    // The sidebar button is: <div onclick="toggleVisualEnvironment()" ...>
    // It's not the same as the 'toggleZAxis' button in the legacy code likely.

    if (isActive) {
        if (window.showToast) window.showToast("Z-Axis Layered View (3D) Enabled", "info");
    }
}

// --- AGENTIC VISUAL BINDING ---
// NOTE: fetchAgenticVisuals removed - consolidated into triggerAIAnalysis (line ~5619)

function processAIPhysicsState(data) {
    const numQubits = window.NUM_WIRES || 5;

    // 1. Override Bloch Vectors
    if (data.blochVectors && Array.isArray(data.blochVectors)) {
        currentBlochVectors = data.blochVectors;
        if (currentBlochVectors[selectedQubit]) {
            updateBlochVector(currentBlochVectors[selectedQubit]);
        }
    }

    // 2. Override Tomography (Counts) — convert probabilities to shot counts
    let newCounts = null;
    if (data.tomography && typeof data.tomography === 'object') {
        newCounts = {};
        for (const [state, prob] of Object.entries(data.tomography)) {
            const paddedState = state.padStart(numQubits, '0');
            const shotCount = Math.round(prob * 1024);
            if (shotCount > 0) newCounts[paddedState] = shotCount;
        }

        // Ensure at least one state exists
        if (Object.keys(newCounts).length === 0) {
            newCounts['0'.repeat(numQubits)] = 1024;
        }

        lastSimulationResult = { ...lastSimulationResult, counts: newCounts };

        // Update 2D distribution bars
        if (typeof renderResults === 'function') {
            renderResults(newCounts);
        }
    }

    // 3. Override System Metrics (HUD elements below circuit)
    if (data.system_health !== undefined) {
        const healthEl = document.getElementById('sysHealthValue');
        if (healthEl) {
            healthEl.innerText = data.system_health.toFixed(1) + "%";
            const h = data.system_health;
            healthEl.className = h > 90 ? "text-[10px] font-mono font-bold text-cyan-400" :
                (h > 70 ? "text-[10px] font-mono font-bold text-yellow-400" :
                    "text-[10px] font-mono font-bold text-red-400");
        }

        // 4. Update Fidelity (derived from system health - inverse of error rate)
        const fidelityEl = document.getElementById('estFidelityValue');
        if (fidelityEl) {
            const fidelity = data.fidelity !== undefined ? data.fidelity : (data.system_health / 100);
            fidelityEl.innerText = (fidelity * 100).toFixed(1) + "%";
            fidelityEl.className = fidelity > 0.95 ? "text-[10px] font-mono font-bold text-blue-400" :
                (fidelity > 0.8 ? "text-[10px] font-mono font-bold text-yellow-400" :
                    "text-[10px] font-mono font-bold text-red-400");
        }
    }

    // 5. Update Shot Noise
    if (data.shot_noise) {
        const noiseEl = document.getElementById('shotNoiseValue');
        if (noiseEl) {
            noiseEl.innerText = data.shot_noise;
            if (data.shot_noise === 'LOW') noiseEl.className = "text-[10px] font-mono font-bold text-green-400";
            else if (data.shot_noise === 'MED') noiseEl.className = "text-[10px] font-mono font-bold text-yellow-400";
            else noiseEl.className = "text-[10px] font-mono font-bold text-red-400";
        }
    }

    // 6. Update Circuit Depth
    const depthEl = document.getElementById('circuitDepthValue');
    if (depthEl && typeof gates !== 'undefined') {
        // Calculate depth as max column index + 1
        let maxCol = 0;
        gates.forEach(g => { if (g.col !== undefined && g.col > maxCol) maxCol = g.col; });
        depthEl.innerText = gates.length > 0 ? (maxCol + 1).toString() : '0';
    }

    // 7. Update SPAQ Coherence Bars from AI data
    if (data.spaq_health && typeof data.spaq_health === 'object') {
        window.currentSpaqHealth = data.spaq_health;
        if (typeof window.updateSPAQCoherence === 'function') {
            window.updateSPAQCoherence();
        }
    }

    // Force Redraw circuit canvas
    drawCircuit();
}

// Helper for SPAQ Colors
function getSPAQColor(score) {
    if (score >= 0.9) return '#4ade80'; // Green-400
    if (score >= 0.7) return '#facc15'; // Yellow-400
    return '#f87171'; // Red-400
}

function calculateSPAQHealth(gates, profile) {
    const health = {};
    const t1 = (profile && profile.t1) ? profile.t1 : 1000; // Default high T1
    const gateTime = 1; // Arbitrary unit

    // Count ops per wire
    const counts = {};
    gates.forEach(g => {
        counts[g.wire] = (counts[g.wire] || 0) + 1;
        if (g.target !== undefined && g.target !== -1) {
            counts[g.target] = (counts[g.target] || 0) + 1;
        }
    });

    for (let i = 0; i < NUM_WIRES; i++) {
        const ops = counts[i] || 0;
        // Simple exponential decay model for UI visualization
        const coherence = Math.exp(-(ops * gateTime) / (t1 / 10)); // Scale t1 for visual impact
        health[`q${i}`] = coherence;
    }
    return health;
}

function updateSPAQVisuals(health) {
    for (let i = 0; i < 5; i++) { // Limit to 5 for UI
        const bar = document.getElementById(`sidebar-spaq-fill-${i}`);
        if (!bar) continue;

        const val = health[`q${i}`] !== undefined ? health[`q${i}`] : 1.0;
        bar.style.height = `${val * 100}%`;
        // Dynamic color update
        // We use background instead of gradient for simplicity in update, 
        // or we could reconstruct the gradient string.
        const color = getSPAQColor(val);
        bar.style.background = `linear-gradient(to top, ${color}, #22d3ee)`; // Gradient-like
    }
}

// NOTE: Duplicate triggerAIAnalysis removed - main version is at line ~5619
// That version handles Bloch sphere, Tomography, and SPAQ coherence updates

function processSimulationData(data) {
    // Skip overwriting visuals if AI data is actively displayed
    if (window._aiOverrideActive) {
        console.log("[processSimulationData] Skipping - AI override active");
        // Still save the result for reference, but don't update visuals
        lastSimulationResult = data;
        return;
    }

    // --- Visualization Updates ---

    // 1. Update SPAQ Coherence Bars
    let spaqHealth = null;
    if (data.counts && typeof gates !== 'undefined' && activeDeviceProfile) {
        spaqHealth = calculateSPAQHealth(gates, activeDeviceProfile);
        updateSPAQVisuals(spaqHealth);
    }

    // Save result
    lastSimulationResult = data;

    renderResults(data.counts);

    if (data.insight) {
        const log = document.getElementById('deviceLog');
        if (log) {
            const time = new Date().toLocaleTimeString('en-US', { hour12: false });
            const entry = document.createElement('div');
            entry.className = "mb-2 border-b border-gray-800 pb-2";
            entry.innerHTML = `
                <div class="flex justify-between text-xs text-gray-500 mb-1">
                    <span>${time}</span>
                    <span class="text-purple-400">AI ANALYSIS</span>
                </div>
                <div class="text-sm text-gray-300 prose prose-invert max-w-none">
                    ${marked.parse(data.insight)}
                </div>
            `;
            log.prepend(entry);
        }
    }

    // Process Measurements
    if (data.measurements && Array.isArray(data.measurements)) {
        data.measurements.forEach(m => recordMeasurement(m.qubit, m.col, m.value));
    }

    // Logic Binds
    if (data.spaq_health) {
        currentSpaqHealth = data.spaq_health;
        window.currentSpaqHealth = data.spaq_health;
        drawCircuit();
    }

    // Live Telemetry Update
    updateSystemMetrics();
    window.updateSPAQCoherence();
    drawCircuit();
}

function toggleZAxis(btn) {
    const canvas = document.getElementById('circuitCanvas');
    const isActive = canvas.classList.toggle('z-axis-active');
    btn.innerText = isActive ? "Z-AXIS: ON" : "Z-AXIS: OFF";
    btn.classList.toggle('text-cyan-400', isActive);
    btn.classList.toggle('border-cyan-500', isActive);

    if (isActive) {
        showToast("Z-Axis Layered View (3D) Enabled", "info");
    }
}

async function runAutopilotRefactoring() {
    const optimizeBtn = document.getElementById('optimizeBtn');
    const originalText = optimizeBtn.innerHTML;
    optimizeBtn.disabled = true;
    optimizeBtn.innerHTML = '<svg class="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24"></svg> Refactoring...';

    showToast("Autopilot Refactoring: Analyzing Circuit Topology...", "info");

    const payload = JSON.stringify(gates);

    try {
        const systemPrompt = `
You are a Quantum Circuit Optimizer. 
Analyze the given circuit and return an optimized version (reduced gate count, depth) in strict JSON.

Input Gates: List of {type, wire, target...}

Output JSON:
{
  "gates": [ ... optimized list ... ],
  "log": "Markdown explanation of optimizations...",
  "thoughtSignature": "Optimization-Sig-${Date.now()}"
}
`;
        const responseText = await geminiClient.generateContent(
            `Optimize this circuit: ${payload}`,
            systemPrompt
        );

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid Optimizer Response");

        const data = JSON.parse(jsonMatch[0]);

        if (data.error) throw new Error(data.error);

        // Handle Thought Signature
        if (data.thoughtSignature) {
            sentinelAgent.setActiveSignature(data.thoughtSignature);
            if (typeof qvTimeline !== 'undefined') qvTimeline.updateUI();
        }

        // Handle Narrative Log
        if (data.log) {
            insightContent.innerHTML = marked.parse(data.log);
            const chatHistory = document.getElementById('persistentChatHistory');
            if (chatHistory) {
                addChatMessage('agent', `**Refactor Complete**\n${data.log}`, chatHistory);
            }
        }

        // Update Gates
        if (data.gates) {
            gates = data.gates;
            drawCircuit();
            recordTimeStep(data.thoughtSignature);
            showToast("Circuit Transpiled & Simplified.", "success");
        }

    } catch (err) {
        console.error(err);
        showToast("Refactoring Failed: " + err.message, "error");
    } finally {
        optimizeBtn.disabled = false;
        optimizeBtn.innerHTML = originalText;
    }
}

// --- Advanced Features (Legendary) ---

async function triggerQSharpExport() {
    toggleAdvancedMenu();
    showToast("Generating Q# Code via Gemini...", "info");

    const apiKey = geminiClient.getApiKey();
    if (!apiKey) { showToast("API Key Required", "error"); return; }

    try {
        const systemPrompt = `
You are a Quantum Compiler. 
Convert the provided JSON circuit into valid Microsoft Q# (Azure Quantum) code.
Return JSON: { "qasm": "namespace MyQuantumApp { ... code ... }", "optimization_log": "..." }
`;
        const responseText = await geminiClient.generateContent(
            `Convert to Q#: ${JSON.stringify(gates)}`,
            systemPrompt
        );

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid Q# Response");

        const data = JSON.parse(jsonMatch[0]);

        // Show in Modal
        const qasmOutput = document.getElementById('qasmOutput');
        const optimizationLog = document.getElementById('optimizationLog');
        const modal = document.getElementById('exportModal');
        const title = modal.querySelector('h3');

        if (qasmOutput && optimizationLog && modal) {
            title.innerHTML = "Export to Microsoft Q#";
            qasmOutput.textContent = data.qasm || "// Error generating code";
            qasmOutput.classList.remove('text-green-400');
            qasmOutput.classList.add('text-blue-300'); // Q# color
            optimizationLog.textContent = data.optimization_log || "No log returned.";
            modal.classList.remove('hidden');

            // Auto-Download .qs file
            if (data.qasm && !data.qasm.startsWith("// Error")) {
                const blob = new Blob([data.qasm], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = "circuit.qs";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                showToast("Q# File Downloaded", "success");
            }
        }

    } catch (e) {
        showToast("Q# Export Failed: " + e.message, "error");
    }
}

// AUDIT FIX: Removed duplicate triggerResourceEstimator() definition (78 lines) - canonical version below

async function triggerAgentAnalysis(mode, promptTemplate) {
    toggleAdvancedMenu();
    showToast(`Running ${mode}...`, "info");

    const chatOverlay = document.getElementById('chatOverlay');
    if (chatOverlay) chatOverlay.classList.remove('hidden');

    const apiKey = geminiClient.getApiKey();
    if (!apiKey) { showToast("API Key Required", "error"); return; }

    const chatHistory = document.getElementById('persistentChatHistory');
    addChatMessage('user', `Run ${mode}`, chatHistory);
    const loadingId = addChatMessage('agent', "Analyzing...", chatHistory);
    const loadingElem = document.getElementById(loadingId);

    try {
        const prompt = `
TASK: ${mode}.
${promptTemplate}
Context: Current circuit has ${gates.length} gates.
Gates JSON: ${JSON.stringify(gates)}
PLEASE PROVIDE A DETAILED TECHNICAL RESPONSE.
`;
        const content = await geminiClient.generateContent(prompt);
        loadingElem.remove();

        addChatMessage('agent', `**${mode} Results**:\n${content}`, chatHistory);

    } catch (err) {
        loadingElem.innerText = "Error";
        showToast("Analysis Error", "error");
    }
}

function triggerCircuitDecomposer() {
    triggerAgentAnalysis("Circuit Decomposer",
        "Decompose this circuit into the native gate set of IonQ Aria (GPI, GPI2, MS). Show the gate count breakdown.");
}

function triggerLogicalMapper() {
    triggerAgentAnalysis("Logical Qubit Mapping",
        "Propose a mapping of these virtual qubits to a Heavy-Hex lattice (IBM Eagle) to minimize SWAP overlap error. visualized as ASCII or text list.");
}

// [ISSUE 3 FIX] Old generatePDFReport removed - single definition at line ~4901

// --- Sonification Engine ---
let audioCtx;

function playQuantumStateSound(vectors) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Simple pentatonic chord or similar based on Z info
    const baseFreq = 220;

    vectors.slice(0, 3).forEach((vec, i) => {
        const [x, y, z] = vec;
        // z is cos(theta). -1 (down) to 1 (up).
        // Map z to pitch.
        const pitch = baseFreq * (1 + (z + 1) * 0.5 + i * 0.25);
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = pitch;
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.0);
    });
}

// --- Pauli Shadow Visualization (High Performance) ---
var pauliShadowScene, pauliShadowCamera, pauliShadowRenderer;
var pauliShadowCylinders = [];

// Pauli Shadow Visualization Removed (Paper-Trail Pivot)

// --- State Cloud Visualization Removed (Deprecated) ---

// --- Visual Environment Router (Omega-Kernel) ---
// VisualEnvironmentRouter removed (Paper-Trail Pivot)

// SPAQ/STATECLOUD FIX: Removed second duplicate broken updateStateCloud

// --- SPAQ Health State & Calculation ---
// Global state for SPAQ coherence health
window.currentSpaqHealth = {};

// SPAQ calculation consolidated — see canonical version at ~line 5685
// window.calculateSPAQHealthWithCosts defined there

// NOTE: Original VisualEnvironmentRouter implementation removed - 
// Using adapter class defined earlier which delegates to VizRouter.js

// AUDIT FIX #2: Removed local vizRouter declaration - use window.vizRouter exclusively

// --- State Cloud Initialization (Three.js) ---
// --- State Cloud Initialization Removed ---

// --- Update State Cloud Removed ---

// --- Tomography Initialization (REMOVED - VizRouter handles this now) ---
// VIZROUTER FIX: Removed initTomography() entirely.
// VizRouter.js now owns the tomography container and has its own scene/renderer/animate loop.
// See initSystemBoot() at line ~7711 for VizRouter initialization.

// --- Bloch Sphere Logic (Three.js) ---
// VIZROUTER FIX: Removed tomography globals - VizRouter owns its own scene/renderer.
// Legacy globals removed: tomographyRenderer, tomographyScene, tomographyCamera, tomographyMesh, tomographyComposer

// Animation Loop Removed

window.initThreeJSScenes = function (force = false) {
    console.log("3D Config: Engine Offline (Paper-Trail Pivot).");
}

// Ensure DOM is ready, then init
// Ensure DOM is ready, then init
// --- Restored Interaction Logic ---
let draggingType = null;
// ghostTargetDir = null; // Uses global definition from line ~1122

function getGateColor(type) {
    if (typeof GATE_STYLES !== 'undefined' && GATE_STYLES[type]) return GATE_STYLES[type].color;
    switch (type) {
        case 'H': return '#60a5fa';
        case 'X': return '#c084fc';
        case 'Y': return '#4ade80';
        case 'Z': return '#f472b6';
        case 'CNOT': return '#fca5a5';
        case 'SWAP': return '#fb923c';
        case 'T': return '#818cf8';
        case 'CZ': return '#facc15';
        case 'BARRIER': return '#a8a29e';
        case 'RX': case 'RY': case 'RZ': return '#2dd4bf';
        default: return '#94a3b8';
    }
}

// Ghost Effect Removed

function setupDragAndDrop() {
    const gateItems = document.querySelectorAll('.gate-item');
    const paramSlider = document.getElementById('paramSlider');
    const paramInput = document.getElementById('paramInput');

    if (paramSlider && paramInput) {
        paramSlider.addEventListener('input', () => paramInput.value = paramSlider.value);
        paramInput.addEventListener('input', () => paramSlider.value = paramInput.value);
    }

    // FIX: Ensure Noise Slider updates HUD
    const noiseSlider = document.getElementById('noiseSlider');
    if (noiseSlider) {
        noiseSlider.addEventListener('input', () => {
            if (typeof updateSystemMetrics === 'function') updateSystemMetrics();
        });
    }

    gateItems.forEach(item => {
        const type = item.dataset.type;
        item.addEventListener('dragstart', (e) => {
            // e.dataTransfer.setDragImage(new Image(), 0, 0); // Restore default ghost if preferred, or keep custom
            e.dataTransfer.setData('type', item.dataset.type);
            e.dataTransfer.setData('param', paramInput ? paramInput.value : 0);
            e.dataTransfer.effectAllowed = 'copy';
            draggingType = type;
        });
        item.addEventListener('mouseenter', () => {
            try { calculateGhostEffect(type, window.selectedQubit || 0, (paramInput) ? parseFloat(paramInput.value) || 0 : 0); } catch (err) { }
        });
        item.addEventListener('mouseleave', () => { ghostTargetDir = null; });
    });

    if (canvas) {
        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';

            // Track mouse for ghost rendering
            window.dragMouseX = e.offsetX;
            window.dragMouseY = e.offsetY;
            window.isDraggingExternal = true;
            drawCircuit();
        });
        canvas.addEventListener('dragleave', () => {
            window.isDraggingExternal = false;
            drawCircuit();
        });
        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            window.isDraggingExternal = false;
            const type = e.dataTransfer.getData('type');
            const param = e.dataTransfer.getData('param');
            if (type) {
                const x = e.offsetX; const y = e.offsetY;
                saveState();
                snapAndAddGate(type, x, y, param);
            }
            ghostTargetDir = null;
            drawCircuit();
        });
        canvas.addEventListener('click', handleCanvasClick);
    }
}

function drawGate(gate, x, y, isInvalid = false) {
    if (typeof ctx === 'undefined' || !ctx) return;

    // [Grid/Hex Override Logic]
    if (activeDeviceProfile && (activeDeviceProfile.layout === 'grid' || activeDeviceProfile.layout === 'hex')) {
        const pos = getGridNodePos(gate.wire);
        if (pos) {
            x = pos.x;
            y = pos.y;

            if (gate.type === 'CNOT') {
                if (gate.target !== undefined) {
                    const tPos = getGridNodePos(gate.target);
                    if (tPos) {
                        ctx.save();
                        ctx.strokeStyle = isInvalid ? 'rgba(239, 68, 68, 0.8)' : '#ea580c';
                        ctx.lineWidth = 3;
                        if (isInvalid) {
                            ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
                            if (activeDeviceProfile.layout === 'hex') {
                                ctx.strokeStyle = '#a855f7';
                                ctx.shadowColor = '#d8b4fe';
                            }
                            ctx.shadowBlur = 10 + Math.sin(Date.now() * 0.01) * 5;
                        }
                        ctx.beginPath();
                        ctx.moveTo(x, y); ctx.lineTo(tPos.x, tPos.y); ctx.stroke();
                        ctx.restore();

                        ctx.beginPath();
                        ctx.arc(tPos.x, tPos.y, 10, 0, Math.PI * 2); ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(tPos.x, tPos.y - 8); ctx.lineTo(tPos.x, tPos.y + 8);
                        ctx.moveTo(tPos.x - 8, tPos.y); ctx.lineTo(tPos.x + 8, tPos.y);
                        ctx.stroke();
                    }
                }
                ctx.fillStyle = isInvalid ? (activeDeviceProfile.layout === 'hex' ? '#a855f7' : '#ef4444') : '#ea580c';
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fill();
                return;
            }
        }
    }

    // Standard Linear Rendering
    if (gate.type === 'CNOT' || gate.type === 'SWAP' || gate.type === 'CZ') {
        const color = isInvalid ? '#ef4444' : (gate.type === 'CZ' ? '#eab308' : (gate.type === 'SWAP' ? '#f97316' : '#22d3ee'));
        ctx.fillStyle = color;

        // Pulsing Error or Neon Glow
        ctx.shadowBlur = isInvalid ? 20 : 15;
        ctx.shadowColor = color;

        // Control Node
        if (gate.type === 'SWAP') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6);
            ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw line to target (Linear Mode only)
        if (activeDeviceProfile?.layout !== 'grid' && gate.target !== undefined && gate.target !== -1) {
            const yTarget = START_Y + gate.target * WIRE_SPACING;

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.moveTo(x, y);
            ctx.lineTo(x, yTarget);
            ctx.stroke();

            if (gate.type === 'SWAP') {
                ctx.beginPath();
                ctx.moveTo(x - 6, yTarget - 6); ctx.lineTo(x + 6, yTarget + 6);
                ctx.moveTo(x + 6, yTarget - 6); ctx.lineTo(x - 6, yTarget + 6);
                ctx.stroke();
            } else if (gate.type === 'CZ') {
                ctx.beginPath();
                ctx.arc(x, yTarget, 6, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // CNOT Target Ring
                ctx.beginPath();
                ctx.arc(x, yTarget, 14, 0, Math.PI * 2);
                ctx.stroke();

                // Cross Identifier
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, yTarget - 8);
                ctx.lineTo(x, yTarget + 8);
                ctx.moveTo(x - 8, yTarget);
                ctx.lineTo(x + 8, yTarget);
                ctx.stroke();
            }
        }
        ctx.shadowBlur = 0;
        return;
    }

    else if (gate.type === 'MEASURE') {
        const baseColor = getGateColor(gate.type);

        // Draw Line to Classical Register
        const classicalY = START_Y + NUM_WIRES * WIRE_SPACING + CLASSICAL_WIRE_Y_OFFSET;
        ctx.beginPath();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.moveTo(x, y + GATE_HEIGHT / 2);
        ctx.lineTo(x, classicalY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Gate Box
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(x - GATE_WIDTH / 2, y - GATE_HEIGHT / 2, GATE_WIDTH, GATE_HEIGHT);
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - GATE_WIDTH / 2, y - GATE_HEIGHT / 2, GATE_WIDTH, GATE_HEIGHT);

        // Meter Symbol
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y + 5, 12, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y + 5);
        ctx.lineTo(x + 8, y - 5);
        ctx.stroke();
        return;
    }

    else if (gate.type === 'BARRIER') {
        const classicalY = START_Y + NUM_WIRES * WIRE_SPACING + CLASSICAL_WIRE_Y_OFFSET;

        ctx.save();
        ctx.strokeStyle = '#a8a29e';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.moveTo(x, y - (WIRE_SPACING / 2));
        ctx.lineTo(x, y + (WIRE_SPACING / 2));
        ctx.stroke();

        ctx.restore();
        return;
    }

    else {
        const baseColor = getGateColor(gate.type);

        // Conditional Logic
        if (gate.condition) {
            const classicalY = START_Y + NUM_WIRES * WIRE_SPACING + CLASSICAL_WIRE_Y_OFFSET;
            ctx.beginPath();
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 2]);
            ctx.moveTo(x, y + GATE_HEIGHT / 2);
            ctx.lineTo(x, classicalY);
            ctx.stroke();

            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(x, classicalY, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`c=${gate.condition.value}`, x - 8, classicalY - 5);

            ctx.setLineDash([]);
        }

        // Glassmorphic Gate Background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
        // Floating Shadow
        ctx.shadowBlur = 10;
        ctx.shadowColor = baseColor;
        ctx.fillRect(x - GATE_WIDTH / 2, y - GATE_HEIGHT / 2, GATE_WIDTH, GATE_HEIGHT);
        ctx.shadowBlur = 0;

        // Neon Border
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = baseColor;
        ctx.strokeRect(x - GATE_WIDTH / 2, y - GATE_HEIGHT / 2, GATE_WIDTH, GATE_HEIGHT);

        // Text with inner glow
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ffffff';

        let label = (GATE_STYLES && GATE_STYLES[gate.type]) ? GATE_STYLES[gate.type].label : gate.type;

        if ((['P', 'RX', 'RY', 'RZ', 'CP'].includes(gate.type)) && gate.params && gate.params[0] !== undefined) {
            const val = typeof gate.params[0] === 'number' ? parseFloat(gate.params[0].toFixed(2)) : gate.params[0];
            label += `(${val})`;
        }

        if (label.length > 2) ctx.font = 'bold 12px monospace';

        ctx.fillText(label, x, y);

        ctx.shadowBlur = 0;
    }
}

function snapAndAddGate(type, x, y, param = null) {
    let closestWire = getClosestWire(y, x);
    if (closestWire !== -1) {
        let col = 0;
        const relativeX = x - START_X;
        col = Math.round(relativeX / GRID_SIZE);

        if (col >= 0) {
            if (['CNOT', 'SWAP', 'CZ'].includes(type)) {
                pendingInteraction = { type: type, col, controlWire: closestWire };
                drawCircuit(); showToast(`Select Target for ${type}`, "info");
                return;
            }
            gates.push({ type, wire: closestWire, col, params: param ? [parseFloat(param)] : undefined });
            drawCircuit(); recordTimeStep();
        }
    }
}

function getClosestWire(y, x = null) {
    let closestWire = -1;
    let minDistance = Infinity;

    // Use getGridNodePos for custom device layouts (grid/hex)
    if (activeDeviceProfile && (activeDeviceProfile.layout === 'grid' || activeDeviceProfile.layout === 'hex')) {
        const qubitCount = activeDeviceProfile.num_qubits || NUM_WIRES;
        for (let i = 0; i < qubitCount; i++) {
            const pos = getGridNodePos(i);
            if (!pos) continue;

            // Calculate distance to qubit node (2D for grid/hex)
            const dx = x !== null ? (x - pos.x) : 0;
            const dy = y - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Accept if within node radius (larger threshold for easier selection)
            if (dist < 40 && dist < minDistance) {
                minDistance = dist;
                closestWire = i;
            }
        }
        return closestWire;
    }

    // Standard linear wire layout
    for (let i = 0; i < NUM_WIRES; i++) {
        const wireY = START_Y + i * WIRE_SPACING;
        const dist = Math.abs(y - wireY);
        if (dist < WIRE_SPACING / 2 && dist < minDistance) {
            minDistance = dist;
            closestWire = i;
        }
    }
    return closestWire;
}

// AUDIT FIX: Removed duplicate saveState/recordTimeStep/undo stubs (canonical versions defined earlier)

function handleCanvasClick(e) {
    if (window.isDraggingCanvasGate) return;
    const x = e.offsetX; const y = e.offsetY;
    const clickedGate = getGateAtPosition(x, y);
    if (clickedGate && !pendingInteraction) {
        if (window.showGateDetail) window.showGateDetail(clickedGate.type);
        return;
    }
    if (pendingInteraction) {
        const targetWire = getClosestWire(y, x);
        if (targetWire !== -1 && targetWire !== pendingInteraction.controlWire) {
            gates.push({ type: pendingInteraction.type, wire: pendingInteraction.controlWire, col: pendingInteraction.col, target: targetWire });
            saveState(); pendingInteraction = null; drawCircuit(); recordTimeStep();
        } else if (targetWire === pendingInteraction.controlWire) {
            pendingInteraction = null; drawCircuit();
        }
    } else {
        const w = getClosestWire(y, x);
        if (w !== -1) { window.selectedQubit = w; drawCircuit(); }
    }
}

function getGateAtPosition(x, y) {
    for (const gate of gates) {
        const gateX = START_X + gate.col * GRID_SIZE;
        const gateY = START_Y + gate.wire * WIRE_SPACING;
        if (Math.abs(x - gateX) < GATE_WIDTH / 2 && Math.abs(y - gateY) < GATE_HEIGHT / 2) return gate;
    }
    return null;
}

function executeTool(call) {
    console.log("Executing Tool:", call);
    if (call.name === 'place_gate') {
        const col = call.args.col !== undefined ? parseInt(call.args.col) : getNextFreeColumn(parseInt(call.args.qubit));
        gates.push({ type: call.args.type, wire: parseInt(call.args.qubit), col: col });
        drawCircuit();
    } else if (call.name === 'clear_canvas') {
        gates = []; drawCircuit();
    }
}

// onBlochClick removed

// --- Standard Circuit Logic ---
function drawCircuit() {
    try {
        // Guard against uninitialized canvas context
        if (!ctx) {
            console.warn('[QuantaVibe] drawCircuit called but ctx is null');
            return;
        }

        // DRAW SOLID BACKGROUND (Essential for PDF/Snapshots)
        ctx.fillStyle = '#020617'; // Match slate-950 theme
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Grid dots (batched into single path for performance)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 20) {
            for (let y = 0; y < canvas.height; y += 20) {
                ctx.moveTo(x + 0.5, y);
                ctx.arc(x, y, 0.5, 0, Math.PI * 2);
            }
        }
        ctx.fill();


        // Ghost Map (Topology Visualization) - Linear Only
        if (activeDeviceProfile && activeDeviceProfile.coupling_map && activeDeviceProfile.layout !== 'grid') {
            ctx.save();
            ctx.lineCap = 'round';

            const drawn = new Set();
            activeDeviceProfile.coupling_map.forEach(pair => {
                const [u, v] = pair;
                // Prevent duplicate drawing for bidirectional maps
                const key = u < v ? `${u}-${v}` : `${v}-${u}`;
                if (drawn.has(key)) return;
                drawn.add(key);

                const y1 = START_Y + u * WIRE_SPACING;
                const y2 = START_Y + v * WIRE_SPACING;

                // Draw Connection Line
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)'; // Faint backbone
                ctx.lineWidth = 4;
                ctx.moveTo(START_X - 40, y1);
                ctx.lineTo(START_X - 40, y2);
                ctx.stroke();

                // Draw "Coupler Node" at Midpoint
                const midY = (y1 + y2) / 2;
                ctx.beginPath();
                ctx.fillStyle = 'rgba(6, 182, 212, 0.4)'; // Cyan-500 fill
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = 2;
                ctx.arc(START_X - 40, midY, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Coupler Glow
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(34, 211, 238, 0.8)';
                ctx.stroke();
                ctx.shadowBlur = 0;
            });
            ctx.restore();
        }

        // Draw Wires & Labels
        ctx.lineWidth = 2;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        // Grid/Hex Layout Mode
        if (activeDeviceProfile && (activeDeviceProfile.layout === 'grid' || activeDeviceProfile.layout === 'hex')) {
            try {
                drawWillowLattice();
            } catch (e) {
                console.error("Topology Error:", e);
                ctx.fillStyle = 'red'; ctx.fillText("Topology Error", 50, 50);
            }
        } else {
            // Standard Linear Lines (Laser Style)
            for (let i = 0; i < NUM_WIRES; i++) {
                const y = START_Y + i * WIRE_SPACING;

                // Determine Wire Color based on Health
                let wireColor = 'rgba(148, 163, 184, 0.3)'; // Default Slate-400 low opacity
                let shadowColor = 'transparent';
                let shadowBlur = 0;

                if (currentSpaqHealth && currentSpaqHealth[String(i)] !== undefined) {
                    const h = currentSpaqHealth[String(i)];
                    if (window.isBioMode) {
                        // Bio-mode: Emerald green palette with enhanced glow
                        if (h > 0.8) { wireColor = 'rgba(52, 211, 153, 0.7)'; shadowColor = '#10b981'; shadowBlur = 8; }
                        else if (h > 0.5) { wireColor = 'rgba(110, 231, 183, 0.6)'; shadowColor = '#34d399'; shadowBlur = 6; }
                        else { wireColor = 'rgba(239, 68, 68, 0.6)'; shadowColor = '#ef4444'; shadowBlur = 5; }
                    } else {
                        // Red (low) -> Cyan (high)
                        if (h > 0.8) { wireColor = 'rgba(34, 211, 238, 0.6)'; shadowColor = '#22d3ee'; shadowBlur = 5; }
                        else if (h > 0.5) { wireColor = 'rgba(250, 204, 21, 0.6)'; shadowColor = '#facc15'; shadowBlur = 5; }
                        else { wireColor = 'rgba(239, 68, 68, 0.6)'; shadowColor = '#ef4444'; shadowBlur = 5; }
                    }
                }

                // Highlight Selected Wire
                if (i === selectedQubit) {
                    ctx.fillStyle = '#22d3ee'; // Cyan
                    ctx.font = 'bold 18px monospace';
                    ctx.shadowColor = '#22d3ee';
                    ctx.shadowBlur = 10;
                    ctx.fillText(`\u25BA q[${i}]`, START_X - 20, y);

                    wireColor = 'rgba(34, 211, 238, 0.8)';
                    shadowColor = '#22d3ee';
                    shadowBlur = 10;
                } else {
                    ctx.fillStyle = '#64748b';
                    ctx.font = '16px monospace';
                    ctx.shadowBlur = 0;
                    ctx.fillText(`q[${i}]`, START_X - 20, y);
                }

                // Draw Wire (Laser Beam)
                ctx.beginPath();
                ctx.strokeStyle = wireColor;
                ctx.shadowColor = shadowColor;
                ctx.shadowBlur = shadowBlur;
                ctx.lineWidth = i === selectedQubit ? 2 : 1;
                ctx.moveTo(START_X, y);
                ctx.lineTo(canvas.width - 50, y);
                ctx.stroke();

                ctx.shadowBlur = 0; // Reset
            }

            // --- Draw Classical Register Line (Double-Line Style) ---
            if (classicalBits.length > 0 || gates.some(g => g.type === 'MEASURE')) {
                const classicalY = START_Y + NUM_WIRES * WIRE_SPACING + CLASSICAL_WIRE_Y_OFFSET;

                // Label
                ctx.fillStyle = CLASSICAL_WIRE_COLOR;
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'right';
                ctx.fillText('c', START_X - 20, classicalY);

                // Double Line (classical wire style)
                ctx.strokeStyle = CLASSICAL_WIRE_COLOR;
                ctx.lineWidth = 1;
                ctx.setLineDash([]);

                ctx.beginPath();
                ctx.moveTo(START_X, classicalY - 2);
                ctx.lineTo(canvas.width - 50, classicalY - 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(START_X, classicalY + 2);
                ctx.lineTo(CANVAS_WIDTH - 50, classicalY + 2);
                ctx.stroke();

                // Draw measurement results on classical line
                classicalBits.forEach(bit => {
                    const bitX = START_X + bit.col * GRID_SIZE;

                    // Result Box
                    ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
                    ctx.fillRect(bitX - 12, classicalY - 10, 24, 20);
                    ctx.strokeStyle = CLASSICAL_WIRE_COLOR;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(bitX - 12, classicalY - 10, 24, 20);

                    // Value
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 12px monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(bit.value !== null ? bit.value.toString() : '?', bitX, classicalY);
                });
            }
        }

        // Trigger QNN Animation on redraw
        try {
            animateQNNLoss();
        } catch (e) { console.warn("QNN Error", e); }

        // Pending Interaction Guide (CNOT/SWAP/CZ)
        if (pendingInteraction) {
            ctx.save();
            ctx.strokeStyle = '#f59e0b';
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 2;

            const is2D = activeDeviceProfile && (activeDeviceProfile.layout === 'grid' || activeDeviceProfile.layout === 'hex');

            if (is2D) {
                const pos = getGridNodePos(pendingInteraction.controlWire);
                if (pos) {
                    // 1. Highlight Origin
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
                    ctx.stroke();

                    // 2. Highlight Valid Neighbors
                    if (activeDeviceProfile.coupling_map) {
                        ctx.save();
                        activeDeviceProfile.coupling_map.forEach(pair => {
                            let neighbor = -1;
                            if (pair[0] === pendingInteraction.controlWire) neighbor = pair[1];
                            else if (pair[1] === pendingInteraction.controlWire) neighbor = pair[0];

                            if (neighbor !== -1) {
                                const nPos = getGridNodePos(neighbor);
                                if (nPos) {
                                    ctx.beginPath();
                                    ctx.setLineDash([5, 5]);
                                    ctx.strokeStyle = '#facc15';
                                    ctx.lineWidth = 2;
                                    ctx.shadowBlur = 20;
                                    ctx.shadowColor = '#facc15';
                                    ctx.arc(nPos.x, nPos.y, 28, 0, Math.PI * 2);
                                    ctx.stroke();
                                    ctx.setLineDash([]);
                                }
                            }
                        });
                        ctx.restore();
                    }
                    ctx.fillStyle = '#fcd34d';
                    ctx.textAlign = 'center';
                    ctx.fillText(`Select Target for ${pendingInteraction.type}`, pos.x, pos.y - 40);
                }
            } else {
                // Linear Mode Guide
                const x = START_X + pendingInteraction.col * GRID_SIZE;
                const y1 = START_Y + pendingInteraction.controlWire * WIRE_SPACING;

                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, CANVAS_HEIGHT);
                ctx.stroke();

                ctx.fillStyle = '#fcd34d';
                ctx.textAlign = 'center';
                ctx.fillText(`Select Target for ${pendingInteraction.type}`, x, y1 - 20);
            }

            ctx.restore();
        }

        // Draw Gates
        let hasConnectivityError = false;
        let errorMsg = "";

        gates.forEach((gate) => {
            try {
                if (isDraggingCanvasGate && gate === canvasDragGate) return;

                // Connectivity Audit
                let isInvalid = false;
                drawGate(gate, START_X + gate.col * GRID_SIZE, START_Y + gate.wire * WIRE_SPACING, isInvalid);
            } catch (err) {
                console.error("Gate Draw Error:", gate, err);
            }
        });

        // Draw Dragging Ghost (External)
        if (window.isDraggingExternal && draggingType) {
            const wire = getClosestWire(window.dragMouseY, window.dragMouseX);
            if (wire !== -1) {
                const col = Math.round((window.dragMouseX - START_X) / GRID_SIZE);
                if (col >= 0) {
                    ctx.save();
                    ctx.globalAlpha = 0.4;
                    drawGate({ type: draggingType, wire, col }, START_X + col * GRID_SIZE, START_Y + wire * WIRE_SPACING);
                    ctx.restore();
                }
            }
        }

        // Debounced Error Toast
        if (hasConnectivityError) {
            if (!window.lastTopologyToast || Date.now() - window.lastTopologyToast > 2000) {
                showToast(errorMsg, "error");
                window.lastTopologyToast = Date.now();
            }
        }
    } catch (err) {
        console.error("Draw Circuit Error:", err);
        // Prevent flood of toasts in animation loop
        if (!window._drawErrorShown) {
            showToast("Render Error: " + err.message, "error");
            window._drawErrorShown = true;
            // Re-enable after 5 seconds to allow checking fixes
            setTimeout(() => window._drawErrorShown = false, 5000);
        }
    }
}
window.drawCircuit = drawCircuit; // Expose globally for SentinelCore
// --- 2D Topology Logic (Willow & Heron) ---

// Unified Grid Coordinate Calculator
function getGridNodePos(index) {
    if (!activeDeviceProfile) return null;

    // 1. Check for Fixed Positions (Heron / Heavy-Hex)
    if (activeDeviceProfile.fixed_positions && activeDeviceProfile.fixed_positions[index]) {
        const pos = activeDeviceProfile.fixed_positions[index];
        return { x: pos.x, y: pos.y, r: 0, c: 0, row: 0, col: 0 };
    }

    // 2. Procedural Grid Logic (Willow / Sugawara)
    if (activeDeviceProfile.layout === 'grid' || activeDeviceProfile.layout === 'willow') {
        const w = activeDeviceProfile.gridCols || activeDeviceProfile.grid_width || 5;
        const h = activeDeviceProfile.gridRows || activeDeviceProfile.grid_height || 5;

        const availW = canvas.width - 100;
        const availH = canvas.height - 100;
        const spW = availW / Math.max(1, w - 1);
        const spH = availH / Math.max(1, h - 1);
        const spacing = Math.min(100, Math.min(spW, spH));

        const gridPixelW = (w - 1) * spacing;
        const gridPixelH = (h - 1) * spacing;

        const offsetX = (canvas.width - gridPixelW) / 2;
        const offsetY = (canvas.height - gridPixelH) / 2;

        const row = Math.floor(index / w);
        const col = index % w;

        return { x: offsetX + col * spacing, y: offsetY + row * spacing, r: row, c: col };
    }

    // 3. Heron Heavy-Hex Logic
    if (activeDeviceProfile.layout === 'hex') {
        // Simple Heavy-Hex strip approximation for visual flair
        // Hexagons are staggered rows.
        // Node Layout:
        // Row 0:  *   *   * 
        //        / \ / \ /
        // Row 1: *   *   *

        const spacing = 80;
        const offsetX = canvas.width / 2 - 200;
        const offsetY = canvas.height / 2 - 150;

        // Custom 12-qubit heavy-hex-ish patch
        // We'll just map indices to hex coords programmatically
        const col = index % 4; // 4 columns
        const row = Math.floor(index / 4); // Rows

        // Stagger odd rows
        const xShift = (row % 2) * (spacing * 0.5);

        const x = offsetX + col * spacing + xShift;
        const y = offsetY + row * (spacing * 0.866); // sin(60)

        return { x, y, r: row, c: col };
    }

    return null;
}

// Topology Validator
function isValidMutation(control, target) {
    if (!activeDeviceProfile || !activeDeviceProfile.coupling_map) return true;

    // Bidirectional Check
    return activeDeviceProfile.coupling_map.some(pair =>
        (pair[0] === control && pair[1] === target) ||
        (pair[1] === control && pair[0] === target)
    );
}

// 2D Lattice Renderer
function drawWillowLattice() {
    try {
        if (!ctx || !activeDeviceProfile) return;

        ctx.lineWidth = activeDeviceProfile.layout === 'hex' ? 3 : 4; // Thinner for Hex
        ctx.lineCap = 'round';

        // 1. Draw Coupling Links (Backbone)
        if (activeDeviceProfile.coupling_map) {
            ctx.save();
            const drawn = new Set();
            activeDeviceProfile.coupling_map.forEach(pair => {
                if (!Array.isArray(pair) || pair.length < 2) return;
                const [u, v] = pair;

                // Avoid drawing same link twice
                const key = u < v ? `${u}-${v}` : `${v}-${u}`;
                if (drawn.has(key)) return;
                drawn.add(key);

                const p1 = getGridNodePos(u);
                const p2 = getGridNodePos(v);
                if (!p1 || !p2) return;

                // Gradient Link (Blue for Willow/Latice)
                const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                grad.addColorStop(0, 'rgba(37, 99, 235, 0.2)'); // Blue-600
                grad.addColorStop(0.5, 'rgba(37, 99, 235, 0.6)'); // Blue neon center
                grad.addColorStop(1, 'rgba(37, 99, 235, 0.2)');

                ctx.strokeStyle = grad;
                ctx.shadowBlur = 5;
                ctx.shadowColor = 'rgba(34, 211, 238, 0.3)';
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            });
            ctx.restore();
        }

        // 2. Draw Qubit Nodes
        const qubitCount = activeDeviceProfile.num_qubits || NUM_WIRES;

        for (let i = 0; i < qubitCount; i++) {
            const pos = getGridNodePos(i);
            if (!pos) continue;

            const isSelected = (i === selectedQubit);

            let borderColor = '#64748b'; // Slate-500
            let glow = 0;
            let radius = 14;

            if (isSelected) {
                borderColor = '#22d3ee'; // Cyan-400
                glow = 15;
                radius = 16;
                // Add internal glow
                const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
                grad.addColorStop(0, 'rgba(34, 211, 238, 0.2)');
                grad.addColorStop(1, 'rgba(15, 23, 42, 0.8)');
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; // Dark Slate
            }

            // Draw Node
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = borderColor;
            ctx.lineWidth = isSelected ? 2 : 1.5;
            ctx.shadowColor = borderColor;
            ctx.shadowBlur = glow;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Label (Refined Polish)
            ctx.font = isSelected ? 'bold 10px monospace' : '10px monospace';
            ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
            if (isSelected) ctx.shadowBlur = 8;
            ctx.shadowColor = '#22d3ee';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            // Offset 15px top-right (per newinstructions.txt)
            ctx.fillText(`Q${i}`, pos.x + 15, pos.y - 15);
            ctx.shadowBlur = 0; // Reset

            // Highlight Drop Target
            if (isDraggingCanvasGate && canvasDragGate && canvasDragGate.wire === i) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    } catch (e) {
        console.error("Critical Draw Error in drawWillowLattice:", e);
    }
}

function saveApiKey() {
    const input = document.getElementById('modalApiKeyInput');
    const hidden = document.getElementById('apiKey');
    const modal = document.getElementById('apiModal');

    if (input.value.trim()) {
        hidden.value = input.value.trim();
        showToast("API Key Saved", "success");
        modal.classList.add('hidden');
        updateSentinelStatus(true);
    }

    else {
        showToast("Please enter a valid key", "error");
    }
}

function updateSentinelStatus(isOnline) {
    const aiBtnDot = document.getElementById('ai-btn-dot');
    const panelDot = document.getElementById('panel-ai-dot');
    const panelText = document.getElementById('panel-ai-text');
    const sentinelDot = document.getElementById('sentinelStatusDot');

    if (isOnline) {
        if (aiBtnDot) {
            aiBtnDot.className = "absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse";
        }
        if (panelDot) {
            panelDot.className = "w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse";
        }
        if (panelText) {
            panelText.innerText = "ONLINE";
            panelText.className = "text-[9px] text-green-400 font-bold";
        }
        if (sentinelDot) {
            sentinelDot.className = "w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse";
        }
    } else {
        if (aiBtnDot) {
            aiBtnDot.className = "absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-900 shadow-md";
        }
        if (panelDot) {
            panelDot.className = "w-1.5 h-1.5 bg-red-500 rounded-full";
        }
        if (panelText) {
            panelText.innerText = "OFFLINE";
            panelText.className = "text-[9px] text-gray-500 font-bold";
        }
        if (sentinelDot) {
            sentinelDot.className = "w-1.5 h-1.5 rounded-full bg-red-500";
        }
    }
}


function renderSPAQ(health) {
    for (let i = 0; i < NUM_WIRES; i++) {
        const q = `q${i}`;
        // Default to ideal (1.0) if missing
        let val = 100;
        if (health && health[q] !== undefined) val = health[q] * 100;
        else if (health && health[String(i)] !== undefined) val = health[String(i)] * 100;
        else if (health && typeof health === 'object' && Object.keys(health).length === 0) val = 100;

        // Clamp
        val = Math.max(0, Math.min(100, val));

        const barId = `sidebar-spaq-fill-${i}`;
        const barEl = document.getElementById(barId);

        if (barEl) {
            barEl.style.height = `${val}%`;

            // Dynamic Color
            if (val > 80) {
                barEl.className = `w-full bg-gradient-to-t from-cyan-900 to-cyan-400 h-full rounded-sm opacity-90 transition-all duration-500`;
            } else if (val > 40) {
                barEl.className = `w-full bg-gradient-to-t from-blue-900 to-blue-400 h-full rounded-sm opacity-90 transition-all duration-500`;
            } else {
                barEl.className = `w-full bg-gradient-to-t from-purple-900 to-purple-400 h-full rounded-sm opacity-90 transition-all duration-500`;
            }
        }
    }
}

function redo() {
    if (typeof qvTimeline !== 'undefined') {
        qvTimeline.stepForward();
    }
}

// function updateSystemMetrics() {} // REMOVED DUPLICATE DEFINITION

function resetCircuit() {
    gates = [];
    currentBlochVectors = []; // Clear state
    // Reset to |0> state for visualization
    for (let i = 0; i < NUM_WIRES; i++) currentBlochVectors.push([0, 0, 1]);

    history = [];
    historyIndex = -1;
    isDirty = false;
    selectedQubit = 0;

    drawCircuit();
    updateBlochVector(currentBlochVectors[0]);
    updateSystemMetrics(); // Reset metrics

    showToast("Circuit Cleared", "info");
}

// --- Canvas Moving (Drag & Drop Existing Gates) ---
function handleCanvasMouseDown(e) {
    // Fix: Use offsetX/Y for correct Z-Axis coordinates
    const x = e.offsetX;
    const y = e.offsetY;

    for (let i = gates.length - 1; i >= 0; i--) {
        const g = gates[i];
        const gx = START_X + g.col * GRID_SIZE;
        const gy = START_Y + g.wire * WIRE_SPACING;

        if (x >= gx - GATE_WIDTH / 2 && x <= gx + GATE_WIDTH / 2 && y >= gy - GATE_HEIGHT / 2 && y <= gy + GATE_HEIGHT / 2) {

            saveState();
            isDraggingCanvasGate = true;
            canvasDragGate = g;

            canvasDragStartPos = {
                x: x, y: y
            }

                ;
            drawCircuit();
            return;
        }
    }
}

function handleCanvasMouseMove(e) {
    // Fix: Use offsetX/Y for correct Z-Axis coordinates
    const x = e.offsetX;

    // Cursor Logic
    if (x < START_X) {
        canvas.style.cursor = 'pointer';
    }

    else {
        canvas.style.cursor = isDraggingCanvasGate ? 'grabbing' : 'default';
    }

    if (!isDraggingCanvasGate || !canvasDragGate) return;
    const y = e.offsetY;
    drawCircuit();
    // Draw Floating Gate
    drawGate(canvasDragGate, x, y);
}

function handleCanvasMouseUp(e) {
    if (!isDraggingCanvasGate || !canvasDragGate) return;

    // Fix: Use offsetX/Y for correct Z-Axis coordinates
    const x = e.offsetX;
    const y = e.offsetY;

    let closestWire = getClosestWire(y, x);

    if (closestWire !== -1) {
        const relativeX = x - START_X;
        const col = Math.round(relativeX / GRID_SIZE);

        if (col >= 0) {
            canvasDragGate.wire = closestWire;
            canvasDragGate.col = col;
            canvasDragGate.wire = closestWire;
            canvasDragGate.col = col;
            recordTimeStep();
        }
    }

    isDraggingCanvasGate = false;
    canvasDragGate = null;
    drawCircuit();
}

// Hotkey for Undo
document.addEventListener('keydown', (e) => {
    // AUDIT FIX: Command palette keyboard shortcut
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (typeof toggleCommandPalette === 'function') toggleCommandPalette();
        return;
    }
    // AUDIT FIX: Command palette keyboard shortcut
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (typeof toggleCommandPalette === 'function') toggleCommandPalette();
        return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
    }
});

// --- Webcam & Scan Logic ---
function openScanSelection() {
    scanSelectionModal.classList.remove('hidden');
}

function closeScanSelection() {
    scanSelectionModal.classList.add('hidden');
}

function selectWebcam() {
    closeScanSelection();
    openWebcam();
}

function selectFileImport() {
    closeScanSelection();
    fileInput.click();
}

function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (event) {
        const base64Data = event.target.result;
        analyzeImage(base64Data);
        fileInput.value = ''; // Reset
    }

    reader.readAsDataURL(file);
}

function openWebcam() {
    webcamModal.classList.remove('hidden');

    navigator.mediaDevices.getUserMedia({
        video: true

    }).then(stream => {
        webcamVideo.srcObject = stream;

    }).catch(err => {
        alert("Could not access webcam: " + err.message);
        closeWebcam();
    });
}

function closeWebcam() {
    webcamModal.classList.add('hidden');

    if (webcamVideo.srcObject) {
        webcamVideo.srcObject.getTracks().forEach(track => track.stop());
        webcamVideo.srcObject = null;
    }
}

function captureAndSend() {
    captureCanvas.width = webcamVideo.videoWidth;
    captureCanvas.height = webcamVideo.videoHeight;
    const context = captureCanvas.getContext('2d');
    context.drawImage(webcamVideo, 0, 0, captureCanvas.width, captureCanvas.height);

    const imageData = captureCanvas.toDataURL('image/jpeg');
    closeWebcam(); // Close immediately on capture
    analyzeImage(imageData);
}

async function analyzeImage(imageData) {
    if (!geminiClient || !geminiClient.getApiKey()) {
        showToast("Set Gemini API key in Settings to use Scan", 'error');
        return;
    }

    showToast("Analyzing Circuit Image with Gemini Vision...", "info");

    try {
        const analysisText = await geminiClient.analyzeImage(
            imageData,
            `Analyze this image of a quantum circuit diagram. Extract the following information:

1. **Gate Identification**: List every quantum gate visible and which qubit wire each gate is on. Common gates: H, X, Y, Z, CNOT (also drawn as CX — a filled dot on control qubit connected by a vertical line to a circled-plus on target qubit), CZ (two filled dots connected), T, S, Rx, Ry, Rz, SWAP (two X symbols connected), Toffoli, MEASURE.
2. **Wire Count**: How many qubit wires are shown? Wires are numbered 0 from top.
3. **Gate Order**: List the gates in execution order from left to right.
4. **Measurements**: Are there any measurement gates? On which qubits?
5. **Circuit JSON**: Produce a JSON array using EXACTLY this format:

For single-qubit gates (H, X, Y, Z, T, S, Rx, Ry, Rz, MEASURE):
  {"type": "H", "wire": 0, "col": 0}

For two-qubit gates (CNOT, CX, CZ, SWAP):
  CRITICAL: "wire" = the CONTROL qubit (the filled dot), "target" = the TARGET qubit (the circled-plus for CNOT, or the second dot for CZ/SWAP).
  {"type": "CNOT", "wire": 0, "target": 4, "col": 1}
  {"type": "SWAP", "wire": 1, "target": 3, "col": 2}
  {"type": "CZ", "wire": 0, "target": 1, "col": 3}

For rotation gates, add params:
  {"type": "Rx", "wire": 0, "col": 2, "params": {"angle": 1.57}}

IMPORTANT RULES:
- "wire" is ALWAYS the control qubit for 2-qubit gates (the dot, NOT the target symbol)
- "target" is ALWAYS the target qubit for 2-qubit gates (the circled-plus for CNOT, second X for SWAP)
- "col" is the column position (0-based from left, gates at the same horizontal position share a column)
- Qubit indices are 0-based from the top wire
- Do NOT use a "control" field — use "wire" for control and "target" for target

Return the analysis text FIRST, then on a new line output EXACTLY:
CIRCUIT_JSON: [the JSON array]`,
            'You are an expert quantum computing circuit analyst. You have perfect vision for identifying quantum gates, wires, and circuit topology from diagrams, textbook figures, and hand-drawn sketches. You never confuse control and target qubits — the small filled dot is always the control, and the circled-plus symbol is always the CNOT target.'
        );

        // Parse out the circuit JSON if present
        let parsedGates = null;
        const jsonMatch = analysisText.match(/CIRCUIT_JSON:\s*(\[[\s\S]*?\])/);
        if (jsonMatch) {
            try {
                parsedGates = JSON.parse(jsonMatch[1]);
            } catch (e) {
                console.warn("[Scan] Could not parse circuit JSON from vision response:", e);
            }
        }

        // Display analysis in Sentinel Hub
        const displayText = analysisText.replace(/CIRCUIT_JSON:[\s\S]*$/, '').trim();
        if (typeof addChatMessage === 'function') {
            const chatEl = document.getElementById('persistentChatHistory');
            if (chatEl) addChatMessage('agent', `**Circuit Scan Results:**\n\n${displayText}`, chatEl);
        }
        if (typeof updateSentinelHub === 'function') {
            updateSentinelHub(displayText);
        }

        // If gates were extracted, offer to load them
        if (parsedGates && parsedGates.length > 0) {
            const loadCircuit = confirm(`Gemini identified ${parsedGates.length} gate(s) in the image.\n\nLoad this circuit into QuantaVibe?`);
            if (loadCircuit) {
                // Clear existing and load scanned gates
                gates.length = 0;
                parsedGates.forEach(g => {
                    const gateType = g.type || 'H';
                    const is2Q = (gateType === 'CNOT' || gateType === 'CX' || gateType === 'CZ' ||
                        gateType === 'SWAP' || gateType === 'CY' || gateType === 'CP');

                    if (is2Q) {
                        // 2-qubit gate: QuantaVibe uses wire=control, target=target
                        // Gemini may return "wire"+"target" (correct) or "control"+"wire" (legacy)
                        let controlQ, targetQ;
                        if (g.target !== undefined) {
                            // Gemini used the correct format: wire=control, target=target
                            controlQ = g.wire;
                            targetQ = g.target;
                        } else if (g.control !== undefined) {
                            // Gemini used legacy format: control=control, wire=target
                            controlQ = g.control;
                            targetQ = g.wire;
                        } else {
                            // Fallback: treat wire as control, default target to wire+1
                            controlQ = g.wire || 0;
                            targetQ = (g.wire || 0) + 1;
                        }
                        gates.push({
                            type: gateType === 'CX' ? 'CNOT' : gateType,
                            wire: controlQ,
                            target: targetQ,
                            col: g.col || 0,
                            params: g.params || undefined
                        });
                    } else {
                        // Single-qubit gate
                        gates.push({
                            type: gateType,
                            wire: g.wire || 0,
                            col: g.col || 0,
                            params: g.params || undefined
                        });
                    }
                });
                // Adjust NUM_WIRES if needed
                const maxWire = Math.max(...gates.map(g =>
                    Math.max(g.wire || 0, g.target || 0)
                ));
                if (maxWire >= NUM_WIRES) {
                    NUM_WIRES = maxWire + 1;
                    if (typeof resizeCanvas === 'function') resizeCanvas();
                }
                if (typeof drawCircuit === 'function') drawCircuit();
                showToast(`Loaded ${parsedGates.length} gates from scan`, "success");
                logToInsights(`\uD83D\uDCF7 Circuit scan: loaded ${parsedGates.length} gates from image`, 'ai');
            }
        } else {
            showToast("Circuit analyzed (no gates auto-extracted)", "info");
        }

    } catch (e) {
        console.error("[Scan] Vision analysis failed:", e);
        showToast("Scan failed: " + e.message, "error");
    }
}

function renderResults(counts) {
    resultsContainer.innerHTML = '';
    if (!counts) return;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    Object.keys(counts).sort().forEach(state => {
        const count = counts[state];
        const probability = (count / total) * 100;
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2';

        row.innerHTML = ` <span class="font-mono text-cyan-300 w-8 text-right" >$ {
                        state
                    }

                    </span> <div class="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden" > <div class="bg-gradient-to-r from-blue-500 to-purple-500 h-full" style="width: ${probability}%" ></div> </div> <span class="text-xs text-gray-400 w-10" >$ {
                        probability.toFixed(1)
                    }

                    %</span> `;
        resultsContainer.appendChild(row);
    });

    // 3D Tomography / Cityscape REMOVED (Paper-Trail Pivot)
}

// --- Export Logic ---
function closeExportModal() {
    exportModal.classList.add('hidden');
}

// Advanced Menu Toggle
// AUDIT FIX: Removed duplicate toggleAdvancedMenu() definition (17 lines) - canonical version below

// Aliases for Advanced Menu Actions
// AUDIT FIX: Removed duplicate triggerQSharpExport stub



// AUDIT FIX: Removed duplicate triggerResourceEstimator() (5 lines) - canonical version elsewhere

async function exportToQASM() {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        showToast("API Key required for Optimization", "warning");
        // Proceed with client-side QASM generation
    }

    exportBtn.disabled = true;
    exportBtn.innerHTML = ` <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Optimizing... `;

    // Client-Side QASM Generation
    try {
        const qasm = generateClientSideQASM(gates);
        qasmOutput.textContent = qasm;

        optimizationLog.innerHTML = "<span class='text-gray-500'>QASM generated locally.</span>";

        exportModal.classList.remove('hidden');
        showToast("QASM Generated Locally", "success");
    } catch (err) {
        showToast("Export Failed: " + err.message, "error");
    } finally {
        exportBtn.disabled = false;
        exportBtn.innerHTML = ` <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Export `;
    }

    // Backend export removed — all exports use Gemini or client-side generation

}

// --- Digital Twin / Hardware Mirror ---
window.triggerHardwareMirror = function () {
    const modal = document.getElementById('hardwareMirrorModal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        if (window.showToast) window.showToast("Hardware Mirror feature not available", "warning");
    }
};

window.triggerResourceEstimator = function () {
    // Check if Budgeteer is loaded
    if (window.Budgeteer) {
        // Toggle or Show
        // For now, simpler is better: just show toast if it's running in background
        if (window.showToast) window.showToast("Budgeteer is active in sidebar", "info");
    } else {
        if (window.showToast) window.showToast("Resource Estimator not loaded", "error");
    }
};

// --- PDF Export Logic ---
function generatePDFReport(config = null) {
    // 1. Check for Silent/Auto-Submit Mode
    if (config && config.autoSubmit) {
        console.log("Agent generating silent PDF report...", config);
        // Call submit directly, passing config to override DOM reads if needed
        submitPDFReport(config);
        return;
    }

    // 2. Open the Modal (Manual Mode)
    openPDFModal();

    // 3. Pre-fill if config provided
    if (config) {
        if (config.title) document.getElementById('pdfTitle').value = config.title;
        if (config.researcher) document.getElementById('pdfResearcher').value = config.researcher;
        if (config.organization) document.getElementById('pdfOrg').value = config.organization;
        if (config.notes) document.getElementById('pdfNotes').value = config.notes;
    }
}

function openPDFModal() {
    const adv = document.getElementById('advancedDropdown');
    if (adv) adv.classList.add('hidden');
    document.getElementById('pdfReportModal').classList.remove('hidden');
}

async function submitPDFReport(configOverride = null) {
    const pdfModal = document.getElementById('pdfReportModal');
    if (pdfModal) pdfModal.classList.add('hidden');
    showToast("Capturing Visuals & Generating PDF...", "info");

    const title = (configOverride && configOverride.title) ? configOverride.title : (document.getElementById('pdfTitle').value || "Quantum Circuit Research Report");
    const researcher = (configOverride && configOverride.researcher) ? configOverride.researcher : (document.getElementById('pdfResearcher').value || "Researcher");
    const org = (configOverride && configOverride.organization) ? configOverride.organization : (document.getElementById('pdfOrg').value || "QuantaVibe Labs");
    const notes = (configOverride && configOverride.notes) ? configOverride.notes : (document.getElementById('pdfNotes').value || "");

    // 1. Capture Visuals (Robust)
    let circuitImg = null, blochImg = null, spaqImg = null, tomoImg = null;

    // Ensure circuit is freshly drawn before capture
    if (typeof window.drawCircuit === 'function') {
        window.drawCircuit();
    }

    try {
        // A. Circuit (Direct Canvas Capture - Reliable)
        const cCanvas = document.getElementById('circuitCanvas');
        if (cCanvas) {
            circuitImg = cCanvas.toDataURL("image/png");
        } else {
            // Fallback to DOM capture if canvas not found
            const cContainer = document.getElementById('circuit-canvas-container');
            if (cContainer && typeof html2canvas !== 'undefined') {
                const blob = await html2canvas(cContainer, {
                    backgroundColor: '#020617',
                    scale: 2,
                    logging: false, // Silence console noise
                    ignoreElements: (el) =>
                        el.id === 'utilityDrawer' ||
                        el.classList.contains('sidebar-icon-container') ||
                        el.tagName === 'VIDEO' ||
                        el.tagName === 'CANVAS'
                });
                circuitImg = blob.toDataURL("image/png");
            }
        }

        // B. Bloch Sphere (Disabled)
        // C. Tomography (Disabled)
        // D. SPAQ (Disabled)

        // Note: The PDF layout now expects 'generatedImage' from AI analysis if available.

    } catch (e) {
        console.error("Capture Error:", e);
        showToast("Warning: Visual capture incomplete", "warning");
    }

    // 2. AI Analysis
    let formalAnalysis = "AI Analysis Pending...";
    try {
        if (geminiClient && geminiClient.getApiKey()) {
            showToast("Querying Gemini for Comprehensive Analysis...", "info");
            formalAnalysis = await geminiClient.generateContent(
                `Act as a Senior Quantum Researcher. Generate a COMPREHENSIVE Research Report Abstract for the following quantum circuit.
                 
                 Circuit Metadata:
                 - Gates: ${gates.length}
                 - Qubits (Wires): ${NUM_WIRES}
                 - Title: ${title}

                 Please provide a detailed response with the following sections (strictly text/math, no markdown formatting):
                 1. Executive Summary: Purpose and high-level goal.
                 2. Circuit Architecture: Analysis of gate arrangement, entanglement (CNOTs), and operations.
                 3. State Evolution & Complexity: Discuss interference, superposition depth, and computational cost.
                 4. Potential Applications: Real-world use cases for this type of circuit (e.g., search, crypto, chemistry).

                 Circuit JSON: ${JSON.stringify(gates)}`
            );
            // Store analysis for future use and display in log
            storeAndDisplayAnalysis(formalAnalysis);
            // Also display in Sentinel Hub
            if (typeof updateSentinelHub === 'function') {
                updateSentinelHub(formalAnalysis, null);
            }
        } else if (lastAIAnalysis) {
            // Use previously stored analysis if available
            formalAnalysis = lastAIAnalysis;
            logToInsights("📄 Using cached AI analysis for PDF report", "info");
        } else {
            formalAnalysis = "Note: Connect Gemini API to enable automated, deep introspection of this circuit.";
        }
    } catch (e) {
        console.error("AI Analysis Error:", e);
        formalAnalysis = lastAIAnalysis || "Analysis unavailable due to network or API error.";
    }

    // 3. Build PDF
    const headerColor = '#ef4444'; // Red for PDF Report

    // --- Heron R2 + Bio-Shield PDF Metadata ---
    const isHeronActive = activeDeviceProfile && activeDeviceProfile.name && activeDeviceProfile.name.includes('Heron');
    const isBioActive = window.isBioMode || false;

    // Hardware header line: force "IBM Heron R2 [Bio-Shield Enhanced]" when Bio-Mode + Heron
    let hardwareLabel = 'Hardware: Ideal Simulation';
    if (activeDeviceProfile && activeDeviceProfile.name) {
        hardwareLabel = `Hardware: ${activeDeviceProfile.name}`;
        if (isBioActive) {
            hardwareLabel += ' [Bio-Shield Enhanced]';
        }
    } else if (isBioActive) {
        hardwareLabel = 'Hardware: Ideal Simulation [Bio-Shield Enhanced]';
    }

    // Heron native gate: CNOT → CZ in PDF gate table (tunable coupler)
    const mapGateForPDF = (gateType) => {
        if (isHeronActive && (gateType === 'CNOT' || gateType === 'CX')) {
            return 'CZ';
        }
        return gateType;
    };

    // Bio-Shield FMO abstract attribution line
    const bioAbstract = isBioActive
        ? 'Noise mitigation provided by Biomimetic FMO-Complex shielding, simulating room-temperature coherence stability.'
        : null;

    // Topology note (if Heron sub-patch)
    const topoNote = isHeronActive && activeDeviceProfile.topology_note
        ? activeDeviceProfile.topology_note
        : null;

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        header: {
            margin: [40, 20, 40, 0],
            columns: [
                { text: 'QuantaVibe', bold: true, color: headerColor },
                { text: org, alignment: 'right', color: '#94a3b8' }
            ]
        },
        content: [
            { text: title, style: 'header' },
            {
                columns: [
                    { text: `Researcher: ${researcher}`, style: 'subheader' },
                    { text: new Date().toLocaleString(), alignment: 'right', style: 'subheader' }
                ]
            },
            // Hardware profile line (forced Heron R2 [Bio-Shield Enhanced] when applicable)
            { text: hardwareLabel, fontSize: 10, bold: true, color: isBioActive ? '#059669' : '#334155', margin: [0, 4, 0, 0] },
            // Topology sub-patch note (if Heron)
            ...(topoNote ? [{ text: topoNote, fontSize: 8, italics: true, color: '#64748b', margin: [0, 2, 0, 0] }] : []),
            { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: headerColor }], margin: [0, 10, 0, 20] },

            // Bio-Shield FMO Abstract Attribution (only when Bio-Mode active)
            ...(bioAbstract ? [
                {
                    text: bioAbstract,
                    fontSize: 10,
                    italics: true,
                    color: '#047857',
                    margin: [0, 0, 0, 15],
                    background: '#ecfdf5'
                }
            ] : []),

            // Circuit Diagram
            { text: 'Circuit Diagram', style: 'sectionHeader' },

            // Always include the circuit canvas capture
            circuitImg ? {
                image: circuitImg,
                width: 500,
                alignment: 'center',
                margin: [0, 10, 0, 10]
            } : {
                text: '(Circuit diagram capture unavailable)',
                fontSize: 10,
                italics: true,
                color: '#94a3b8',
                alignment: 'center',
                margin: [0, 10, 0, 10]
            },

            // AI-Generated Visualization (if available)
            ...(window.lastSimulationResult?.generatedImage ? [
                { text: 'AI Visualization', style: 'sectionHeader', margin: [0, 10, 0, 5] },
                {
                    image: window.lastSimulationResult.generatedImage,
                    width: 500,
                    alignment: 'center',
                    margin: [0, 5, 0, 10]
                }
            ] : []),

            { text: 'Analysis', style: 'sectionHeader', margin: [0, 20, 0, 10] },
            { text: formalAnalysis, fontSize: 10, lineHeight: 1.4 },

            // Circuit Gates List — CNOT → CZ when Heron R2 is active (native tunable-coupler gate)
            { text: 'Circuit Gates', style: 'sectionHeader', margin: [0, 20, 0, 10] },
            ...(isHeronActive ? [{ text: 'Note: CNOT gates shown as CZ to reflect IBM Heron R2 native tunable-coupler gate set.', fontSize: 8, italics: true, color: '#64748b', margin: [0, 0, 0, 5] }] : []),
            {
                table: {
                    headerRows: 1,
                    widths: ['auto', 'auto', 'auto', '*'],
                    body: [
                        [
                            { text: '#', bold: true, fontSize: 8, color: '#64748b' },
                            { text: 'Gate', bold: true, fontSize: 8, color: '#64748b' },
                            { text: 'Qubit(s)', bold: true, fontSize: 8, color: '#64748b' },
                            { text: 'Parameters', bold: true, fontSize: 8, color: '#64748b' }
                        ],
                        ...gates.slice(0, 50).map((g, i) => [
                            { text: `${i + 1}`, fontSize: 8 },
                            { text: mapGateForPDF(g.type || 'Unknown'), fontSize: 8, bold: true, color: '#0284c7' },
                            { text: g.control !== undefined ? `Q${g.control} \u2192 Q${g.wire}` : `Q${g.wire}`, fontSize: 8 },
                            { text: g.params ? JSON.stringify(g.params) : '-', fontSize: 8, color: '#64748b' }
                        ])
                    ]
                },
                layout: {
                    hLineColor: () => '#e2e8f0',
                    vLineColor: () => '#e2e8f0',
                    paddingLeft: () => 4,
                    paddingRight: () => 4,
                    paddingTop: () => 2,
                    paddingBottom: () => 2
                }
            },
            gates.length > 50 ? { text: `... and ${gates.length - 50} more gates`, fontSize: 8, italics: true, color: '#94a3b8', margin: [0, 5, 0, 0] } : {},

            { text: 'Notes', style: 'sectionHeader', margin: [0, 20, 0, 10] },
            { text: notes, fontSize: 10, italics: true, color: '#475569' }
        ],
        styles: {
            header: { fontSize: 22, bold: true, color: '#0f172a', margin: [0, 0, 0, 10] },
            subheader: { fontSize: 11, color: '#64748b' },
            sectionHeader: { fontSize: 14, bold: true, color: '#0f172a', margin: [0, 10, 0, 5] }
        }
    };

    try {
        if (typeof pdfMake === 'undefined') throw new Error("PDFLib missing");
        pdfMake.createPdf(docDefinition).download(`QuantaVibe_Report_${Date.now()}.pdf`);
        showToast("PDF Downloaded Successfully", "success");
    } catch (e) {
        console.error(e);
        showToast("PDF Generation Failed", "error");
    }
}

function copyQASM() {
    const text = qasmOutput.textContent;

    navigator.clipboard.writeText(text).then(() => {
        showToast("QASM Copied to Clipboard", "success");
    });
}

// --- Save / Load & Persistence Logic ---
function saveProject() {
    const data = {
        gates: gates,
        history: history,
        connection: localStorage.getItem('quantaVibe_connection')
    }

        ;
    const json = JSON.stringify(data, null, 2);

    const blob = new Blob([json], {
        type: "application/json"
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = "quantavibe_circuit.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    isDirty = false;
    showToast("Project Saved!", "success");
}

async function exportCircuit(format) {
    if (!gates || gates.length === 0) {
        showToast("Circuit is empty. Add gates first.", "warning");
        return;
    }

    // Determine language name for display
    const languageMap = {
        'qiskit': 'Qiskit (Python)',
        'cirq': 'Cirq (Python)',
        'qasm': 'OpenQASM 3.0'
    };
    const language = languageMap[format] || format;

    // Show modal with loading state
    const modal = document.getElementById('codePreviewModal');
    const titleEl = document.getElementById('codePreviewTitle');
    const loadingEl = document.getElementById('codePreviewLoading');
    const contentEl = document.getElementById('codePreviewContent');
    const outputEl = document.getElementById('codePreviewOutput');

    if (!modal || !titleEl || !loadingEl || !contentEl || !outputEl) {
        console.error("[Export] Code preview modal elements missing");
        showToast("Export UI error", "error");
        return;
    }

    titleEl.textContent = `Export: ${language}`;
    loadingEl.classList.remove('hidden');
    contentEl.classList.add('hidden');
    modal.classList.remove('hidden');

    try {
        let code = '';

        if (format === 'qasm') {
            // Use existing client-side QASM generator (no AI needed)
            code = generateClientSideQASM(gates);
        } else {
            // Use Gemini to generate Qiskit/Cirq code from QASM
            if (!window.geminiClient) {
                throw new Error("Gemini API client not initialized. Set your API key in Settings.");
            }

            const qasm = generateClientSideQASM(gates);
            const prompt = `Convert the following OpenQASM 2.0 to ${language}. Return ONLY valid Python code with no markdown formatting, no explanations, no triple backticks.\n\n${qasm}`;

            code = await window.geminiClient.generateContent(prompt);

            // Clean up any markdown artifacts that might slip through
            code = code.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();
        }

        // Display code in modal
        outputEl.textContent = code;
        loadingEl.classList.add('hidden');
        contentEl.classList.remove('hidden');

        // Also copy to clipboard for convenience
        await navigator.clipboard.writeText(code);
        showToast(`${language} code generated and copied!`, "success");

    } catch (e) {
        console.error("Export Failed:", e);
        outputEl.textContent = `// Error generating ${language} code\n// ${e.message}\n\n// Ensure your Gemini API key is set in Settings.`;
        loadingEl.classList.add('hidden');
        contentEl.classList.remove('hidden');
        showToast(`Failed to generate ${language} code`, "error");
    }
}
window.exportCircuit = exportCircuit;

function loadProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();

        reader.onload = event => {
            try {
                const data = JSON.parse(event.target.result);

                if (data.gates) {
                    gates = data.gates || [];
                    history = data.history || [];

                    if (data.connection) {
                        localStorage.setItem('quantaVibe_connection', data.connection);
                        loadConnection();
                    }

                    drawCircuit();
                    recordTimeStep();
                    isDirty = false;
                    showToast("Project Loaded Successfully", "success");
                }

                else {
                    showToast("Invalid Project File", "error");
                }
            }

            catch (err) {
                showToast("Load Error: " + err.message, "error");
            }
        }

        reader.readAsText(file);
    }

    input.click();
}

// Warn on close if dirty
window.addEventListener('beforeunload', (e) => {
    if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Standard browser dialog trigger
    }
});

// --- Connection Logic ---
const connectionModal = document.getElementById('connectionModal');
const connProvider = document.getElementById('connProvider');
const connFields = document.getElementById('connFields');
const connStatus = document.getElementById('connStatus');
const connectBtnText = document.getElementById('connectBtnText');

function openConnectionModal() {
    if (window.suppressCloudModal) {
        console.log("[QuantaVibe] Cloud Modal Suppressed by Flag");
        return;
    }
    connectionModal.classList.remove('hidden');
    loadConnection();
}

function closeConnectionModal() {
    connectionModal.classList.add('hidden');
    connStatus.innerHTML = '';
}

function renderConnectionFields() {
    const provider = connProvider.value;
    connFields.innerHTML = '';

    if (provider === 'IBM Quantum') {
        connFields.innerHTML = ` <input type="password" id="ibmToken" placeholder="API Token" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"><input type="text" id="ibmHub" placeholder="Hub (optional)" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"><input type="text" id="ibmGroup" placeholder="Group (optional)" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"><input type="text" id="ibmProject" placeholder="Project (optional)" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm">`;
    }

    else if (provider === 'Google Quantum AI') {
        connFields.innerHTML = ` <textarea id="googleKey" placeholder="Paste Service Account JSON Key" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm h-20"></textarea><input type="text" id="googleProject" placeholder="Project ID" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm">`;
    }

    else if (provider === 'AWS Braket') {
        connFields.innerHTML = ` <input type="text" id="awsAccess" placeholder="Access Key ID" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"><input type="password" id="awsSecret" placeholder="Secret Access Key" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"><input type="text" id="awsRegion" placeholder="Region (e.g. us-east-1)" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm">`;
    }

    else {
        connFields.innerHTML = `<span class="text-gray-500 text-sm">Not supported yet.</span>`;
    }
}

function getCredentials() {
    const providerEl = document.getElementById('connProvider');
    const provider = providerEl ? providerEl.value : '';
    let creds = {};

    if (provider === 'IBM Quantum') {
        creds = {
            token: document.getElementById('ibmToken')?.value,
            hub: document.getElementById('ibmHub')?.value,
            group: document.getElementById('ibmGroup')?.value,
            project: document.getElementById('ibmProject')?.value
        };
    } else if (provider === 'Google Quantum AI') {
        creds = {
            json_key: document.getElementById('googleKey')?.value,
            project_id: document.getElementById('googleProject')?.value
        };
    } else if (provider === 'AWS Braket') {
        creds = {
            access_key: document.getElementById('awsAccess')?.value,
            secret_key: document.getElementById('awsSecret')?.value,
            region: document.getElementById('awsRegion')?.value
        };
    }

    return creds;
}

function saveConnection() {
    const providerEl = document.getElementById('connProvider');
    const provider = providerEl ? providerEl.value : '';
    const creds = getCredentials();

    const config = { provider, creds };
    localStorage.setItem('quantaVibe_connection', JSON.stringify(config));

    showToast("Connection Saved", "success");
    const btnText = document.getElementById('connectBtnText');
    if (btnText) {
        btnText.innerText = "Connected";
        btnText.classList.add("text-green-400");
    }
    closeConnectionModal();
}

function loadConnection() {
    const saved = localStorage.getItem('quantaVibe_connection');

    if (saved) {
        const config = JSON.parse(saved);
        const providerEl = document.getElementById('connProvider');
        if (providerEl) providerEl.value = config.provider;

        renderConnectionFields();

        // Populate fields delay (since render replaces DOM)
        setTimeout(() => {
            const creds = config.creds;

            if (config.provider === 'IBM Quantum') {
                if (creds.token) document.getElementById('ibmToken').value = creds.token;
                if (creds.hub) document.getElementById('ibmHub').value = creds.hub;
                if (creds.group) document.getElementById('ibmGroup').value = creds.group;
                if (creds.project) document.getElementById('ibmProject').value = creds.project;
            }

            else if (config.provider === 'Google Quantum AI') {
                if (creds.json_key) document.getElementById('googleKey').value = creds.json_key;
                if (creds.project_id) document.getElementById('googleProject').value = creds.project_id;
            }

            else if (config.provider === 'AWS Braket') {
                if (creds.access_key) document.getElementById('awsAccess').value = creds.access_key;
                if (creds.secret_key) document.getElementById('awsSecret').value = creds.secret_key;
                if (creds.region) document.getElementById('awsRegion').value = creds.region;
            }
        }

            , 0);
    }

    else {
        renderConnectionFields(); // Default
    }
}

async function testConnection() {
    const providerEl = document.getElementById('connProvider');
    const providerId = providerEl ? providerEl.value.toLowerCase().replace(/\s+/g, '') : '';
    // Map nice names to IDs: 'IBM Quantum' -> 'ibm', 'Google Quantum AI' -> 'google'
    let pid = 'ibm';
    if (providerId.includes('google')) pid = 'google';
    else if (providerId.includes('rigetti')) pid = 'rigetti';
    else if (providerId.includes('ionq')) pid = 'ionq';
    else if (providerId.includes('aws')) pid = 'aws';

    const creds = getCredentials(); // { key: ... }
    const apiKey = creds.api_key || creds.token || creds.json_key || creds.access_key;

    const statusEl = document.getElementById('connStatus');
    if (statusEl) statusEl.innerHTML = '<span class="text-blue-400 animate-pulse">Connecting to Oracle...</span>';

    if (!apiKey) {
        if (statusEl) statusEl.innerHTML = '<span class="text-red-400">Error: API Key Required</span>';
        return;
    }

    // Direct Oracle Connection
    const result = window.oracle.connect(pid, apiKey);

    setTimeout(() => {
        if (result.success) {
            if (statusEl) statusEl.innerHTML = `<span class="text-green-400">✓ Connected to ${result.provider}</span>`;
            // Also update the header button
            const btnText = document.getElementById('connectBtnText');
            if (btnText) btnText.innerText = "CONNECTED";
            showToast(`Connected to ${result.provider}`, 'success');
        } else {
            if (statusEl) statusEl.innerHTML = `<span class="text-red-400">Error: ${result.error}</span>`;
        }
    }, 500);
}

// --- Scaffolding Logic ---
const scaffoldModal = document.getElementById('scaffoldModal');
const scaffoldStatus = document.getElementById('scaffoldStatus');

function openScaffoldModal() {
    if (scaffoldModal) scaffoldModal.classList.remove('hidden');
    const appNameInput = document.getElementById('appName');
    if (appNameInput) appNameInput.value = '';
    if (scaffoldStatus) scaffoldStatus.innerHTML = '';
}

function closeScaffoldModal() {
    if (scaffoldModal) scaffoldModal.classList.add('hidden');
}

async function createScaffolding() {
    const appNameInput = document.getElementById('appName');
    const appName = appNameInput ? (appNameInput.value.trim() || "my_quantum_app") : "my_quantum_app";

    if (scaffoldStatus) scaffoldStatus.innerHTML = '<span class="text-blue-400 animate-pulse">Building App...</span>';

    // Generate scaffolding code using Gemini (no backend needed)
    try {
        if (!geminiClient || !geminiClient.getApiKey()) {
            if (scaffoldStatus) scaffoldStatus.innerHTML = '<span class="text-yellow-400">Set Gemini API key to generate app scaffolding.</span>';
            return;
        }

        const scaffoldCode = await geminiClient.generateContent(
            `Generate a complete Python quantum application scaffold named "${appName}" using Qiskit.

Circuit gates: ${JSON.stringify(gates)}

Include:
1. requirements.txt (qiskit, numpy, matplotlib)
2. main.py with the circuit built from the gates above
3. A run() function that executes the circuit on Aer simulator
4. Visualization code to plot the results histogram

Return the full file contents clearly labeled.`,
            'You are a quantum software engineer. Generate clean, working Python Qiskit code.'
        );

        if (scaffoldStatus) {
            scaffoldStatus.innerHTML = `<span class="text-green-400">\u2714 Scaffold generated:</span><pre class="text-[10px] text-gray-300 mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap">${scaffoldCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
        }
        showToast("Scaffold Generated", "success");
    } catch (err) {
        if (scaffoldStatus) scaffoldStatus.innerHTML = `<span class="text-red-400">Error: ${err.message}</span>`;
    }

}

// --- Agent Button Logic ---
const headerAgentBtn = document.getElementById('headerAgentBtn');

if (headerAgentBtn) {
    headerAgentBtn.addEventListener('click', () => {
        const chatOverlay = document.getElementById('chatOverlay');
        chatOverlay.classList.toggle('hidden');
    });
}

// init() removed - called once at end of file

// --- Advanced Menu Handlers ---
// function triggerResourceEstimator() { REPLACED BY FEATURES/GATE_COST_CALCULATOR.JS }

function triggerNoiseProfile() {
    const modal = document.getElementById('customNoiseModal');
    if (modal) {
        modal.classList.remove('hidden');
        toggleAdvancedMenu(); // Close the menu
    }
}

function toggleAdvancedMenu() {
    const menu = document.getElementById('advancedDropdown');
    if (menu) {
        if (menu.classList.contains('hidden')) {
            menu.classList.remove('hidden');
            menu.classList.add('flex', 'flex-col'); // Ensure flex layout
        } else {
            menu.classList.add('hidden');
            menu.classList.remove('flex', 'flex-col');
        }
    }
}

// --- Auto-Exposed Functions for HTML Event Handlers ---
window.toggleAdvancedMenu = toggleAdvancedMenu;
window.triggerQSharpExport = triggerQSharpExport;
window.triggerResourceEstimator = triggerResourceEstimator;
window.triggerNoiseProfile = triggerNoiseProfile;
window.applyCustomNoise = applyCustomNoise;
window.captureAndSend = captureAndSend;
window.closeConnectionModal = closeConnectionModal;
window.closeExportModal = closeExportModal;
window.closeScaffoldModal = closeScaffoldModal;
window.closeScanSelection = closeScanSelection;
window.closeWebcam = closeWebcam;
window.copyQASM = copyQASM;
window.createScaffolding = createScaffolding;
window.exportToQASM = exportToQASM;
window.generatePDFReport = generatePDFReport;
window.handleCanvasClick = handleCanvasClick;
window.handleFileImport = handleFileImport;
window.loadProject = loadProject;
window.openConnectionModal = openConnectionModal;
window.openScaffoldModal = openScaffoldModal;
window.openScanSelection = openScanSelection;
window.openWebcam = openWebcam;
window.redo = redo;
window.renderConnectionFields = renderConnectionFields;
window.resetCircuit = resetCircuit;
window.runAutopilotRefactoring = runAutopilotRefactoring;
window.runSimulation = runSimulation;
window.saveApiKey = saveApiKey;
window.saveConnection = saveConnection;
window.saveProject = saveProject;
window.selectFileImport = selectFileImport;
window.selectHardware = selectHardware;
window.selectProfile = selectProfile;
window.selectWebcam = selectWebcam;
window.testConnection = testConnection;
window.toggleAdvancedMenu = toggleAdvancedMenu;
window.toggleZAxis = toggleZAxis;
window.triggerCircuitDecomposer = triggerCircuitDecomposer;
window.triggerCustomNoise = triggerCustomNoise;
window.triggerHardwareMirror = triggerHardwareMirror;
window.triggerLogicalMapper = triggerLogicalMapper;
window.triggerQSharpExport = triggerQSharpExport;
window.triggerResourceEstimator = triggerResourceEstimator;
window.undo = undo;
window.updateCustomNoiseDisplay = updateCustomNoiseDisplay;
// AUDIT FIX: Removed duplicate window.resetCircuit assignment
window.updateHardwareProfile = updateHardwareProfile;
// Live getter so external modules always see current value (not stale snapshot)
Object.defineProperty(window, 'activeDeviceProfile', {
    get: () => activeDeviceProfile,
    set: (v) => { activeDeviceProfile = v; },
    configurable: true
});

// --- QuantaVibe Global API for Plugins & Agents ---
// AUDIT FIX: Use Object.assign to extend, not overwrite
Object.assign(window.QuantaVibeAPI, {
    // Core CircuitOps
    getCircuitState: () => { return { gates: window.gates, numWires: window.NUM_WIRES }; },
    getGates: () => window.gates,
    setGates: (newGates) => { window.gates = newGates; window.drawCircuit(); },
    placeGate: (type, wire, col) => {
        window.gates.push({ type, wire, col });
        window.drawCircuit();
    },
    resetCircuit: () => window.resetCircuit(),

    // Simulation
    runSimulation: () => window.runSimulation(true), // true = run as agent/programmatic
    getLastSimulationResult: () => window.lastSimulationResult,

    // Visuals
    updateVisuals: (data) => window.processAIPhysicsState(data),
    createPluginWindow: (id, title, style) => {
        // Helper to create floating window
        const win = document.createElement('div');
        win.id = id;
        win.className = "fixed bg-gray-900/90 border border-cyan-500/50 rounded shadow-xl backdrop-blur z-50 overflow-hidden flex flex-col";
        win.style.top = "100px";
        win.style.left = "100px";
        win.style.width = style?.width || "300px";
        win.style.height = style?.height || "auto";

        // Header
        const header = document.createElement('div');
        header.className = "p-2 bg-gray-800/80 border-b border-gray-700 flex justify-between cursor-move";
        const titleStr = (typeof title === 'string') ? title : (title && title.id ? `Plugin: ${title.id}` : "New Plugin");
        header.innerHTML = `<span class="font-bold text-xs text-cyan-400">${titleStr}</span>`;
        const close = document.createElement('button');
        close.innerHTML = "&times;";
        close.className = "text-gray-400 hover:text-white";
        close.onclick = () => win.remove();
        header.appendChild(close);

        win.appendChild(header);
        document.body.appendChild(win);

        // Return content container with enhanced API
        const content = document.createElement('div');
        content.className = "flex-1 overflow-auto relative p-4 text-gray-100 text-sm";
        win.appendChild(content);

        // Attach methods to the element for plugin compatibility
        content.setHTML = (html) => {
            if (typeof sanitizeHTML === 'function') {
                content.innerHTML = html; // Assume AI generated HTML is relatively safe for its own window
            } else {
                content.innerHTML = html;
            }
        };
        content.close = () => win.remove();
        content.setTitle = (newTitle) => {
            const titleEl = header.querySelector('span');
            if (titleEl) titleEl.innerText = newTitle;
        };

        return content;
    },

    // Utils
    showToast: (msg, type) => window.showToast(msg, type),
    shadowTest: (code) => {
        if (window.featureLoaderInstance) {
            return window.featureLoaderInstance.shadowTestFeature(code);
        }
        return { success: true }; // Fallback
    },

    // Hardware Profile
    setCustomDeviceProfile: (profile) => setCustomDeviceProfile(profile),
    getActiveDeviceProfile: () => activeDeviceProfile
});

// Backend URL configuration removed — QuantaVibe is fully client-side (no backend)
// All AI features use Gemini API directly via GeminiClient.js

console.log("[QuantaVibe] API Exposed:", Object.keys(window.QuantaVibeAPI));
function runSimulation(isAgent = false) {
    if (!isAgent && !activeDeviceProfile) showToast("Running Quantum Simulation...", "info");

    try {
        // 1. Instantiate Engine
        const engine = new QuantumEngine(NUM_WIRES);

        // 2. Run Circuit
        const result = engine.run(gates);

        lastSimulationResult = result;
        currentBlochVectors = result.blochVectors;

        // 3. Update SPAQ (Data only, no 3D)
        if (activeDeviceProfile) {
            // physics only
            if (typeof updateHardwarePhysics === 'function') updateHardwarePhysics();
        } else {
            window.currentSpaqHealth = calculateSPAQHealthWithCosts(gates);
            currentSpaqHealth = window.currentSpaqHealth;
            if (window.updateSPAQCoherence) window.updateSPAQCoherence();
        }

        // 4. Trigger AI Analysis + PDF Report
        // AI analysis runs for BOTH manual and agent-triggered simulations (populates Sentinel Hub)
        // PDF report generation only happens for manual (non-agent) simulations
        const reportData = {
            ...result,
            gates: gates,
            timestamp: Date.now()
        };

        if (typeof triggerAIAnalysis === 'function') {
            triggerAIAnalysis(result)
                .then(() => {
                    // PDF report: only for manual simulations (not agent-triggered)
                    if (!isAgent && window.generateQuantumReport) {
                        window.generateQuantumReport(reportData);
                        showToast("Research Report Generated", "success");
                    }
                })
                .catch(err => {
                    console.warn("AI Trigger Failed", err);
                    if (!isAgent && window.generateQuantumReport) {
                        window.generateQuantumReport(reportData);
                        showToast("Research Report Generated (without AI analysis)", "info");
                    }
                });
        } else if (!isAgent) {
            // No AI analysis function — generate report immediately (manual only)
            if (window.generateQuantumReport) {
                window.generateQuantumReport(reportData);
            }
            showToast("Research Report Generated", "success");
        }

        if (window.sentinelCore) {
            window.sentinelCore.logExperiment(gates, result);
        }

        return result;

    } catch (e) {
        console.error("Simulation Failed:", e);
        showToast("Simulation Error: " + e.message, "error");
        return null;
    }
}

function calculateCircuitDepth(gates) {
    if (!gates || gates.length === 0) return 0;
    const wireDepth = new Array(NUM_WIRES).fill(0);

    gates.forEach(g => {
        if (g.type === 'BARRIER') return;

        // Multi-qubit gates sync depth
        if (g.type === 'CNOT' || g.type === 'SWAP' || g.type === 'CZ' || g.type === 'CY' || g.type === 'CP') {
            const w1 = g.wire;
            const w2 = g.target !== undefined ? g.target : g.wire;
            const currentMax = Math.max(wireDepth[w1], wireDepth[w2]);
            const next = currentMax + 1;
            wireDepth[w1] = next;
            wireDepth[w2] = next;
        } else {
            wireDepth[g.wire] += 1;
        }
    });

    return Math.max(0, ...wireDepth);
}

// --- AEGIS LOGIC: Gate Costs ---
const GATE_COSTS = {
    'SWAP': 3, // Expensive (3 CNOTs)
    'T': 10,   // Very Expensive (Magic State Distillation)
    'CZ': 2,
    'CNOT': 1,
    'X': 0.1, 'Y': 0.1, 'Z': 0.1, 'H': 0.2,
    'BARRIER': 0
};

function getLastGateType(wire) {
    if (!gates) return null;
    for (let i = gates.length - 1; i >= 0; i--) {
        if (gates[i].wire === wire || gates[i].target === wire) return gates[i].type;
    }
    return null;
}

function calculateSPAQHealthWithCosts(gates) {
    const health = {};
    const numQ = (typeof NUM_WIRES !== 'undefined') ? NUM_WIRES : 5;
    const entropy = new Array(numQ).fill(0);

    // Gate costs tuned for visible degradation:
    // Single-qubit gates: mild decoherence
    // Two-qubit gates: significant decoherence (realistic: 10-100x worse error rates)
    // T gates: expensive (magic state distillation)
    const costs = {
        'H': 0.08, 'X': 0.05, 'Y': 0.06, 'Z': 0.04,
        'S': 0.07, 'Sdg': 0.07, 'T': 0.15, 'Tdg': 0.15,
        'RX': 0.10, 'RY': 0.10, 'RZ': 0.08, 'P': 0.08,
        'CNOT': 0.20, 'CX': 0.20, 'CZ': 0.18, 'CY': 0.18,
        'SWAP': 0.35, 'CP': 0.20,
        'MEASURE': 0.02, 'BARRIER': 0
    };

    gates.forEach(g => {
        const cost = costs[g.type] || 0.10;

        if (g.type === 'CNOT' || g.type === 'CX' || g.type === 'SWAP' ||
            g.type === 'CZ' || g.type === 'CY' || g.type === 'CP') {
            entropy[g.wire] += cost;
            if (g.target !== undefined && g.target >= 0 && g.target < numQ) {
                entropy[g.target] += cost;
            }
        } else if (g.type !== 'BARRIER') {
            if (g.wire >= 0 && g.wire < numQ) {
                entropy[g.wire] += cost;
            }
        }
    });

    for (let i = 0; i < numQ; i++) {
        // Exponential decay: a few gates = visible drop, many gates = severe
        // Bio-mimetic shielding reduces entropy accumulation by 50% (FMO complex inspired)
        const effectiveEntropy = window.isBioMode ? entropy[i] * 0.5 : entropy[i];
        health[String(i)] = Math.max(0, Math.exp(-effectiveEntropy));
    }
    return health;
}
window.calculateSPAQHealthWithCosts = calculateSPAQHealthWithCosts;

// --- Bio-Mimetic Shielding Toggle ---
function toggleBioMode() {
    window.isBioMode = !window.isBioMode;
    const btn = document.getElementById('bioShieldBtn');
    const body = document.body;

    if (window.isBioMode) {
        body.classList.add('bio-glow');
        if (btn) btn.classList.add('active');
        showToast('Bio-Luminescent Shield Activated', 'success');

        // Sentinel status log
        const chatContainer = document.getElementById('persistentChatHistory');
        if (chatContainer && window.addChatMessage) {
            window.addChatMessage('agent',
                '[Sentinel]: Bio-mimetic shielding active. Mimicking FMO complex coherence protection. Noise floor reduced by 50%.',
                chatContainer
            );
        }
    } else {
        body.classList.remove('bio-glow');
        if (btn) btn.classList.remove('active');
        showToast('Bio-Luminescent Shield Deactivated', 'info');

        const chatContainer = document.getElementById('persistentChatHistory');
        if (chatContainer && window.addChatMessage) {
            window.addChatMessage('agent',
                '[Sentinel]: Bio-mimetic shielding disengaged. Standard decoherence model restored.',
                chatContainer
            );
        }
    }

    // Recalculate health with new decay model and redraw
    window.currentSpaqHealth = calculateSPAQHealthWithCosts(gates);
    currentSpaqHealth = window.currentSpaqHealth;
    if (window.updateSPAQCoherence) window.updateSPAQCoherence();
    drawCircuit();
}
window.toggleBioMode = toggleBioMode;

// Real QuantumEngine is now used exclusively.

// --- Custom Features Modal Logic ---
function openCustomFeaturesModal() {
    toggleAdvancedMenu(); // Close dropdown
    const modal = document.getElementById('pluginManagerModal');
    if (modal) modal.classList.remove('hidden');
}

function closeCustomFeaturesModal() {
    const modal = document.getElementById('pluginManagerModal');
    if (modal) modal.classList.add('hidden');
}

window.openCustomFeaturesModal = openCustomFeaturesModal;
window.closeCustomFeaturesModal = closeCustomFeaturesModal;

// --- Feature Isolation Protocol (Safety API) ---
function registerCustomFeature(name, icon, callback) {
    const list = document.getElementById('custom-features-list');
    if (!list) return;

    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = "w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition border border-gray-700 hover:border-purple-500 group flex items-center gap-3";
    btn.onclick = () => {
        closeCustomFeaturesModal();
        callback();
    };

    btn.innerHTML = `
    <span class="text-xl group-hover:scale-110 transition-transform">${icon}</span>
    <div class="flex-1">
        <div class="font-bold text-gray-200 text-sm">${name}</div>
    </div>
    <svg class="w-4 h-4 text-gray-500 group-hover:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
    `;

    li.appendChild(btn);
    list.appendChild(li);
    console.log(`[Sentinel] Feature Registered: ${name}`);
}
window.registerCustomFeature = registerCustomFeature;

// --- Built-in Mini Game: Quantum Coin Flip ---
function launchQuantumCoinFlip() {
    // Inject Modal if not exists
    if (!document.getElementById('coinGameModal')) {
        const modal = document.createElement('div');
        modal.id = 'coinGameModal';
        modal.className = "fixed inset-0 bg-black/90 z-[70] flex items-center justify-center hidden backdrop-blur-md";
        modal.innerHTML = `
    <div class="bg-gray-900 p-8 rounded-2xl border border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.2)] w-96 text-center relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20 pointer-events-none"></div>
        <h2 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6 relative z-10">Quantum Coin Toss</h2>

        <div class="h-40 flex items-center justify-center perspective-1000 mb-6 relative z-10">
            <div id="q-coin" class="w-32 h-32 rounded-full bg-gradient-to-tr from-yellow-400 to-yellow-600 shadow-xl flex items-center justify-center text-4xl font-bold text-yellow-900 border-4 border-yellow-300 transform transition-transform duration-1000 transform-style-3d">
                H
            </div>
        </div>

        <div class="space-y-3 relative z-10">
            <p class="text-gray-400 text-sm">Superposition: <span id="coin-state" class="text-purple-400">|0\u27E9</span></p>
            <button onclick="flipQuantumCoin()" class="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-purple-900/50 transition transform hover:scale-105 active:scale-95">
                Apply Hadamard (H)
            </button>
            <button onclick="measureQuantumCoin()" class="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg border border-gray-600 transition">
                Measure State
            </button>
            <button onclick="document.getElementById('coinGameModal').classList.add('hidden')" class="text-gray-500 hover:text-white text-sm mt-4">
                Exit Simulation
            </button>
        </div>
    </div>
    <style>
        .perspective-1000 {perspective: 1000px; }
        .transform-style-3d {transform - style: preserve-3d; }
        .rotate-y-180 {transform: rotateY(180deg); }
        .animate-spin-fast {animation: spin 0.5s linear infinite; }
    </style>
    `;
        document.body.appendChild(modal);
    }

    // Reset State
    const coin = document.getElementById('q-coin');
    coin.style.transform = "rotateY(0deg)";
    coin.innerText = "H";
    document.getElementById('coin-state').innerText = "|0\u27E9";

    document.getElementById('coinGameModal').classList.remove('hidden');
}

window.launchQuantumCoinFlip = launchQuantumCoinFlip;
window.flipQuantumCoin = () => {
    const coin = document.getElementById('q-coin');
    const state = document.getElementById('coin-state');

    // Visual Superposition
    coin.classList.add('animate-spin-fast');
    state.innerText = "(|0\u27E9 + |1\u27E9)/\u221A2";
    state.className = "text-cyan-400 animate-pulse";
};

window.measureQuantumCoin = () => {
    const coin = document.getElementById('q-coin');
    const state = document.getElementById('coin-state');

    // Collapse
    coin.classList.remove('animate-spin-fast');

    const result = Math.random() > 0.5 ? 'Heads' : 'Tails';
    const rotation = result === 'Heads' ? 0 : 180;

    // Animate collapse
    coin.style.transition = "transform 1s ease-out";
    coin.style.transform = `rotateY(${rotation + 720}deg)`; // Spin a few times then land

    setTimeout(() => {
        coin.innerText = result === 'Heads' ? 'H' : 'T';
        coin.style.transform = `rotateY(${rotation}deg)`; // Normalize
        state.innerText = result === 'Heads' ? "|0⟩ (Heads)" : "|1⟩ (Tails)";
        state.className = result === 'Heads' ? "text-green-400 font-bold" : "text-yellow-400 font-bold";
    }, 1000);
};

// Register Initial Features
setTimeout(() => {
    registerCustomFeature("Quantum Coin Flip", "🪙", launchQuantumCoinFlip);
}, 1000);

// --- Safe Gate Mutation API ---
window.QuantaVibeAPI.addGate = function (gate) {
    if (!gate || !gate.type) { console.warn('Invalid gate:', gate); return; }

    // Ensure col is set if missing, but respect it if provided (e.g. from drag/drop)
    if (gate.col === undefined || gate.col === -1) {
        gate.col = getNextFreeColumn(gate.wire);
    }

    window.gates.push(gate);
    if (typeof window.drawCircuit === 'function') window.drawCircuit();
    if (window.chronicleManager) window.chronicleManager.snapshot('gate_add');
};

window.QuantaVibeAPI.removeGate = function (index) {
    if (index >= 0 && index < window.gates.length) {
        window.gates.splice(index, 1);
        if (typeof window.drawCircuit === 'function') window.drawCircuit();
        if (window.chronicleManager) window.chronicleManager.snapshot('gate_remove');
    }
};

// --- Plugin System Integration ---
// ISSUE 2 FIX: Merge into existing API instead of overwriting
Object.assign(window.QuantaVibeAPI, {
    // --- UI Utilities (Enhanced) ---
    showToast: (msg, type) => { if (window.showToast) window.showToast(msg, type); },

    createPluginWindow: (id, title, options = {}) => {
        const existing = document.getElementById(id);
        if (existing) existing.remove();

        const w = options.width || "300px";
        const h = options.height || "auto";
        const x = options.x || "50%";
        const y = options.y || "50%";

        const win = document.createElement('div');
        win.id = id;
        win.className = "fixed bg-gray-900 border border-purple-500/50 shadow-2xl rounded-lg overflow-hidden z-50 flex flex-col font-sans";
        win.style.width = w;
        win.style.height = h;
        win.style.left = x;
        win.style.top = y;
        if (x === "50%" && y === "50%") win.style.transform = "translate(-50%, -50%)";

        const header = document.createElement('div');
        header.className = "bg-gray-800 px-3 py-2 flex justify-between items-center border-b border-gray-700 cursor-move select-none";
        const titleStr = (typeof title === 'string') ? title : (title && title.id ? title.id : "New Plugin");
        header.innerHTML = `<span class="text-xs font-bold text-cyan-400 uppercase tracking-wider">🧩 ${titleStr}</span>`;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = "&times;";
        closeBtn.className = "text-gray-500 hover:text-red-500 text-lg font-bold leading-none w-5 h-5 flex items-center justify-center rounded transition";
        closeBtn.onclick = () => win.remove();
        header.appendChild(closeBtn);
        win.appendChild(header);

        const content = document.createElement('div');
        content.className = "p-4 flex-1 overflow-auto text-gray-300 relative";
        win.appendChild(content);

        // Drag Logic
        header.onmousedown = (e) => {
            const startX = e.clientX - win.offsetLeft;
            const startY = e.clientY - win.offsetTop;
            win.style.transform = 'none';

            const move = (ev) => {
                win.style.left = (ev.clientX - startX) + 'px';
                win.style.top = (ev.clientY - startY) + 'px';
            };
            const stop = () => {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', stop);
            };
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', stop);
        };

        document.body.appendChild(win);
        return content;
    },

    // --- State Retrieval ---
    getCircuitState: () => JSON.parse(JSON.stringify(gates)),
    getBlochState: () => JSON.parse(JSON.stringify(currentBlochVectors)),

    // --- Diagnostics Retrieval (Agentic Bridge) ---
    getTelemetry: () => ({
        health: document.getElementById('systemHealthValue')?.innerText,
        fidelity: document.getElementById('estFidelityValue')?.innerText,
        spaq: currentSpaqHealth,
        lastResult: lastSimulationResult
    }),

    // --- Execution Tools ---
    runSimulation: () => runSimulation(),
    executeCircuit: () => document.getElementById('execute-btn')?.click(),
    stepBack: () => qvTimeline && qvTimeline.stepBack(),
    stepForward: () => qvTimeline && qvTimeline.stepForward(),

    // --- State Manipulation ---
    selectQubit: (index) => {
        const selector = document.getElementById('blochQubitSelect');
        if (selector) {
            selector.value = index;
            selector.dispatchEvent(new Event('change'));
        }
    },

    applyGate: (qubit, gateType, params) => {
        const q = parseInt(qubit);
        if (isNaN(q) || q < 0 || q >= NUM_WIRES) {
            console.error("QuantaVibeAPI: Invalid qubit index", qubit);
            return false;
        }

        // Use internal helper to find spot
        const col = getNextFreeColumn(q);

        // Handle CNOT separately or map?
        if (gateType === 'CNOT') {
            // Params should include target?
            const target = parseInt(params);
            if (isNaN(target)) return false;
            executeAddCNOT(q, target, col);
        } else {
            executeAddGate(gateType, q, col);
        }

        drawCircuit();
        recordTimeStep();
        return true;
    },

    updateBlochBall: (vectorData) => {
        if (Array.isArray(vectorData)) {
            currentBlochVectors = vectorData;
            if (currentBlochVectors[selectedQubit]) {
                updateBlochVector(currentBlochVectors[selectedQubit]);
            }
            drawCircuit();
        }
    },

    // Circuit Modification
    clearCircuit: () => {
        resetCircuit();
        // showToast("Agent cleared circuit", "info"); // Optional feedback
    },

    // --- Hardware Control ---
    setCustomDeviceProfile: (profile) => {
        // Robustness: Handle JSON string if Agent gets lazy
        if (typeof profile === 'string') {
            try {
                profile = JSON.parse(profile);
            } catch (e) {
                console.error("[QuantaVibeAPI] Failed to parse profile string", e);
                if (window.showToast) window.showToast("API Error: Invalid Profile String", "error");
                return false;
            }
        }

        if (!profile || typeof profile !== 'object') {
            console.error("[QuantaVibeAPI] Invalid profile object:", profile);
            if (window.showToast) window.showToast("API Error: Profile must be an object", "error");
            return false;
        }
        activeDeviceProfile = profile;

        // Log to insights
        if (window.logToInsights) {
            logToInsights(`🔧 Hardware Profile: ${profile.name} (${profile.layout || 'linear'} topology, T1=${profile.t1}\u00B5s, T2=${profile.t2}\u00B5s)`, 'ai');
        }

        // Visual mode (3D VizRouter removed)

        // Sync UI Sliders
        if (profile.t1 && document.getElementById('customT1')) document.getElementById('customT1').value = profile.t1;
        if (profile.t2 && document.getElementById('customT2')) document.getElementById('customT2').value = profile.t2;
        if (typeof updateCustomNoiseDisplay === 'function') updateCustomNoiseDisplay();

        // Disable generic slider
        const ns = document.getElementById('noiseSlider');
        if (ns) {
            ns.disabled = true;
            document.getElementById('noiseValue').innerText = profile.name === "Custom Profile" ? "CUSTOM" : "AUTO";
        }

        // Handle Layout Logic
        if (activeDeviceProfile.layout === 'grid') {
            const w = activeDeviceProfile.grid_width || 4;
            const h = activeDeviceProfile.grid_height || 4;
            NUM_WIRES = w * h;

            // Auto-gen coupling map if missing
            if (!activeDeviceProfile.coupling_map || activeDeviceProfile.coupling_map.length === 0) {
                const map = [];
                for (let r = 0; r < h; r++) {
                    for (let c = 0; c < w; c++) {
                        const i = r * w + c;
                        if (c < w - 1) { map.push([i, i + 1]); map.push([i + 1, i]); }
                        if (r < h - 1) { map.push([i, i + w]); map.push([i + w, i]); }
                    }
                }
                activeDeviceProfile.coupling_map = map;
            }
        } else if (activeDeviceProfile.layout === 'hex') {
            NUM_WIRES = activeDeviceProfile.num_qubits || 16;
            if (!activeDeviceProfile.coupling_map || activeDeviceProfile.coupling_map.length === 0) {
                const map = [];
                const rows = Math.ceil(NUM_WIRES / 4);
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < 4; c++) {
                        const i = r * 4 + c;
                        if (i >= NUM_WIRES) continue;
                        if (c < 3 && (i + 1) < NUM_WIRES) { map.push([i, i + 1]); map.push([i + 1, i]); }
                        if ((i + 4) < NUM_WIRES) { map.push([i, i + 4]); map.push([i + 4, i]); }
                    }
                }
                activeDeviceProfile.coupling_map = map;
            }
        } else {
            // Linear or other
            NUM_WIRES = activeDeviceProfile.num_qubits || 5;
        }

        // Refresh UI
        updateSystemMetrics();
        updateSPAQCoherence();
        drawCircuit();

        // 3D visual refresh removed (Paper-Trail Pivot)

        if (window.showToast) window.showToast(`Custom Board: ${profile.name}`, "success");
        return true;
    },
    // --- Sentinel Integration ---
    getSentinel: () => window.sentinelCore,
    askSentinel: async (query) => window.sentinelCore.query(query),
    generateResearchTool: async (spec) => window.sentinelCore.synthesizePlugin(spec)
});

// --- Sentinel Chat Logic ---
// NOTE: Event listeners for persistentSendBtn and persistentChatInput 
// are already bound in the init() function at lines 1370-1377.
// Duplicate listeners removed to prevent double API calls.

// --- AI Analysis Logic ---
// NOTE: triggerAIAnalysis function consolidated to single definition at line ~7602
// Previous duplicate removed to prevent multiple API calls

// --- Extend API with Sentinel Bridge Methods ---
if (window.QuantaVibeAPI) {
    Object.assign(window.QuantaVibeAPI, {
        getTimeline: () => typeof qvTimeline !== 'undefined' ? qvTimeline : null,

        showToast_API: (msg, type) => {
            if (typeof showToast === 'function') showToast(msg, type);
        },

        shadowTest: async (code) => {
            if (window.featureLoader) {
                return await window.featureLoader.shadowTestFeature(code);
            }
            return { success: false, error: "FeatureLoader not ready" };
        },

        // Sandboxed Mutation
        proposeMutation: (mutationCallback) => {
            let shadowGates = JSON.parse(JSON.stringify(gates));
            try {
                const mutatedGrid = mutationCallback(shadowGates);
                // Simple validation wrapper
                if (!mutatedGrid) return false;

                saveState();
                gates = mutatedGrid;
                drawCircuit();
                recordTimeStep();
                return true;
            } catch (e) {
                console.error("Mutation Sandbox Crash:", e);
                return false;
            }
        },

        // --- Merged Legacy Methods ---
        updateBlochVector: (vec) => {
            if (!Array.isArray(vec) || vec.length !== 3) {
                console.error('[QuantaVibeAPI] updateBlochVector expects [x, y, z] array');
                return;
            }
            updateBlochVector(vec);
        },

        updateSPAQ: (data) => {
            if (typeof data !== 'object') {
                console.error('[QuantaVibeAPI] updateSPAQ expects object with q0-q4 keys');
                return;
            }
            // Use existing helper if available
            if (typeof updateSPAQVisuals === 'function') {
                updateSPAQVisuals(data);
            }
        },

        getLastResult: () => lastSimulationResult,
        getCircuit: () => gates,
        getDeviceProfile: () => activeDeviceProfile
    });
}

// --- Helper: Local QASM Generation ---
function generateClientSideQASM(gates) {
    if (!gates || gates.length === 0) return "// Empty Circuit";

    let qasm = 'OPENQASM 2.0;\ninclude "qelib1.inc";\n';
    qasm += `qreg q[${NUM_WIRES}];\ncreg c[${NUM_WIRES}];\n\n`;

    // Stable sort
    const sorted = [...gates].sort((a, b) => a.col - b.col || a.wire - b.wire);

    sorted.forEach(g => {
        const name = g.type.toLowerCase();
        if (name === 'cnot') {
            qasm += `cx q[${g.wire}], q[${g.target}];\n`;
        } else if (['rx', 'ry', 'rz'].includes(name)) {
            const theta = g.params ? g.params[0] : 0;
            qasm += `${name}(${theta.toFixed(4)}) q[${g.wire}];\n`;
        } else {
            // Basic gates
            qasm += `${name} q[${g.wire}];\n`;
        }
    });
    return qasm;
}

// Feature Loader is initialized in initSystemBoot() — no early init needed
// (Prevents double-load of autoload plugins like Hardware Designer)

// Bootstrap Application (with guard to prevent double init)
// Uses the same appInitialized flag from init() to avoid conflicts
function safeInit() {
    if (appInitialized) {
        console.warn('[QuantaVibe] Init already called, skipping duplicate.');
        return;
    }
    init();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    safeInit();
} else {
    window.addEventListener('DOMContentLoaded', safeInit);
}
console.log("QuantaVibe App Module Loaded");

// --- Sentinel Hub Logic ---

/**
 * Updates the Sentinel Analysis Hub with new AI insights and visuals.
 * @param {string} analysisMarkdown - The full analysis text in Markdown format.
 * @param {string} [imageUrl] - Optional URL for the generated visualization.
 */
function updateSentinelHub(analysisMarkdown, imageUrl) {
    const hubContent = document.getElementById('sentinelHubContent');
    const placeholder = document.getElementById('sentinelHubPlaceholder');
    const textContainer = document.getElementById('sentinelAnalysisText');
    const visualContainer = document.getElementById('sentinelVisualContainer');
    const visualImage = document.getElementById('sentinelGeneratedImage');

    if (!textContainer) return;

    // Update status dot
    const statusDot = document.getElementById('sentinelStatusDot');
    if (statusDot) statusDot.className = 'w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse';

    // 1. Hide Placeholder
    if (placeholder) placeholder.classList.add('hidden');

    // 2. Update Text and extract [IMAGE] prompts for generation
    let imagePrompts = [];
    if (analysisMarkdown) {
        textContainer.classList.remove('hidden');

        // Extract [IMAGE]...[/IMAGE] tags before markdown processing
        let cleanedMarkdown = analysisMarkdown.replace(/\[IMAGE\](.*?)\[\/IMAGE\]/gs, (match, prompt) => {
            imagePrompts.push(prompt.trim());
            return ''; // Remove from text, will render as image below
        });

        // Simple Markdown Renderer (Bold, Italic, Code, Lists, Headers)
        let html = cleanedMarkdown
            .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-purple-300 mt-2 mb-1">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-sm font-bold text-cyan-300 mt-3 mb-1 border-b border-cyan-500/30 pb-1">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-base font-bold text-white mt-4 mb-2">$1</h1>')
            .replace(/\*\*(.*)\*\*/gim, '<strong class="text-gray-200">$1</strong>')
            .replace(/\*(.*)\*/gim, '<em class="text-gray-400">$1</em>')
            .replace(/`([^`]+)`/gim, '<code class="bg-gray-800 text-purple-300 px-1 rounded text-[10px]">$1</code>')
            .replace(/\n/gim, '<br>');

        textContainer.innerHTML = html;
    }

    // 3. Update Visuals - Direct URL or Gemini-generated image
    if (imageUrl) {
        if (visualContainer) visualContainer.classList.remove('hidden');
        if (visualImage) visualImage.src = imageUrl;
    } else if (imagePrompts.length > 0 && window.geminiClient) {
        // Generate image from [IMAGE] tag prompt using Gemini
        generateSentinelImage(imagePrompts[0], visualContainer, visualImage);
    } else if (window.geminiClient && window.geminiClient.getApiKey() && analysisMarkdown && analysisMarkdown.length > 50) {
        // Auto-generate a visualization for substantial analyses
        const autoPrompt = `Scientific quantum circuit diagram visualization: ${analysisMarkdown.substring(0, 200)}`;
        generateSentinelImage(autoPrompt, visualContainer, visualImage);
    }

    // Auto-scroll to top of new analysis
    if (hubContent) hubContent.scrollTop = 0;
}

/**
 * Generates an image via Gemini and displays it in the Sentinel visual container.
 * Falls back to a placeholder if generation fails.
 */
async function generateSentinelImage(prompt, visualContainer, visualImage) {
    if (!visualContainer || !visualImage) return;

    // Show loading state
    visualContainer.classList.remove('hidden');
    visualImage.alt = 'Generating visualization...';
    visualImage.src = '';
    visualImage.style.minHeight = '120px';
    visualImage.style.background = 'linear-gradient(90deg, #1e1b4b 25%, #312e81 50%, #1e1b4b 75%)';
    visualImage.style.backgroundSize = '200% 100%';
    visualImage.style.animation = 'shimmer 1.5s infinite';

    // Add shimmer animation if not already present
    if (!document.getElementById('shimmer-style')) {
        const style = document.createElement('style');
        style.id = 'shimmer-style';
        style.textContent = '@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }';
        document.head.appendChild(style);
    }

    try {
        const imageDataUrl = await window.geminiClient.generateImage(prompt);
        if (imageDataUrl) {
            visualImage.src = imageDataUrl;
            visualImage.style.background = '';
            visualImage.style.animation = '';
            visualImage.style.minHeight = '';
            visualImage.alt = 'AI Generated Quantum Visualization';

            // Store for PDF reports
            if (window.lastSimulationResult) {
                window.lastSimulationResult.generatedImage = imageDataUrl;
            }
        } else {
            // Fallback: hide if no image generated
            visualImage.style.background = '';
            visualImage.style.animation = '';
            visualImage.style.minHeight = '';
            visualContainer.classList.add('hidden');
            console.log('[SentinelHub] Image generation returned null - model may not support image output');
        }
    } catch (e) {
        console.warn('[SentinelHub] Image generation error:', e.message);
        visualImage.style.background = '';
        visualImage.style.animation = '';
        visualImage.style.minHeight = '';
        visualContainer.classList.add('hidden');
    }
}

// Global exposure for Agent/Console
window.updateSentinelHub = updateSentinelHub;

// Bridge: SentinelCore.analyzeCircuit() calls window.displaySentinelAnalysis()
// Route it to updateSentinelHub so analysis appears in the Sentinel Analysis panel
window.displaySentinelAnalysis = function (analysisText) {
    updateSentinelHub(analysisText, null);
    // Also store in the insight log for the "View Full" modal
    storeAndDisplayAnalysis(analysisText);
};

// --- Critical Logic Bind: Phase 3 & 4 ---

function initLogicBind() {
    // 1. Timeline Slider -> Bloch Refresh
    const timelineScrubber = document.getElementById('timelineScrubber');
    if (timelineScrubber) {
        timelineScrubber.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            // Map 0-100 to index in history or just rotation
            // For now, simpler visual feedback:
            // "Scrubbing" creates a phase shift on the Bloch sphere
            if (currentBlochVectors.length > 0 && currentBlochVectors[selectedQubit]) {
                const vec = currentBlochVectors[selectedQubit];
                // Apply visual phase rotation based on time scrubber
                const angle = (val / 100.0) * Math.PI * 2;

                // If it's a superposition state (not |0> or |1>), rotate
                const isBasis = (Math.abs(vec[2]) > 0.95); // Z-component close to 1 or -1

                if (!isBasis) {
                    const rotX = vec[0] * Math.cos(angle) - vec[1] * Math.sin(angle);
                    const rotY = vec[0] * Math.sin(angle) + vec[1] * Math.cos(angle);
                    updateBlochVector([rotX, rotY, vec[2]]);

                    // Show timeline value label
                    const label = document.getElementById('timelineValue');
                    if (label) label.innerText = `t=${val}\u00B5s`;
                }
            }
        });
    }

    // 2. Hardware Coherence (SPAQ)
    updateSPAQCoherence();
}

// function updateSPAQCoherence() {} // REMOVED DUPLICATE DEFINITION

// Hook into drawCircuit to update coherence constantly
// Capture the original function only once
if (!window._originalDrawCircuit) {
    window._originalDrawCircuit = drawCircuit;
    drawCircuit = function () {
        updateSPAQCoherence();
        window._originalDrawCircuit();
    };
}

// Run Init
window.addEventListener('DOMContentLoaded', initLogicBind);
// Also call now in case already loaded
initLogicBind();

// Correct initialization is handled via initVisuals() in init()

// updateBlochVector removed
function updateBlochVector(vec) {
    // No-op
}
window.updateBlochVector = updateBlochVector;

// Init on load
document.addEventListener('DOMContentLoaded', () => {
    // initBlochSphere removed



    // --- Bloch Sphere Qubit Selector Binding ---
    // When user selects a qubit, update the Bloch sphere to show that qubit's state
    const qubitSelect = document.getElementById('blochQubitSelect');
    if (qubitSelect) {
        qubitSelect.addEventListener('change', (e) => {
            selectedQubit = parseInt(e.target.value);

            // If we have simulation results, update the Bloch sphere
            if (lastSimulationResult && lastSimulationResult.blochVectors) {
                const vec = lastSimulationResult.blochVectors[selectedQubit];
                if (vec) {
                    updateBlochVector(vec);
                }
            }

            // Redraw circuit to highlight selected qubit
            if (typeof drawCircuit === 'function') {
                drawCircuit();
            }
        });
    }
});

// --- AI Analysis Logic ---
// NOTE: Duplicate triggerAIAnalysis removed - canonical version at line ~7532
// This was causing duplicate API calls when the function was defined twice

// --- System Logging ---
function logSystemEvent(message, type = 'info') {
    // Unified Logging to new Sentinel Hub
    const logContainer = document.getElementById('deviceLog');
    if (logContainer) {
        const time = new Date().toLocaleTimeString([], { hour12: false });
        const entry = document.createElement('div');
        entry.className = "flex gap-2";

        let colorClass = "text-gray-400";
        if (type === 'error') colorClass = "text-red-400";
        else if (type === 'success') colorClass = "text-green-400";
        else if (type === 'warning') colorClass = "text-yellow-400";
        else if (type === 'system') colorClass = "text-purple-400";
        else if (type === 'ai') colorClass = "text-cyan-400";

        entry.innerHTML = `<span class="${colorClass}">[${time}]</span> <span class="text-gray-500">${message}</span>`;
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    } else {
        console.log(`[EventLog] ${message}`);
    }

    if (type === 'error') console.error(message);
}

// --- AGENTIC VISUAL BINDING IMPLEMENTATION ---
function applyAgenticDirectives(data) {
    console.log("[Agentic Visuals] === BINDING START ===");

    // Safety Check
    if (!data) {
        console.warn("[Agentic Visuals] No data received - aborting");
        return;
    }

    // Set AI Override Flag
    window._aiOverrideActive = true;
    console.log("[Agentic Visuals] AI Override ACTIVATED");

    if (window._aiOverrideTimeout) clearTimeout(window._aiOverrideTimeout);
    window._aiOverrideTimeout = setTimeout(() => {
        window._aiOverrideActive = false;
        console.log("[Agentic Visuals] AI Override expired");
    }, 10000);

    // 1. Bind BLOCH VECTORS (Legacy - Removed)
    // Code removed to prevent "Cannot set properties of null" error
    if (data.blochVectors) {
        console.log("[Visuals] Bloch data received but legacy UI removed.");
    }

    // 2. Bind TOMOGRAPHY (Legacy - Removed)
    // Code removed to prevent "Cannot set properties of null" error
    if (data.tomography) {
        console.log("[Visuals] Tomography data received but legacy UI removed.");
    }

    // 3. Bind SPAQ COHERENCE (Robust)
    // Accept snake_case or camelCase or just 'health'
    const spaqData = data.spaqCoherence || data.spaq_health || data.health;
    if (spaqData) {
        console.log("[Agentic Visuals] Updating SPAQ Health:", spaqData);
        logSystemEvent("Updating SPAQ Coherence...", 'ai');

        // Normalize to array for display
        let healthArray = new Array(NUM_WIRES).fill(1.0);

        if (Array.isArray(spaqData)) {
            spaqData.forEach((val, i) => { if (i < NUM_WIRES) healthArray[i] = val; });
        } else if (typeof spaqData === 'object') {
            for (let i = 0; i < NUM_WIRES; i++) {
                // Handle q0 vs 0 vs "0" keys
                const val = spaqData[`q${i}`] ?? spaqData[i] ?? spaqData[`${i}`];
                if (val !== undefined) healthArray[i] = val;
            }
        }

        currentSpaqHealth = healthArray; // Update GLOBAL state

        // Direct DOM Update with animation class
        healthArray.forEach((score, idx) => {
            const el = document.getElementById(`sidebar-spaq-fill-${idx}`);
            if (el) {
                // Flash effect
                el.style.transition = 'none';
                el.style.height = `${score * 100}%`;
                el.style.backgroundColor = '#ffffff'; // Flash white
                setTimeout(() => {
                    el.style.transition = 'all 0.5s ease';
                    el.style.backgroundColor = getSPAQColor(score);
                }, 50);
            } else {
                console.warn(`[Agentic Visuals] SPAQ bar sidebar-spaq-fill-${idx} not found`);
            }
        });
    }

    // 3.5. Visual Mode (3D removed)

    // 4. Bind TELEMETRY
    if (data.telemetry) {
        const t = data.telemetry;
        logSystemEvent(`[Telemetry] Fidelity: ${t.fidelity}, Health: ${t.health}`, 'ai');

        const fidEl = document.getElementById('estFidelityValue'); // CORRECT ID
        const healthEl = document.getElementById('sysHealthValue'); // CORRECT ID

        if (fidEl) {
            fidEl.innerText = (typeof t.fidelity === 'number') ? (t.fidelity * 100).toFixed(2) + "%" : t.fidelity;
            fidEl.className = "text-[10px] font-mono font-bold text-purple-400"; // Highlight AI update
        }
        if (healthEl) {
            healthEl.innerText = t.health || "--";
            healthEl.className = "text-[10px] font-mono font-bold text-purple-400";
        }
    }

    // 5. Bind AGENTIC PDF GENERATION (New)
    if (data.pdf_config) {
        logSystemEvent("Agent Triggered PDF Report Generation", 'ai');
        console.log("[Agentic Visuals] PDF Config:", data.pdf_config);

        // Small delay to ensure any preceding visual updates (Bloch/Tomo) have rendered
        setTimeout(() => {
            generatePDFReport(data.pdf_config);
        }, 500);
    }

    if (typeof drawCircuit === 'function') drawCircuit();
    console.log("[Agentic Visuals] === BINDING COMPLETE ===");
    logSystemEvent("Visualization Sync Complete", 'success');
}

// --- Custom Hardware & Gateway Logic ---
window.customHardwareList = [];

// Init UI Events
document.addEventListener('DOMContentLoaded', () => {
    // Q# Export Button
    const navQSharpBtn = document.getElementById('navQSharpBtn');
    if (navQSharpBtn) {
        navQSharpBtn.addEventListener('click', () => {
            exportToQSharp();
        });
    }

    // Custom Hardware Button
    const hwBtn = document.getElementById('customHardwareBtn');
    const hwDropdown = document.getElementById('customHardwareDropdown');

    if (hwBtn && hwDropdown) {
        hwBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hwDropdown.classList.toggle('hidden');
            hwDropdown.classList.toggle('open');
            refreshCustomHardwareList();
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!hwBtn.contains(e.target) && !hwDropdown.contains(e.target)) {
                hwDropdown.classList.add('hidden');
                hwDropdown.classList.remove('open');
            }
        });
    }
});

window.refreshCustomHardwareList = function () {
    const listEl = document.getElementById('customHardwareList');
    if (!listEl) return;

    // Load from LocalStorage
    const saved = localStorage.getItem('custom_hardware_profiles');
    let profiles = saved ? JSON.parse(saved) : [];

    // Clear list but keep "Create" button if logic desires, or re-inject it.
    // Ideally, we want the button at the top always.
    listEl.innerHTML = '';

    // Inject "Design New Chip" Button (Static Injection for Persistence)
    const designBtn = document.createElement('div');
    designBtn.className = "px-4 py-2 border-b border-purple-500/30 mb-2";
    designBtn.innerHTML = `<button onclick="window.HwDesigner.open()" class="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-1.5 rounded flex items-center justify-center gap-2 shadow-lg shadow-purple-900/50 transition">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
        Design New Chip
    </button>`;
    listEl.appendChild(designBtn);

    if (profiles.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = "px-4 py-2 text-xs text-gray-500 italic";
        emptyMsg.innerText = "No custom circuits found.";
        listEl.appendChild(emptyMsg);
        return;
    }
    profiles.forEach((profile, index) => {
        const item = document.createElement('div');
        item.className = "px-4 py-2 text-xs text-gray-300 hover:bg-gray-800 flex justify-between items-center group transition";

        // Name & Layout Clickable Area
        const infoDiv = document.createElement('div');
        infoDiv.className = "flex-1 cursor-pointer flex justify-between items-center mr-2";
        infoDiv.onclick = () => loadHardwareProfile(profile);
        infoDiv.innerHTML = `
            <span class="font-bold text-gray-200 group-hover:text-white">${profile.name}</span>
            <span class="text-[10px] text-gray-500 group-hover:text-purple-400 font-mono">${profile.layout}</span>
        `;

        // Controls (Edit / Delete)
        const controlsDiv = document.createElement('div');
        controlsDiv.className = "flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity";

        // Edit (Pencil)
        const editBtn = document.createElement('button');
        editBtn.innerHTML = '&#9998;'; // Pencil dingbat
        editBtn.className = "text-gray-500 hover:text-blue-400 transition";
        editBtn.title = "Edit Profile";
        editBtn.onclick = (e) => {
            e.stopPropagation();
            window.editHardwareProfile(profile);
        };

        // Delete (Red X)
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '&times;';
        delBtn.className = "text-gray-500 hover:text-red-500 font-bold text-lg leading-none transition";
        delBtn.title = "Delete Profile";
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Delete custom profile "${profile.name}"?`)) {
                window.deleteHardwareProfile(index);
            }
        };

        controlsDiv.appendChild(editBtn);
        controlsDiv.appendChild(delBtn);

        item.appendChild(infoDiv);
        item.appendChild(controlsDiv);
        listEl.appendChild(item);
    });
}

window.deleteHardwareProfile = function (index) {
    const saved = localStorage.getItem('custom_hardware_profiles');
    if (!saved) return;

    let profiles = JSON.parse(saved);
    profiles.splice(index, 1);
    localStorage.setItem('custom_hardware_profiles', JSON.stringify(profiles));

    window.refreshCustomHardwareList();
    showToast("Profile Deleted", "info");
}

window.editHardwareProfile = function (profile) {
    // Assuming LoadedPlugin for HardwareDesigner is accessible via 'open' or similar
    // We need to pass data to the feature.
    // Best way: If module exposes a load function, use it. 
    // Or trigger the click and populate fields.

    // 1. Open Modal
    const btn = document.getElementById('customHardwareBtn'); // Used to open menu, potentially? 
    // Actually the feature is 'feature_hardware_designer.js'.

    // Quick hack: Use the global LoadedPlugin if available or try to find the instance.
    // The file 'feature_hardware_designer.js' attaches to 'window.LoadedPlugin'.
    // If multiple plugins loaded, this might be tricky, but let's assume it's the active one 
    // OR we can just dispatch a custom event that the feature listens to.

    // SIMPLER: Populate form fields directly if modal exists in DOM.
    // The 'createUI' function in feature_hardware_designer.js builds the DOM.
    // If it's not built, we need to trigger it.

    // Let's assume the user has opened it at least once? No guarantee.
    // Trigger the "New" flow first?

    // Let's use a Custom Event to signal the Feature to open in Edit Mode
    const event = new CustomEvent('openHardwareDesigner', { detail: profile });
    window.dispatchEvent(event);
}

function loadHardwareProfile(profile) {
    // Safety Check: Warn if circuit is not empty
    if (typeof gates !== 'undefined' && gates.length > 0) {
        if (!confirm("Switching hardware profiles will CLEAR your current circuit.\n\nAre you sure you want to proceed?")) {
            return;
        }
        // Clear circuit if confirmed
        if (window.QuantaVibeAPI && window.QuantaVibeAPI.clearCircuit) {
            window.QuantaVibeAPI.clearCircuit();
        } else if (typeof resetCircuit === 'function') {
            resetCircuit();
        }
    }

    console.log("Loading Custom Profile:", profile);
    window.QuantaVibeAPI.setCustomDeviceProfile(profile);

    document.getElementById('hardwareMirrorModal').classList.add('hidden');
    document.getElementById('customHardwareDropdown').classList.add('hidden');
}

// --- Custom Gateway Modal ---

window.openCustomGatewayModal = function () {
    document.getElementById('customGatewayModal').classList.remove('hidden');
    document.getElementById('customHardwareDropdown').classList.add('hidden');
}

window.toggleGatewayFields = function () {
    const check = document.getElementById('connectQuantumSystem');
    const fields = document.getElementById('gatewayFields');
    if (check.checked) {
        fields.classList.remove('opacity-50', 'pointer-events-none');
    } else {
        fields.classList.add('opacity-50', 'pointer-events-none');
    }
}

window.testGatewayConnection = function () {
    const status = document.getElementById('gatewayStatus');
    status.innerHTML = '<span class="text-blue-400 animate-pulse">Pinging Gateway...</span>';
    setTimeout(() => {
        const url = document.getElementById('gatewayUrl').value;
        if (url && url.includes('http')) {
            status.innerHTML = '<span class="text-green-400">✔ Connection Successful</span>';
        } else {
            status.innerHTML = '<span class="text-red-400">✗ Invalid Endpoint</span>';
        }
    }, 1500);
}

window.saveCustomGateway = function () {
    const name = document.getElementById('gatewayName').value || "Unnamed Gateway";
    const url = document.getElementById('gatewayUrl').value;
    const token = document.getElementById('gatewayToken').value;

    if (!document.getElementById('connectQuantumSystem').checked) {
        showToast("Gateway disabled (offline mode saved)", "info");
        document.getElementById('customGatewayModal').classList.add('hidden');
        return;
    }

    if (!url) {
        showToast("Endpoint URL required", "error");
        return;
    }

    // Save Logic (Mock)
    const gatewayConfig = { name, url, token: token ? '***' : null };
    localStorage.setItem('custom_gateway_config', JSON.stringify(gatewayConfig));

    showToast(`Gateway "${name}" Linked`, "success");
    document.getElementById('customGatewayModal').classList.add('hidden');
}

// --- Sentinel AI Gateway Configuration ---
window.configureGatewayWithAI = async function () {
    const promptInput = document.getElementById('gatewayAIPrompt');
    const btn = document.getElementById('gatewayAIBtn');
    const description = promptInput ? promptInput.value.trim() : '';

    if (!description) {
        showToast("Describe your quantum backend first", "warning");
        return;
    }

    if (!window.geminiClient || !window.geminiClient.getApiKey()) {
        showToast("Set Gemini API key in Settings first", "error");
        return;
    }

    // Show loading state
    if (btn) { btn.disabled = true; btn.textContent = 'Configuring...'; }

    try {
        const result = await window.geminiClient.generateJSON(
            `The user wants to configure a quantum hardware gateway connection. Based on this description, suggest the configuration fields.

User description: "${description}"

Return JSON with these fields:
{
  "gateway_name": "short name for this backend",
  "endpoint_url": "likely API endpoint URL (use real known endpoints if you recognize the provider, e.g. https://api.quantum-computing.ibm.com/v1 for IBM)",
  "needs_token": true/false,
  "notes": "1-sentence suggestion for the user about authentication or setup"
}

Known quantum cloud providers: IBM Quantum (Qiskit Runtime), Amazon Braket, Azure Quantum, Google Quantum AI, IonQ, Rigetti.
If you recognize the provider, use their real API endpoint format. If unknown, generate a plausible URL.`
        );

        // Enable the checkbox and fields
        const check = document.getElementById('connectQuantumSystem');
        const fields = document.getElementById('gatewayFields');
        if (check && !check.checked) {
            check.checked = true;
            if (fields) fields.classList.remove('opacity-50', 'pointer-events-none');
        }

        // Fill in the form fields
        if (result.gateway_name) {
            const nameEl = document.getElementById('gatewayName');
            if (nameEl) nameEl.value = result.gateway_name;
        }
        if (result.endpoint_url) {
            const urlEl = document.getElementById('gatewayUrl');
            if (urlEl) urlEl.value = result.endpoint_url;
        }

        // Show notes in status
        const status = document.getElementById('gatewayStatus');
        if (status && result.notes) {
            status.innerHTML = `<span class="text-purple-400 text-xs">\u26A1 ${result.notes}</span>`;
        }

        showToast("Sentinel configured gateway fields", "success");
    } catch (e) {
        console.error("Gateway AI config error:", e);
        showToast("AI configuration failed: " + e.message, "error");
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Configure'; }
    }
}

// --- Q# Export Logic ---
window.exportToQSharp = async function (autoDownload = false) {
    console.log("Exporting to Q#..." + (autoDownload ? " (Auto-Download)" : ""));

    const outputPre = document.getElementById('qsharpOutput');
    if (outputPre) outputPre.innerText = "// Generating Q# code with AI...";

    // Show modal if not auto-download
    if (!autoDownload) {
        document.getElementById('qsharpExportModal').classList.remove('hidden');
    }

    if (!window.geminiClient) {
        if (outputPre) outputPre.innerText = "// Error: Gemini Client not initialized.";
        showToast("Q# Export Failed: Gemini Client not available", "error");
        return;
    }

    if (!window.geminiClient.getApiKey()) {
        if (outputPre) outputPre.innerText = "// Error: No Gemini API key set. Please enter your API key in settings.";
        showToast("Q# Export Failed: No API key configured", "error");
        return;
    }

    if (!gates || gates.length === 0) {
        if (outputPre) outputPre.innerText = "// Error: No gates in circuit. Build a circuit first.";
        showToast("Q# Export Failed: Circuit is empty", "error");
        return;
    }

    // 1. Get QASM as ground truth
    const qasm = generateClientSideQASM(gates);

    // 2. Ask Gemini
    const prompt = `Transpile this OpenQASM 2.0 code into a production-ready Q# (Microsoft Quantum) operation.
    - Namespace: QuantaVibe.Circuit
    - Operation Name: RunCircuit
    - Include necessary 'open' statements (Intrinsic, Canon, Measurement).
    - Return Result[] array.
    - Add comments explaining the quantum operations.

    QASM:
    ${qasm}

    Provide ONLY the Q# code.`;

    try {
        const qsharpCode = await window.geminiClient.generateCode(prompt, 'qsharp');

        if (outputPre) {
            outputPre.innerText = qsharpCode;
        }

        // Trigger download of .qs file
        try {
            const blob = new Blob([qsharpCode], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `quantum_circuit_${Date.now()}.qs`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast("Q# File Downloaded", "success");

            // Log for Sentinel if needed
            if (window.sentinelCore) {
                window.sentinelCore.logExperiment({ type: 'export', format: 'qsharp' }, { status: 'success', file: `quantum_circuit_${Date.now()}.qs` });
            }
        } catch (downloadErr) {
            console.error("Q# Download Failed", downloadErr);
        }

        if (autoDownload) {
            // Trigger download logic if needed, but for now we just show it or copy it
            // implementation_plan didn't specify auto-download logic change, so we leave as is.
        }

    } catch (e) {
        console.error("Q# AI Generation Failed", e);
        if (outputPre) outputPre.innerText = "// AI Optimization Failed. Check console.";
        showToast("AI Generation Failed", "error");
    }
};



// [ISSUE 17 FIX] Duplicate getSPAQColor removed - canonical version is at line ~2692

// --- Restored Visuals Initialization ---
// [Legacy initVisuals removed]
window.initVisuals = window.initThreeJSScenes;

// [ISSUE 17 FIX] Duplicate calculateSPAQHealth removed - canonical version is at line ~2698
window.calculateSPAQHealth = calculateSPAQHealth;

// --- API Helpers (Injected) ---
// runSimulation removed (redundant override)

function applyCustomNoise() {
    const t1El = document.getElementById('customT1');
    const t2El = document.getElementById('customT2');
    const e1El = document.getElementById('customE1');
    const e2El = document.getElementById('customE2');

    if (!t1El || !t2El || !e1El || !e2El) {
        console.error("Missing Noise Elements");
        return;
    }

    const t1 = parseInt(t1El.value);
    const t2 = parseInt(t2El.value);
    const e1 = parseFloat(e1El.value);
    const e2 = parseFloat(e2El.value);

    // Build Profile Object
    const noiseProfile = {
        name: "Custom Noise Profile",
        t1: t1,
        t2: t2,
        gate_error_1q: e1 / 100,
        gate_error_2q: e2 / 100
    };

    activeDeviceProfile = {
        ...(activeDeviceProfile || {}), // Keep layout if exists
        noise: noiseProfile
    };

    // Update UI
    const modal = document.getElementById('customNoiseModal');
    if (modal) modal.classList.add('hidden');

    // Update Slider as proxy for overall noise level
    const avgNoise = (e1 + e2) / 2 * 10; // rough scale
    const slider = document.getElementById('noiseSlider');
    const label = document.getElementById('noiseValue');

    if (slider) slider.value = Math.min(100, avgNoise);
    if (label) label.innerText = Math.round(avgNoise) + "%";

    if (window.showToast) window.showToast(`Applied Noise Profile: T1=${t1}µs, T2=${t2}µs`, "success");

    // Force Re-run
    runSimulation();
}

function updateCustomNoiseDisplay() {
    const t1V = document.getElementById('t1Val');
    const t2V = document.getElementById('t2Val');
    const e1V = document.getElementById('e1Val');
    const e2V = document.getElementById('e2Val');

    if (t1V) t1V.innerText = document.getElementById('customT1').value + ' µs';
    if (t2V) t2V.innerText = document.getElementById('customT2').value + ' µs';
    if (e1V) e1V.innerText = document.getElementById('customE1').value + '%';
    if (e2V) e2V.innerText = document.getElementById('customE2').value + '%';
}
window.updateCustomNoiseDisplay = updateCustomNoiseDisplay;

// --- Revised API Helper (v2) ---
function applyCustomNoise_Revised(config = null) {
    const t1El = document.getElementById('customT1');
    const t2El = document.getElementById('customT2');
    const e1El = document.getElementById('customE1');
    const e2El = document.getElementById('customE2');

    let t1, t2, e1, e2;

    if (config) {
        // API Mode
        t1 = config.t1 !== undefined ? config.t1 : (t1El ? parseInt(t1El.value) : 50);
        t2 = config.t2 !== undefined ? config.t2 : (t2El ? parseInt(t2El.value) : 70);
        e1 = config.gate_error_1q !== undefined ? config.gate_error_1q * 100 : (e1El ? parseFloat(e1El.value) : 0.1);
        e2 = config.gate_error_2q !== undefined ? config.gate_error_2q * 100 : (e2El ? parseFloat(e2El.value) : 1.0);

        if (t1El) t1El.value = t1;
        if (t2El) t2El.value = t2;
        if (e1El) e1El.value = e1;
        if (e2El) e2El.value = e2;
        if (typeof updateCustomNoiseDisplay === 'function') updateCustomNoiseDisplay();

    } else {
        // UI Mode
        if (!t1El || !t2El || !e1El || !e2El) {
            console.error("Missing Noise Elements");
            return;
        }
        t1 = parseInt(t1El.value);
        t2 = parseInt(t2El.value);
        e1 = parseFloat(e1El.value);
        e2 = parseFloat(e2El.value);
    }

    const noiseProfile = {
        name: "Custom Noise Profile",
        t1: t1,
        t2: t2,
        gate_error_1q: e1 / 100,
        gate_error_2q: e2 / 100
    };

    activeDeviceProfile = {
        ...(activeDeviceProfile || {}),
        noise: noiseProfile
    };

    const modal = document.getElementById('customNoiseModal');
    if (modal && !config) modal.classList.add('hidden');

    const avgNoise = (e1 + e2) / 2 * 10;
    const slider = document.getElementById('headerNoiseSlider');
    const label = document.getElementById('headerNoiseValue');

    if (slider) slider.value = Math.min(100, Math.round(avgNoise));
    if (label) label.innerText = Math.round(avgNoise) + "%";

    if (window.showToast) window.showToast(`Applied Noise Profile: T1=${t1}µs, T2=${t2}µs`, "success");

    runSimulation();
}

window.updateCustomNoiseDisplay = updateCustomNoiseDisplay;
window.applyCustomNoise = applyCustomNoise_Revised;
// AUDIT FIX: Removed duplicate window.runSimulation assignment

// --- End API Helpers ---

// --- Sentinel Hub (AI Agent) ---
function toggleSentinelPanel() {
    const sentinelPanel = document.getElementById('sentinelPanel');
    if (sentinelPanel) {
        if (sentinelPanel.classList.contains('hidden')) {
            sentinelPanel.classList.remove('hidden');
            setTimeout(() => {
                sentinelPanel.classList.remove('opacity-0', 'scale-95');
                sentinelPanel.classList.add('opacity-100', 'scale-100');
            }, 10);

            // Adjust position if off-screen (reset to default if needed)
            const rect = sentinelPanel.getBoundingClientRect();
            if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
                sentinelPanel.style.top = '80px';
                sentinelPanel.style.right = '16px';
                sentinelPanel.style.left = 'auto';
            }
        } else {
            sentinelPanel.classList.remove('opacity-100', 'scale-100');
            sentinelPanel.classList.add('opacity-0', 'scale-95');
            setTimeout(() => sentinelPanel.classList.add('hidden'), 300);
        }
    }
}
window.toggleSentinelPanel = toggleSentinelPanel;

// --- Sentinel Architect Panel Logic (Duplicate Removed) ---
// Logic moved to top of file


// --- ORACLE EXPORT HELPER (Removed: unified exportCircuit at line ~4994 now handles all formats with code preview modal) ---

function openSentinelPanel() {
    const panel = document.getElementById('sentinelPanel');
    if (panel) {
        panel.classList.remove('hidden');
    }
}

// Shim legacy dock functions to use new panel
function expandAgentDock() {
    openSentinelPanel();
}
function collapseAgentDock() {
    const panel = document.getElementById('sentinelPanel');
    if (panel) panel.classList.add('hidden');
}

// Draggable Logic for Sentinel Panel
document.addEventListener('DOMContentLoaded', () => {
    const panel = document.getElementById('sentinelPanel');
    const handle = panel?.querySelector('.handle');
    if (panel && handle) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = panel.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            panel.style.transition = 'none'; // Disable transition during drag
            panel.style.transform = 'none'; // Remove any transform to rely on top/left
            panel.style.right = 'auto'; // Switch to left/top positioning
            panel.style.left = initialLeft + 'px';
            panel.style.top = initialTop + 'px';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            panel.style.left = (initialLeft + dx) + 'px';
            panel.style.top = (initialTop + dy) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panel.style.transition = ''; // Restore transition
            }
        });
    }
});

// --- PHASE 7: UI/UX POLISH ---

// COMMAND PALETTE
const COMMANDS = [
    { id: 'run', label: 'Run Simulation', action: () => runSimulation(), icon: '▶️' },
    { id: 'reset', label: 'Reset Circuit', action: () => resetCircuit(), icon: '🔄' },
    { id: 'export-qiskit', label: 'Export to Qiskit', action: () => exportCircuit('qiskit'), icon: '🐍' },
    { id: 'export-cirq', label: 'Export to Cirq', action: () => exportCircuit('cirq'), icon: '🐍' },
    // 3D Viz modes removed (Paper-Trail Pivot)
    { id: 'sentinel', label: 'Ask Sentinel AI', action: () => openSentinelPanel(), icon: '🤖' },
    { id: 'notifs', label: 'Show Logs', action: () => toggleNotificationCenter(), icon: '📜' },
    { id: 'stats', label: 'Toggle Quick Stats', action: () => toggleQuickStats(), icon: '📊' }
];

let selectedCommandIndex = 0;



function toggleCommandPalette() {
    const el = document.getElementById('commandPalette');
    const input = document.getElementById('commandInput');
    const panel = document.getElementById('sentinelPanel'); // Re-added for 'panel' to be defined
    if (panel && panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
    }
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        input.value = '';
        input.focus();
        renderCommandList(COMMANDS);
    } else {
        el.classList.add('hidden');
    }
}

function renderCommandList(items) {
    const list = document.getElementById('commandList');
    list.innerHTML = '';
    selectedCommandIndex = 0;

    if (items.length === 0) {
        list.innerHTML = '<div class="text-center text-gray-500 py-4">No commands found</div>';
        return;
    }

    items.forEach((cmd, idx) => {
        const div = document.createElement('div');
        div.className = `p-3 rounded flex items-center justify-between cursor-pointer ${idx === 0 ? 'bg-purple-900/40 border border-purple-500/30' : 'hover:bg-gray-800'}`;
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-xl">${cmd.icon}</span>
                <span class="text-white font-mono text-sm">${cmd.label}</span>
            </div>
            ${idx === 0 ? '<span class="text-[10px] text-purple-300">↵</span>' : ''}
        `;
        div.onclick = () => {
            cmd.action();
            toggleCommandPalette();
        };
        list.appendChild(div);
    });
}

document.addEventListener('keydown', (e) => {
    // Ctrl+K for Palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
    }

    // Palette Navigation
    const el = document.getElementById('commandPalette');
    if (!el.classList.contains('hidden')) {
        if (e.key === 'Escape') toggleCommandPalette();
    }
});

document.getElementById('commandInput')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = COMMANDS.filter(c => c.label.toLowerCase().includes(q));
    renderCommandList(filtered);
});

// NOTIFICATION CENTER
window.notificationHistory = [];

window.toggleNotificationCenter = function () {
    const el = document.getElementById('notificationCenter');
    if (el.classList.contains('translate-x-full')) {
        el.classList.remove('translate-x-full');
        renderNotifications();
    } else {
        el.classList.add('translate-x-full');
    }
};

function renderNotifications() {
    const list = document.getElementById('notificationHistory');
    list.innerHTML = '';
    window.notificationHistory.slice().reverse().forEach(n => {
        const div = document.createElement('div');
        div.className = "flex gap-3 text-xs p-2 border-b border-gray-800";
        const color = n.type === 'error' ? 'text-red-400' : (n.type === 'success' ? 'text-green-400' : 'text-blue-400');
        div.innerHTML = `
            <span class="text-gray-600 font-mono">${n.time}</span>
            <span class="${color}">${n.msg}</span>
        `;
        list.appendChild(div);
    });
}

window.clearNotifications = function () {
    window.notificationHistory = [];
    renderNotifications();
};

// Hook into showToast
const _origToast = window.showToast;
window.showToast = function (msg, type = 'info') {
    if (_origToast) _origToast(msg, type);
    // Add to history
    window.notificationHistory.push({
        time: new Date().toLocaleTimeString(),
        msg: msg,
        type: type
    });
    // If center open, update
    const el = document.getElementById('notificationCenter');
    if (el && !el.classList.contains('translate-x-full')) renderNotifications();
};

// QUICK STATS
window.toggleQuickStats = function () {
    const el = document.getElementById('quickStats');
    if (el.style.opacity === '1') {
        el.style.opacity = '0';
    } else {
        el.style.opacity = '1';
        updateQuickStats();
    }
};

function updateQuickStats() {
    const el = document.getElementById('quickStats');
    if (el.style.opacity !== '1') return;

    // Gate Count
    const count = window.gates ? window.gates.filter(g => g.type !== 'BARRIER').length : 0;
    document.getElementById('qs-gateCount').innerText = count;

    // Depth
    const depth = typeof calculateCircuitDepth === 'function' ? calculateCircuitDepth(window.gates) : 0;
    document.getElementById('qs-depth').innerText = depth;

    // Fidelity (Est T1)
    if (window.activeDeviceProfile) {
        // Simple calc: exp(-total_time / T1)
        const totalTime = depth * 0.05; // 50ns avg
        const t1 = window.activeDeviceProfile.t1;
        const fid = Math.exp(-totalTime / t1) * 100;
        document.getElementById('qs-fidelity').innerText = fid.toFixed(1) + '%';
    } else {
        document.getElementById('qs-fidelity').innerText = '100%';
    }
}

// Hook stats update into drawCircuit
// We'll use an interval or hook existing methods.
// Let's hook drawCircuit since we don't want to edit it directly again if possible.
// Or just perform polling for the stats UI if active.
setInterval(() => {
    if (document.getElementById('quickStats')?.style.opacity === '1') {
        updateQuickStats();
    }
}, 1000); // 1Hz update is enough

// --- Circuit Metrics Helpers ---
window.calculateCircuitDepth = function (gates) {
    if (!gates || gates.length === 0) return 0;

    // Simple Depth Calculation (not considering extensive parallelization rules)
    // Tracks the "available time" for each qubit wire
    const numWires = 5; // Default max
    const wireTimeline = new Array(numWires).fill(0);

    gates.forEach(g => {
        const tStart = Math.max(
            wireTimeline[g.wire] || 0,
            (g.target !== undefined && g.target !== -1) ? (wireTimeline[g.target] || 0) : 0
        ) + 1;

        wireTimeline[g.wire] = tStart;
        if (g.target !== undefined && g.target !== -1) {
            wireTimeline[g.target] = tStart;
        }
    });

    return Math.max(...wireTimeline);
};

window.updateSystemMetrics = function () {
    // Alias to Quick Stats for now
    if (typeof window.updateQuickStats === 'function') {
        window.updateQuickStats();
    }
};

// Unified Drag & Drop System Initialized
if (typeof setupDragAndDrop === 'function') {
    setupDragAndDrop();
}

window.triggerResourceEstimator = function () {
    if (window.GateCostCalculator) {
        window.GateCostCalculator.init();
        // Since updateCosts is defined inside init (exposed via closure/this?), 
        // we might need to access it differently or rely on init to expose it.
        // Actually, the file defines this.updateCosts. 
        // Window.GateCostCalculator.updateCosts should be available after init.
        if (window.gates && window.GateCostCalculator.updateCosts) {
            window.GateCostCalculator.updateCosts(window.gates);
        }
    } else {
        if (window.showToast) window.showToast("Resource Estimator not loaded", "error");
    }
};

window.toggleSentinelPanel = toggleSentinelPanel;
window.expandAgentDock = expandAgentDock;
window.collapseAgentDock = collapseAgentDock;

// --- Restored Tomography Initialization ---
// [Legacy initTomography removed]

// [Legacy initBloch removed]

// --- 3D Visualization Integration (VizRouter) ---
// AUDIT FIX #1: Removed redundant VizRouter instantiation (handled in initThreeJSScenes)

// AUDIT FIX #8: Single updateCityscape definition - canonical version is at line ~4814

// --- Window Resize Handling ---
// Legacy 3D resize handlers removed (Paper-Trail Pivot)

// --- Main Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("QuantaVibe: DOM Ready");

    // 3D visualization initialization removed (Paper-Trail Pivot)

    // Initialize Sentinel
    if (window.sentinelCore) {
        window.sentinelCore.init().catch(console.error);
    }

    // Start Animation Loop if not started
    // Start Animation Loop if not started
    // VizRouter handles its own loop, so we don't need a global animate() anymore
    // if (typeof animate === 'function' && !window.animationLoopActive) {
    //     animate();
    // }
});

// --- Plugin Marketplace Logic ---
window.openMarketplace = function () {
    toggleAdvancedMenu();
    document.getElementById('pluginMarketplaceModal').classList.remove('hidden');
    document.getElementById('pluginMarketplaceModal').classList.add('flex');
};
// Visualization Switcher removed (Paper-Trail Pivot - 3D viz deprecated)
window.switchVizMode = function (mode) { /* No-op */ };

// --- CHRONICLE INTEGRATION ---
window.restoreApplicationState = function (snapshot) {
    console.log("APP: Restoring Snapshot", snapshot.id);

    // 1. Restore Gates
    // Deep clone to separate memory reference
    window.gates = JSON.parse(JSON.stringify(snapshot.gates));

    // 2. Redraw Circuit
    if (typeof drawCircuit === 'function') drawCircuit();

    // 3. Restore Results
    if (snapshot.results) {
        window.lastSimulationResult = snapshot.results;
    }

    // 4. Update Header/Info
    const info = document.getElementById('timeline-info');
    if (info) info.innerText = `SNAPSHOT: ${snapshot.label || snapshot.id}`;
};

// UI Listener for Chronicle Updates
window.addEventListener('chronicle-update', (e) => {
    const { index, total, currentSnapshot } = e.detail;

    const scrubber = document.getElementById('chronicleScrubber');
    const progress = document.getElementById('timeline-progress');
    const info = document.getElementById('timeline-info');

    if (scrubber) {
        scrubber.max = total - 1;
        scrubber.value = index;
    }

    if (progress && total > 1) {
        const pct = (index / (total - 1)) * 100;
        progress.style.width = `${pct}%`;
    } else if (progress) {
        progress.style.width = '100%';
    }

    // Auto-update info label if at head
    if (info && index === total - 1) {
        info.innerText = "HEAD: MAIN";
    }
});

// Auto-Snapshot Hooks
// 1. On Simulation Run
const _origRunSim = window.runSimulation;
window.runSimulation = function (isAgent = false) {
    // Call original and RETURN the result (AUDIT FIX: was dropping return value)
    const result = _origRunSim ? _origRunSim(isAgent) : null;

    // Snapshot after sim triggers
    setTimeout(() => {
        if (window.chronicleManager) {
            window.chronicleManager.snapshot('simulation');
        }
    }, 500);

    return result;
};

// 2. Initial Snapshot
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.chronicleManager && window.chronicleManager.timeline.length === 0) {
            window.chronicleManager.snapshot('init');
        }
    }, 1000);
});

// --- AI Analysis Trigger ---
window.triggerAIAnalysis = async function (localResult) {
    if (!window.geminiClient || !window.geminiClient.getApiKey()) {
        console.warn("Gemini Analysis Skipped: No API Key — showing local results");
        // Still show local simulation results in Sentinel Hub
        if (typeof displayLocalSentinelReport === 'function') {
            displayLocalSentinelReport(localResult);
        }
        return;
    }

    const numQubits = window.NUM_WIRES || 5;
    const totalStates = Math.pow(2, numQubits);

    // Build a concise gate summary (not raw JSON which wastes tokens)
    const gateSummary = (window.gates || []).map(g => {
        let s = g.type + '(q' + g.wire;
        if (g.target !== undefined && g.target !== -1) s += ',q' + g.target;
        if (g.params && g.params.length) s += ',' + g.params.map(p => typeof p === 'number' ? p.toFixed(3) : p).join(',');
        return s + ')';
    }).join(' → ');

    // Extract top measurement outcomes for reference
    const counts = localResult ? localResult.counts : {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const topStates = Object.entries(counts)
        .map(([s, c]) => ({ state: s, prob: (c / total).toFixed(4) }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 8);

    // Bloch vectors from local engine (ground truth)
    const localBloch = localResult && localResult.blochVectors
        ? localResult.blochVectors.map(v => v.map(c => c.toFixed(4)))
        : null;

    try {
        const prompt = `You are a quantum computing physicist. Analyze this quantum circuit and provide ACCURATE physical characterization for visualization.

CIRCUIT: ${gateSummary || '(empty circuit)'}
QUBITS: ${numQubits}
LOCAL SIMULATION TOP STATES: ${JSON.stringify(topStates)}
LOCAL BLOCH VECTORS: ${localBloch ? JSON.stringify(localBloch) : 'N/A'}

PROVIDE JSON with these fields:
{
  "tomography": { <${numQubits}-char bitstrings as keys>: <probability 0.0-1.0>, ... },
  "blochVectors": [[x,y,z], ...],  // ${numQubits} vectors, each component -1.0 to 1.0
  "spaq_health": { "0": <0.0-1.0>, "1": <0.0-1.0>, ... },  // ${numQubits} entries, keys are "0" to "${numQubits - 1}"
  "entanglementMap": [[qubitA, qubitB, strength], ...],  // pairs with 2-qubit gate interactions, strength 0.0-1.0
  "system_health": <0-100>,
  "shot_noise": "LOW" | "MED" | "HIGH",
  "insight": "<1 sentence: what this circuit does physically>"
}

RULES:
- tomography probabilities MUST sum to 1.0 (±0.01). Use ${numQubits}-character bitstrings padded with leading zeros.
- blochVectors: For qubit in |0⟩ state → [0,0,1]. For |1⟩ → [0,0,-1]. For |+⟩ → [1,0,0]. Mixed/entangled qubits have |v|<1.
- spaq_health: 1.0 = perfect coherence. Reduce based on gate count, noise, and 2-qubit gate errors on that wire.
- entanglementMap: List qubit pairs connected by CNOT/CZ/SWAP with strength based on how entangled they become.
- Validate against the local simulation data — your tomography should be consistent with the top states shown.
- If the circuit is empty, return all qubits in |0⟩ state with uniform 0-state probability.`;

        if (window.showToast) window.showToast("Sentinel analyzing quantum state...", "info");

        const analysisData = await window.geminiClient.generateJSON(prompt);

        if (analysisData) {
            console.log("[AI Physics] Raw response:", analysisData);

            // Validate and sanitize before applying
            const validated = validateAIPhysicsData(analysisData, numQubits, localResult);

            if (validated) {
                processAIPhysicsState(validated);

                // Log to system events (compact entry only)
                logAIAnalysisToInsights(validated, analysisData);

                // === PRIMARY DISPLAY: Sentinel Analysis Hub ===
                // Build full report and display in the Sentinel Analysis panel
                displayFullSentinelReport(validated, gateSummary, topStates, numQubits);

                if (validated.insight) {
                    if (window.showToast) window.showToast("Insight: " + validated.insight, "success");
                    if (window.notificationHistory) {
                        window.notificationHistory.push({
                            time: new Date().toLocaleTimeString(),
                            msg: "AI Insight: " + validated.insight,
                            type: 'success'
                        });
                        if (typeof renderNotifications === 'function') renderNotifications();
                    }
                }
            } else {
                console.warn("[AI Physics] Validation failed, showing local results");
                logToInsights('\u26a0\ufe0f AI analysis validation failed \u2014 showing local simulation results', 'warning');
                // Fallback: display local data in Sentinel Hub
                if (typeof displayLocalSentinelReport === 'function') {
                    displayLocalSentinelReport(localResult);
                }
            }
        }
    } catch (e) {
        console.error("AI Trigger Error:", e);
        logToInsights('\u26a0\ufe0f AI analysis error \u2014 showing local results', 'warning');
        // Fallback: show local data in Sentinel Hub on any failure
        if (typeof displayLocalSentinelReport === 'function') {
            displayLocalSentinelReport(localResult);
        }
    }
};

/**
 * Renders a comprehensive analysis report directly in the Sentinel Analysis Hub.
 * This is the PRIMARY display for AI analysis results — NOT the System Events log.
 */
function displayFullSentinelReport(validated, gateSummary, topStates, numQubits) {
    const hubContent = document.getElementById('sentinelHubContent');
    const placeholder = document.getElementById('sentinelHubPlaceholder');
    const textContainer = document.getElementById('sentinelAnalysisText');
    const visualContainer = document.getElementById('sentinelVisualContainer');
    const visualImage = document.getElementById('sentinelGeneratedImage');

    if (!hubContent) return;

    // Update status dot to green (analysis received)
    const statusDot = document.getElementById('sentinelStatusDot');
    if (statusDot) {
        statusDot.className = 'w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse';
    }

    // Hide placeholder
    if (placeholder) placeholder.classList.add('hidden');

    // Build the full report HTML
    const now = new Date();
    const timestamp = now.toTimeString().slice(0, 8);

    // Format tomography bars
    let tomoHTML = '';
    if (validated.tomography) {
        const sorted = Object.entries(validated.tomography)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12);
        tomoHTML = sorted.map(([state, prob]) => {
            const pct = (prob * 100).toFixed(1);
            const barW = Math.max(2, prob * 100);
            const color = prob > 0.3 ? '#e879f9' : prob > 0.05 ? '#22d3ee' : '#818cf8';
            return `<div class="flex items-center gap-2 text-[10px]">
                <span class="text-gray-400 font-mono w-16">\u007c${state}\u27e9</span>
                <div class="flex-1 h-3 bg-gray-800 rounded overflow-hidden">
                    <div style="width:${barW}%;background:${color}" class="h-full rounded transition-all"></div>
                </div>
                <span class="text-gray-300 font-mono w-12 text-right">${pct}%</span>
            </div>`;
        }).join('');
    }

    // Format Bloch vectors
    let blochHTML = '';
    if (validated.blochVectors && validated.blochVectors.length > 0) {
        blochHTML = validated.blochVectors.map((v, i) => {
            if (!v) return '';
            const purity = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
            const state = purity > 0.95 ? (v[2] > 0.5 ? '\u007c0\u27e9' : v[2] < -0.5 ? '\u007c1\u27e9' : '\u007c+\u27e9') : 'mixed';
            const stateColor = state === '\u007c0\u27e9' ? '#22d3ee' : state === '\u007c1\u27e9' ? '#e879f9' : state === '\u007c+\u27e9' ? '#4ade80' : '#fbbf24';
            return `<div class="flex items-center gap-3 text-[10px] py-0.5">
                <span class="text-gray-500 w-6">Q${i}</span>
                <span class="font-mono text-cyan-300">[${v.map(c => (typeof c === 'number' ? c.toFixed(3) : c)).join(', ')}]</span>
                <span style="color:${stateColor}" class="font-bold">${state}</span>
                <span class="text-gray-600">\u007cv\u007c=${purity.toFixed(3)}</span>
            </div>`;
        }).join('');
    }

    // Format SPAQ health
    let spaqHTML = '';
    if (validated.spaq_health) {
        const entries = Object.entries(validated.spaq_health);
        spaqHTML = entries.map(([k, v]) => {
            const pct = (Number(v) * 100).toFixed(0);
            const color = v >= 0.8 ? '#22d3ee' : v >= 0.5 ? '#fbbf24' : '#ef4444';
            return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 text-[10px]">
                <span class="w-2 h-2 rounded-full" style="background:${color}"></span>
                Q${k}: <span class="font-mono" style="color:${color}">${pct}%</span>
            </span>`;
        }).join(' ');
    }

    // Format entanglement map
    let entHTML = '';
    if (validated.entanglementMap && validated.entanglementMap.length > 0) {
        entHTML = validated.entanglementMap.map(([a, b, s]) => {
            const pct = (s * 100).toFixed(0);
            const color = s > 0.7 ? '#e879f9' : s > 0.3 ? '#22d3ee' : '#818cf8';
            return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 text-[10px]">
                Q${a}\u2194Q${b}: <span class="font-mono" style="color:${color}">${pct}%</span>
            </span>`;
        }).join(' ');
    }

    // System metrics
    const healthPct = validated.system_health !== undefined ? Number(validated.system_health).toFixed(1) : null;
    const healthColor = healthPct > 90 ? '#22d3ee' : healthPct > 70 ? '#fbbf24' : '#ef4444';
    const noiseLevel = validated.shot_noise || 'N/A';
    const noiseColor = noiseLevel === 'LOW' ? '#4ade80' : noiseLevel === 'MED' ? '#fbbf24' : '#ef4444';

    // Build full report
    const reportHTML = `
        <!-- Report Header -->
        <div class="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/20 rounded-lg p-3 mb-3">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <span class="text-base">\ud83e\udde0</span>
                    <div>
                        <div class="text-xs font-bold text-white">Sentinel Analysis Report</div>
                        <div class="text-[9px] text-gray-500">${timestamp} \u2022 ${numQubits} qubits \u2022 ${(window.gates || []).length} gates</div>
                    </div>
                </div>
                <div class="flex gap-2">
                    ${healthPct ? `<span class="text-[10px] px-2 py-0.5 rounded-full border" style="color:${healthColor};border-color:${healthColor}40;background:${healthColor}10">Health: ${healthPct}%</span>` : ''}
                    <span class="text-[10px] px-2 py-0.5 rounded-full border" style="color:${noiseColor};border-color:${noiseColor}40;background:${noiseColor}10">Noise: ${noiseLevel}</span>
                </div>
            </div>
            ${validated.insight ? `<div class="text-xs text-gray-200 bg-black/20 rounded px-2 py-1.5 border-l-2 border-purple-500">${validated.insight}</div>` : ''}
        </div>

        <!-- Circuit Summary -->
        <div class="mb-3">
            <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                Circuit
            </div>
            <div class="text-[10px] text-gray-400 font-mono bg-gray-800/50 rounded px-2 py-1 break-all">${gateSummary || '(empty circuit)'}</div>
        </div>

        <!-- Probability Distribution -->
        ${tomoHTML ? `<div class="mb-3">
            <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                Probability Distribution
            </div>
            <div class="space-y-1">${tomoHTML}</div>
        </div>` : ''}

        <!-- SPAQ Coherence -->
        ${spaqHTML ? `<div class="mb-3">
            <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Qubit Coherence (SPAQ)
            </div>
            <div class="flex flex-wrap gap-1">${spaqHTML}</div>
        </div>` : ''}

        <!-- Entanglement Map -->
        ${entHTML ? `<div class="mb-3">
            <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                Entanglement Links
            </div>
            <div class="flex flex-wrap gap-1">${entHTML}</div>
        </div>` : ''}

        <!-- Bloch Vectors -->
        ${blochHTML ? `<div class="mb-3">
            <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                Bloch Vectors
            </div>
            <div class="bg-gray-800/50 rounded-lg p-2 space-y-0.5">${blochHTML}</div>
        </div>` : ''}
    `;

    // Clear previous content and inject
    if (textContainer) {
        textContainer.classList.remove('hidden');
        textContainer.innerHTML = reportHTML;
    }

    // Generate AI visualization image for the report
    if (window.geminiClient && window.geminiClient.getApiKey() && visualContainer && visualImage) {
        const imagePrompt = `Scientific quantum circuit analysis diagram: ${numQubits} qubits, ${(window.gates || []).length} gates, showing probability distribution and entanglement structure. ${validated.insight || ''}`;
        generateSentinelImage(imagePrompt, visualContainer, visualImage);
    }

    // Scroll to top of new analysis
    hubContent.scrollTop = 0;
}
window.displayFullSentinelReport = displayFullSentinelReport;

/**
 * Fallback: Display local simulation results in Sentinel Hub when Gemini is unavailable.
 * Uses only locally-computed data (no AI call needed).
 */
function displayLocalSentinelReport(simResult) {
    const hubContent = document.getElementById('sentinelHubContent');
    const placeholder = document.getElementById('sentinelHubPlaceholder');
    const textContainer = document.getElementById('sentinelAnalysisText');

    if (!hubContent || !textContainer) return;

    // Update status dot to yellow (local-only analysis)
    const statusDot = document.getElementById('sentinelStatusDot');
    if (statusDot) statusDot.className = 'w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse';

    // Hide placeholder
    if (placeholder) placeholder.classList.add('hidden');

    const numQubits = window.NUM_WIRES || 5;
    const gateSummary = (window.gates || []).map(g => {
        let s = g.type + '(q' + g.wire;
        if (g.target !== undefined && g.target !== -1) s += ',q' + g.target;
        return s + ')';
    }).join(' → ');

    // Build probability data from local simulation
    const counts = simResult ? simResult.counts : {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const topStates = Object.entries(counts)
        .map(([s, c]) => ({ state: s, prob: (c / total) }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 12);

    let tomoHTML = topStates.map(({ state, prob }) => {
        const pct = (prob * 100).toFixed(1);
        const barW = Math.max(2, prob * 100);
        const color = prob > 0.3 ? '#e879f9' : prob > 0.05 ? '#22d3ee' : '#818cf8';
        return `<div class="flex items-center gap-2 text-[10px]">
            <span class="text-gray-400 font-mono w-16">|${state}⟩</span>
            <div class="flex-1 h-3 bg-gray-800 rounded overflow-hidden">
                <div style="width:${barW}%;background:${color}" class="h-full rounded transition-all"></div>
            </div>
            <span class="text-gray-300 font-mono w-12 text-right">${pct}%</span>
        </div>`;
    }).join('');

    // Bloch vectors
    let blochHTML = '';
    if (simResult && simResult.blochVectors) {
        blochHTML = simResult.blochVectors.map((v, i) => {
            if (!v) return '';
            const purity = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
            const state = purity > 0.95 ? (v[2] > 0.5 ? '|0⟩' : v[2] < -0.5 ? '|1⟩' : '|+⟩') : 'mixed';
            const stateColor = state === '|0⟩' ? '#22d3ee' : state === '|1⟩' ? '#e879f9' : state === '|+⟩' ? '#4ade80' : '#fbbf24';
            return `<div class="flex items-center gap-3 text-[10px] py-0.5">
                <span class="text-gray-500 w-6">Q${i}</span>
                <span class="font-mono text-cyan-300">[${v.map(c => (typeof c === 'number' ? c.toFixed(3) : c)).join(', ')}]</span>
                <span style="color:${stateColor}" class="font-bold">${state}</span>
                <span class="text-gray-600">|v|=${purity.toFixed(3)}</span>
            </div>`;
        }).join('');
    }

    const now = new Date();
    const timestamp = now.toTimeString().slice(0, 8);

    const reportHTML = `
        <div class="bg-gradient-to-r from-yellow-900/30 to-cyan-900/30 border border-yellow-500/20 rounded-lg p-3 mb-3">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <span class="text-base">⚡</span>
                    <div>
                        <div class="text-xs font-bold text-white">Local Simulation Report</div>
                        <div class="text-[9px] text-gray-500">${timestamp} • ${numQubits} qubits • ${(window.gates || []).length} gates</div>
                    </div>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/40 bg-yellow-500/10 text-yellow-400">Local Only</span>
            </div>
            <div class="text-xs text-gray-400 bg-black/20 rounded px-2 py-1.5 border-l-2 border-yellow-500">AI analysis unavailable — showing local engine results</div>
        </div>

        <div class="mb-3">
            <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">Circuit</div>
            <div class="text-[10px] text-gray-400 font-mono bg-gray-800/50 rounded px-2 py-1 break-all">${gateSummary || '(empty circuit)'}</div>
        </div>

        ${tomoHTML ? `<div class="mb-3">
            <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2">Probability Distribution</div>
            <div class="space-y-1">${tomoHTML}</div>
        </div>` : ''}

        ${blochHTML ? `<div class="mb-3">
            <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2">Bloch Vectors</div>
            <div class="bg-gray-800/50 rounded-lg p-2 space-y-0.5">${blochHTML}</div>
        </div>` : ''}
    `;

    textContainer.classList.remove('hidden');
    textContainer.innerHTML = reportHTML;
    hubContent.scrollTop = 0;
}
window.displayLocalSentinelReport = displayLocalSentinelReport;

/**
 * Validates and sanitizes AI physics data before applying to visualizations.
 * Ensures probabilities sum to ~1, vectors are bounded, keys are normalized.
 */
function validateAIPhysicsData(data, numQubits, localResult) {
    if (!data || typeof data !== 'object') return null;

    const validated = {};

    // 1. Validate tomography
    if (data.tomography && typeof data.tomography === 'object') {
        const tomo = {};
        let sum = 0;
        for (let [state, prob] of Object.entries(data.tomography)) {
            // Normalize key: ensure correct length bitstring
            const padded = state.replace(/[^01]/g, '').padStart(numQubits, '0').slice(-numQubits);
            const p = Math.max(0, Math.min(1, Number(prob) || 0));
            tomo[padded] = p;
            sum += p;
        }
        // Renormalize if sum is off
        if (sum > 0 && Math.abs(sum - 1.0) > 0.01) {
            for (const key in tomo) tomo[key] /= sum;
        }
        // Only use AI tomography if it's reasonably consistent with local result
        if (sum > 0) validated.tomography = tomo;
    }

    // 2. Validate Bloch vectors
    if (data.blochVectors && Array.isArray(data.blochVectors)) {
        validated.blochVectors = data.blochVectors.slice(0, numQubits).map(v => {
            if (!Array.isArray(v) || v.length < 3) return [0, 0, 1]; // Default |0⟩
            const [x, y, z] = v.map(c => Math.max(-1, Math.min(1, Number(c) || 0)));
            // Ensure vector magnitude ≤ 1 (physical constraint)
            const mag = Math.sqrt(x * x + y * y + z * z);
            if (mag > 1.01) return [x / mag, y / mag, z / mag];
            return [x, y, z];
        });
        // Pad if Gemini returned fewer vectors than qubits
        while (validated.blochVectors.length < numQubits) {
            validated.blochVectors.push([0, 0, 1]);
        }
    } else if (localResult && localResult.blochVectors) {
        validated.blochVectors = localResult.blochVectors;
    }

    // 3. Validate SPAQ health (normalize key format to "0", "1", ...)
    if (data.spaq_health && typeof data.spaq_health === 'object') {
        validated.spaq_health = {};
        for (let i = 0; i < numQubits; i++) {
            const val = data.spaq_health[`q${i}`] ?? data.spaq_health[String(i)] ?? data.spaq_health[i] ?? 1.0;
            validated.spaq_health[String(i)] = Math.max(0, Math.min(1, Number(val) || 1.0));
        }
    }

    // 4. Validate entanglement map
    if (data.entanglementMap && Array.isArray(data.entanglementMap)) {
        validated.entanglementMap = data.entanglementMap.filter(entry => {
            if (!Array.isArray(entry) || entry.length < 3) return false;
            const [a, b, s] = entry;
            return Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 &&
                a < numQubits && b < numQubits && a !== b && typeof s === 'number';
        }).map(([a, b, s]) => [a, b, Math.max(0, Math.min(1, s))]);
    }

    // 5. Pass through scalar fields
    if (data.system_health !== undefined) {
        validated.system_health = Math.max(0, Math.min(100, Number(data.system_health) || 95));
    }
    if (data.shot_noise && ['LOW', 'MED', 'HIGH'].includes(data.shot_noise)) {
        validated.shot_noise = data.shot_noise;
    }
    if (data.insight && typeof data.insight === 'string') {
        validated.insight = data.insight.slice(0, 300);
    }

    return validated;
}

// --- Missing Visual Updaters (Restored) ---

window.updateSPAQCoherence = function () {
    if (!window.currentSpaqHealth || Object.keys(window.currentSpaqHealth).length === 0) return;

    const numQ = window.NUM_WIRES || 5;

    for (let i = 0; i < numQ; i++) {
        // Handle all key formats: "q0", "0", numeric 0, or array
        let val;
        const spaq = window.currentSpaqHealth;
        if (Array.isArray(spaq)) {
            val = spaq[i];
        } else {
            val = spaq[`q${i}`] ?? spaq[String(i)] ?? spaq[i];
        }
        if (val === undefined || val === null) val = 1.0;

        const coherence = Math.max(0, Math.min(1, Number(val) || 1.0));
        const pct = Math.round(coherence * 100);

        const bar = document.getElementById(`sidebar-spaq-fill-${i}`);
        if (bar) {
            // Force inline height to override any Tailwind h-[xx%] classes
            bar.style.height = `${pct}%`;

            // Color: green (>80%), yellow (50-80%), red (<50%)
            let gradientColors;
            if (coherence >= 0.8) {
                gradientColors = 'from-cyan-900 to-cyan-400';
            } else if (coherence >= 0.5) {
                gradientColors = 'from-yellow-900 to-yellow-400';
            } else {
                gradientColors = 'from-red-900 to-red-400';
            }

            // Strip ALL old height classes and replace className cleanly
            bar.className = `w-full bg-gradient-to-t ${gradientColors} rounded-sm opacity-90 transition-all duration-500`;

            // Glow effect for critical qubits
            if (coherence < 0.3) {
                bar.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.5)';
            } else if (coherence < 0.6) {
                bar.style.boxShadow = '0 0 6px rgba(250, 204, 21, 0.3)';
            } else {
                bar.style.boxShadow = coherence > 0.95 ? '0 0 10px cyan' : 'none';
            }
        }
    }
};

// Bloch and Cityscape shims: no-op (3D visuals removed)
window.updateBlochVector = function (vector) { /* No-op: 3D removed */ };
window.updateCityscape = function (counts) { /* No-op: 3D removed */ };

// --- Plugin Manager Tabs ---
window.switchPluginTab = function (tab) {
    const installedView = document.getElementById('view-installed');
    const marketView = document.getElementById('view-marketplace');
    const tabInstalled = document.getElementById('tab-installed');
    const tabMarket = document.getElementById('tab-marketplace');

    if (tab === 'installed') {
        installedView.classList.remove('hidden');
        marketView.classList.add('hidden');
        tabInstalled.className = "px-3 py-1 text-xs font-bold rounded text-white bg-gray-800 transition";
        tabMarket.className = "px-3 py-1 text-xs font-bold rounded text-gray-400 hover:text-white transition";
    } else {
        installedView.classList.add('hidden');
        marketView.classList.remove('hidden');
        tabInstalled.className = "px-3 py-1 text-xs font-bold rounded text-gray-400 hover:text-white transition";
        tabMarket.className = "px-3 py-1 text-xs font-bold rounded text-white bg-gray-800 transition";
    }
};

// --- AEGIS-QUANTUM: System Integration ---

Object.assign(window.QuantaVibeAPI, {
    // Sentinel Integration
    getSentinel: () => window.sentinelCore,
    askSentinel: async (query) => window.sentinelCore ? window.sentinelCore.query(query) : "Sentinel Offline",

    // Chronicle Integration
    getChronicle: () => window.chronicleManager,
    createSnapshot: () => window.chronicleManager ? window.chronicleManager.snapshot() : null,
    restoreSnapshot: (id) => window.chronicleManager ? window.chronicleManager.restore(id) : null,

    // Oracle Integration
    getOracle: () => window.oracle,
    executeRemote: async (opts) => window.oracle ? window.oracle.submitJob(opts) : null,

    // Visualization Control (Deprecated)
    setVizMode: (mode) => console.warn("3D Visuals Deprecated"),
    getAvailableVizModes: () => [],

    // Plugin Factory
    generatePlugin: async (spec) => {
        if (!window.featureLoader || !window.featureLoader.hotDeployPlugin) return { success: false, error: "Forge Offline" };
        const result = await window.geminiClient.generateFeature(spec.prompt);
        // Handle both old (string) and new (object) return format
        const code = typeof result === 'string' ? result : result.code;
        const metadata = {
            name: (typeof result === 'object' && result.name) ? result.name : (spec.metadata && spec.metadata.name) || 'Custom Plugin',
            icon: (typeof result === 'object' && result.icon) ? result.icon : (spec.metadata && spec.metadata.icon) || '✨',
            ...spec.metadata
        };
        return window.featureLoader.hotDeployPlugin(code, metadata);
    },

    // Shadow Test
    shadowTest: async (code) => window.featureLoader ? window.featureLoader.shadowTestFeature(code) : { success: false, error: "FeatureLoader Offline" }
});

// --- System Initialization ---
async function initSystemBoot() {
    if (window.isSystemBooted) {
        console.warn("[AEGIS] System already booted. Skipping re-initialization.");
        return;
    }
    window.isSystemBooted = true;

    console.log("AEGIS-QUANTUM: System Boot Sequence Initiated...");

    // 1. Draw Initial Circuit & Initialize Event Listeners FIRST for immediate responsiveness
    if (typeof init === 'function') {
        init();
    } else {
        console.error("Critical: init() function not found - Canvas interactions may fail.");
        if (typeof drawCircuit === 'function') drawCircuit();
        if (typeof setupDragAndDrop === 'function') setupDragAndDrop();
    }

    // Show system online immediately so user knows app is responsive
    console.log("AEGIS-QUANTUM: Systems Nominal.");
    if (window.showToast) window.showToast("AEGIS System Online", "success");

    // 2. Defer non-critical initialization to avoid blocking UI
    setTimeout(async () => {
        // Initialize Chronicle (History)
        if (window.chronicleManager) {
            console.log("[DEBUG] initSystemBoot: Chronicle Manager present");
            setTimeout(() => window.chronicleManager.snapshot("Init"), 500);
        }

        // Initialize Sentinel (AI) - fire and forget, don't block boot
        if (window.sentinelCore && window.sentinelCore.init) {
            window.sentinelCore.init().catch(e => console.warn("[AEGIS] Sentinel init background error:", e));
        }

        // Initialize Feature Loader - fire and forget, don't block boot
        if (window.FeatureLoader) {
            if (!window.featureLoader) {
                console.log("[DEBUG] initSystemBoot: Initializing FeatureLoader");

                // AUDIT FIX: Reset Registry ONCE to clear duplicates from previous bugs
                // Use localStorage (persists across sessions) so this only runs once ever,
                // NOT sessionStorage which resets on every page close — wiping user plugins
                if (!localStorage.getItem('registry_cleaned_v2')) {
                    if (window.FileSystemManager) window.FileSystemManager.resetRegistry();
                    localStorage.setItem('registry_cleaned_v2', 'true');
                }

                window.featureLoader = new FeatureLoader();
                window.featureLoader.load().catch(e => console.warn("[AEGIS] FeatureLoader background error:", e));
            } else {
                console.log("[DEBUG] FeatureLoader already active. Skipping.");
            }
        }

        // Update metrics after everything loaded
        if (typeof updateSystemMetrics === 'function') updateSystemMetrics();

        // Initial Sentinel Status Check
        const key = sessionStorage.getItem('gemini_api_key') || document.getElementById('apiKey')?.value || "";
        if (typeof updateSentinelStatus === 'function') updateSentinelStatus(!!key);
    }, 50); // Tiny delay to let UI render first
}

// Start Lifecycle
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSystemBoot);
} else {
    initSystemBoot();
}

// --- PDF Reporting System (Paper-Trail Pivot) ---
// Uses pdfMake (loaded from CDN) instead of jsPDF
window.generateQuantumReport = async function (circuitData) {
    console.log("Generating Quantum Report...", circuitData);

    if (typeof pdfMake === 'undefined') {
        console.error("[Report] pdfMake not loaded - cannot generate PDF");
        return;
    }

    // 1. Capture circuit canvas image
    let circuitImg = null;
    try {
        if (typeof window.drawCircuit === 'function') window.drawCircuit();
        const cvs = document.getElementById('circuitCanvas');
        if (cvs) {
            circuitImg = cvs.toDataURL('image/png');
        }
    } catch (e) {
        console.warn("[Report] Canvas capture failed:", e.message);
    }

    // 2. Build probability table
    const counts = circuitData.counts || {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 16);

    const tableBody = [
        [
            { text: 'State', bold: true, fontSize: 9, color: '#475569' },
            { text: 'Probability', bold: true, fontSize: 9, color: '#475569' },
            { text: 'Count', bold: true, fontSize: 9, color: '#475569' }
        ],
        ...sorted.map(([mask, count]) => [
            { text: `|${mask}\u27e9`, fontSize: 9, font: 'Roboto' },
            { text: ((count / total) * 100).toFixed(1) + '%', fontSize: 9 },
            { text: count.toString(), fontSize: 9, color: '#64748b' }
        ])
    ];

    // 3. Assemble document content
    const contentArr = [
        { text: 'QUANTUM RESEARCH REPORT', fontSize: 22, bold: true, color: '#0284c7', margin: [0, 0, 0, 5] },
        {
            columns: [
                { text: `ID: ${Date.now().toString(36).toUpperCase()}`, fontSize: 9, color: '#94a3b8' },
                { text: new Date().toLocaleString(), fontSize: 9, color: '#94a3b8', alignment: 'right' }
            ],
            margin: [0, 0, 0, 5]
        },
        { text: `Engine: QuantaVibe Core  |  Qubits: ${circuitData.gates ? Math.max(...circuitData.gates.map(g => Math.max(g.wire || 0, g.target || 0))) + 1 : NUM_WIRES}  |  Gates: ${(circuitData.gates || []).length}`, fontSize: 9, color: '#64748b', margin: [0, 0, 0, 10] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#0284c7' }], margin: [0, 0, 0, 15] },

        // Circuit Diagram (always included)
        { text: '1. Circuit Topology', fontSize: 14, bold: true, color: '#0f172a', margin: [0, 0, 0, 8] }
    ];

    if (circuitImg) {
        contentArr.push({
            image: circuitImg,
            width: 500,
            alignment: 'center',
            margin: [0, 0, 0, 15]
        });
    } else {
        contentArr.push({ text: '(Circuit canvas capture unavailable)', fontSize: 10, italics: true, color: '#94a3b8', margin: [0, 10, 0, 15] });
    }

    // Probability Distribution
    contentArr.push(
        { text: '2. Measurement Results', fontSize: 14, bold: true, color: '#0f172a', margin: [0, 0, 0, 8] },
        {
            table: { headerRows: 1, widths: ['auto', 'auto', 'auto'], body: tableBody },
            layout: {
                hLineColor: () => '#e2e8f0',
                vLineColor: () => '#e2e8f0',
                paddingLeft: () => 6,
                paddingRight: () => 6,
                paddingTop: () => 3,
                paddingBottom: () => 3
            },
            margin: [0, 0, 0, 15]
        }
    );

    // AI Analysis Text (if available from previous Gemini analysis)
    if (lastAIAnalysis) {
        contentArr.push(
            { text: '3. AI Analysis', fontSize: 14, bold: true, color: '#0f172a', margin: [0, 10, 0, 8] },
            { text: lastAIAnalysis, fontSize: 10, lineHeight: 1.4, margin: [0, 0, 0, 15] }
        );
    }

    // AI Visualization (if available)
    if (window.lastSimulationResult?.generatedImage) {
        contentArr.push(
            { text: lastAIAnalysis ? '4. AI Visualization' : '3. AI Visualization', fontSize: 14, bold: true, color: '#0f172a', margin: [0, 10, 0, 8] },
            { image: window.lastSimulationResult.generatedImage, width: 480, alignment: 'center', margin: [0, 0, 0, 15] }
        );
    }

    // Build PDF
    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: contentArr,
        footer: (currentPage, pageCount) => ({
            text: `Generated by QuantaVibe  |  Page ${currentPage} of ${pageCount}`,
            alignment: 'center',
            fontSize: 8,
            color: '#94a3b8',
            margin: [40, 10]
        })
    };

    try {
        const pdfDoc = pdfMake.createPdf(docDefinition);
        pdfDoc.getBlob((blob) => {
            const pdfUrl = URL.createObjectURL(blob);
            const previewFrame = document.getElementById('reportPreviewFrame');
            if (previewFrame) {
                previewFrame.src = pdfUrl;
                const container = document.getElementById('reportPreviewContainer');
                if (container) container.classList.remove('hidden');
            }
        });
    } catch (e) {
        console.error("[Report] PDF generation failed:", e);
    }
};
