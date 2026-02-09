/**
 * FileSystemManager.js
 * Virtual File System (VFS) using localStorage.
 */

const VFS_PREFIX = 'qv_vfs:';
const REGISTRY_KEY = 'qv_registry';

class FileSystemManager {
    static saveFile(path, content) {
        try {
            localStorage.setItem(VFS_PREFIX + path, content);
            return true;
        } catch (e) {
            console.error('[VFS] Save failed:', e);
            return false;
        }
    }

    static readFile(path) {
        return localStorage.getItem(VFS_PREFIX + path);
    }

    static listFiles(directory = '') {
        const files = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(VFS_PREFIX + directory)) {
                files.push(key.replace(VFS_PREFIX, ''));
            }
        }
        return files;
    }

    static deleteFile(path) {
        localStorage.removeItem(VFS_PREFIX + path);
    }

    static getRegistry() {
        const defaults = [
            { name: "Qubit Transformer Game", icon: "🎮", file: "qubitGame.js", type: 'static' },
            { name: "Quantum Puzzle Game", icon: "🧩", file: "quantum-puzzle-game.js", type: 'static' },
            { name: "Q# File Manager", icon: "⚛️", file: "qs_file_manager.js", type: 'static' },
            { name: "Sentinel Probe", icon: "📡", file: "f_sentinel_demo.js", type: 'static' },
            { name: "Hardware Designer", icon: "🛠️", file: "feature_hardware_designer.js", type: 'static' }
        ];

        let registry = [];
        const stored = localStorage.getItem(REGISTRY_KEY);

        if (stored) {
            registry = JSON.parse(stored);

            // SECURITY PATCH: Deduplicate by Name to fix "Multiple Messages" bug
            const uniqueNames = new Set();
            const uniqueRegistry = [];

            // Prioritize defaults? Or existing?
            // Let's take the first occurrence, but ensure defaults are present.
            // Actually, let's filter the LOADED registry first.
            for (const item of registry) {
                if (!uniqueNames.has(item.name)) {
                    uniqueNames.add(item.name);
                    uniqueRegistry.push(item);
                }
            }
            registry = uniqueRegistry;

            let dirty = false;
            defaults.forEach(d => {
                if (!registry.find(r => r.file === d.file)) {
                    // Check if name conflict exists (e.g. valid file but same name?)
                    if (!uniqueNames.has(d.name)) {
                        registry.push(d);
                        uniqueNames.add(d.name);
                        dirty = true;
                    }
                } else {
                    const existing = registry.find(r => r.file === d.file);
                    if (d.autoload !== existing.autoload) {
                        existing.autoload = d.autoload;
                        dirty = true;
                    }
                }
            });
            if (dirty) this.saveRegistry(registry);
        } else {
            registry = defaults;
            this.saveRegistry(registry);
        }

        return registry;
    }

    static saveRegistry(registry) {
        // DEBUG: Trace registry saves
        console.log("[VFS] Saving Registry:", registry.map(f => f.name));
        localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
        window.PluginRegistry = registry;
    }

    static resetRegistry() {
        localStorage.removeItem(REGISTRY_KEY);
        console.log("[VFS] Registry Reset to Defaults");
        return this.getRegistry(); // Re-seeds
    }

    static registerFeature(name, icon, filename) {
        const registry = this.getRegistry();
        const exists = registry.find(f => f.file === filename);
        if (!exists) {
            registry.push({ name, icon, file: filename, type: 'custom' });
            this.saveRegistry(registry);
            return true;
        }
        return false;
    }
}

window.FileSystemManager = FileSystemManager;
