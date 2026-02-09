/**
 * ChronicleManager.js
 * Manages the "Time Machine" functionality for QuantaVibe.
 * Handles state snapshotting, branching, and restoration.
 */

class ChronicleManager {
    constructor() {
        this.timeline = []; // Array of Snapshot objects
        this.branches = new Map(); // branchName -> [Snapshot]
        this.currentBranch = 'main';
        this.currentIndex = -1; // Pointer to current state in timeline
        this.maxSnapshots = 50; // Limit timeline size to prevent memory bloat
        this._lastSnapshotTime = 0;
        this._snapshotThrottleMs = 500; // Min 500ms between snapshots
        this._pendingSnapshot = null;

        // Auto-init
        this.branches.set('main', this.timeline);

        console.log("CHRONICLE: Initialized");
    }

    // Capture full application state (throttled)
    snapshot(actionType = 'manual') {
        const now = Date.now();

        // Throttle: if called too frequently, debounce to avoid perf issues
        if (actionType !== 'manual' && actionType !== 'Init' && (now - this._lastSnapshotTime) < this._snapshotThrottleMs) {
            // Schedule a deferred snapshot if not already pending
            if (!this._pendingSnapshot) {
                this._pendingSnapshot = setTimeout(() => {
                    this._pendingSnapshot = null;
                    this._doSnapshot(actionType);
                }, this._snapshotThrottleMs);
            }
            return null;
        }

        return this._doSnapshot(actionType);
    }

    _doSnapshot(actionType) {
        try {
            this._lastSnapshotTime = Date.now();

            const state = {
                id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                timestamp: Date.now(),
                label: `State at ${new Date().toLocaleTimeString()}`,
                actionType: actionType,
                // Deep copy critical state
                gates: window.gates ? JSON.parse(JSON.stringify(window.gates)) : [],
                circuitState: window.QuantaVibeAPI && window.QuantaVibeAPI.getCircuitState ? window.QuantaVibeAPI.getCircuitState() : null,
                deviceProfile: window.activeDeviceProfile ? JSON.parse(JSON.stringify(window.activeDeviceProfile)) : null,
                results: window.lastSimulationResult ? JSON.parse(JSON.stringify(window.lastSimulationResult)) : null
            };

            // Truncate future if not at end
            if (this.currentIndex < this.timeline.length - 1) {
                this.timeline.splice(this.currentIndex + 1);
            }

            this.timeline.push(state);
            this.currentIndex = this.timeline.length - 1;

            // Evict oldest snapshots if over limit
            while (this.timeline.length > this.maxSnapshots) {
                this.timeline.shift();
                this.currentIndex--;
            }

            console.log(`CHRONICLE: Snapshot created [${state.id}] (${actionType}) [${this.timeline.length}/${this.maxSnapshots}]`);
            this.updateUI();

            return state;
        } catch (e) {
            console.error("CHRONICLE: Snapshot failed", e);
            return null;
        }
    }

    // Restore state from timeline index
    restore(index) {
        if (index < 0 || index >= this.timeline.length) return;

        const state = this.timeline[index];
        this.currentIndex = index;

        console.log(`CHRONICLE: Restoring state [${state.id}]...`);

        // Application specific restore logic
        if (window.restoreApplicationState) {
            window.restoreApplicationState(state);
        } else {
            console.warn("CHRONICLE: window.restoreApplicationState not implemented!");
        }

        this.updateUI();
    }

    // Jump to specific snapshot ID
    jumpToId(id) {
        const idx = this.timeline.findIndex(s => s.id === id);
        if (idx !== -1) this.restore(idx);
    }

    // Step back
    undo() {
        if (this.currentIndex > 0) this.restore(this.currentIndex - 1);
    }

    // Step forward
    redo() {
        if (this.currentIndex < this.timeline.length - 1) this.restore(this.currentIndex + 1);
    }

    getHistory() {
        return this.timeline;
    }

    updateUI() {
        // Dispatch event for UI to update
        const event = new CustomEvent('chronicle-update', {
            detail: {
                index: this.currentIndex,
                total: this.timeline.length,
                currentSnapshot: this.timeline[this.currentIndex]
            }
        });
        window.dispatchEvent(event);
    }
}

// Global Instance
window.chronicleManager = new ChronicleManager();
