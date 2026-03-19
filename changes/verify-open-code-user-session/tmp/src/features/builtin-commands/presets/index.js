/**
 * Command Presets
 *
 * Provides mode-based configuration presets for commands (quick/full/pre-pr)
 */
/**
 * Preset mode enumeration
 */
export var PresetMode;
(function (PresetMode) {
    PresetMode["QUICK"] = "quick";
    PresetMode["FULL"] = "full";
    PresetMode["PRE_PR"] = "pre-pr";
})(PresetMode || (PresetMode = {}));
/**
 * Default preset configurations
 */
const PRESETS = {
    quick: {
        mode: PresetMode.QUICK,
        runTests: false,
        runLint: true,
        runTypecheck: false,
        runBuild: false,
        runDeadCodeCheck: false,
        checkGitStatus: false,
        timeout: 30000,
    },
    full: {
        mode: PresetMode.FULL,
        runTests: true,
        runLint: true,
        runTypecheck: true,
        runBuild: true,
        runDeadCodeCheck: false,
        checkGitStatus: false,
        timeout: 120000,
    },
    "pre-pr": {
        mode: PresetMode.PRE_PR,
        runTests: true,
        runLint: true,
        runTypecheck: true,
        runBuild: true,
        runDeadCodeCheck: true,
        checkGitStatus: true,
        timeout: 300000,
    },
};
/**
 * Preset Manager implementation
 */
class PresetManagerImpl {
    hasPreset(name) {
        return name in PRESETS;
    }
    getPreset(name) {
        if (!this.hasPreset(name)) {
            const available = this.listPresets().join(", ");
            throw new Error(`Unknown preset mode: "${name}". Available modes: ${available}`);
        }
        return { ...PRESETS[name] };
    }
    getPresetWithOverrides(name, overrides) {
        const base = this.getPreset(name);
        return { ...base, ...overrides };
    }
    listPresets() {
        return Object.keys(PRESETS);
    }
    parseModeFromArgs(args) {
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            // Handle --mode=value
            if (arg.startsWith("--mode=")) {
                return arg.slice(7);
            }
            // Handle --mode value
            if (arg === "--mode" && i + 1 < args.length) {
                return args[i + 1];
            }
        }
        return null;
    }
}
/**
 * Create a new Preset Manager instance
 */
export function createPresetManager() {
    return new PresetManagerImpl();
}
