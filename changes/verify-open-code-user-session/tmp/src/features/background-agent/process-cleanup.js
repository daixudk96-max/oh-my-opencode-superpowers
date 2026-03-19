import { log } from "../../shared";
function registerProcessSignal(signal, handler, exitAfter) {
    const listener = () => {
        handler();
        if (exitAfter) {
            process.exitCode = 0;
            setTimeout(() => process.exit(), 6000).unref();
        }
    };
    process.on(signal, listener);
    return listener;
}
const cleanupManagers = new Set();
let cleanupRegistered = false;
const cleanupHandlers = new Map();
export function registerManagerForCleanup(manager) {
    cleanupManagers.add(manager);
    if (cleanupRegistered)
        return;
    cleanupRegistered = true;
    const cleanupAll = () => {
        for (const m of cleanupManagers) {
            try {
                m.shutdown();
            }
            catch (error) {
                log("[background-agent] Error during shutdown cleanup:", error);
            }
        }
    };
    const registerSignal = (signal, exitAfter) => {
        const listener = registerProcessSignal(signal, cleanupAll, exitAfter);
        cleanupHandlers.set(signal, listener);
    };
    registerSignal("SIGINT", true);
    registerSignal("SIGTERM", true);
    if (process.platform === "win32") {
        registerSignal("SIGBREAK", true);
    }
    registerSignal("beforeExit", false);
    registerSignal("exit", false);
}
export function unregisterManagerForCleanup(manager) {
    cleanupManagers.delete(manager);
    if (cleanupManagers.size > 0)
        return;
    for (const [signal, listener] of cleanupHandlers.entries()) {
        process.off(signal, listener);
    }
    cleanupHandlers.clear();
    cleanupRegistered = false;
}
/** @internal — test-only reset for module-level singleton state */
export function _resetForTesting() {
    for (const manager of [...cleanupManagers]) {
        cleanupManagers.delete(manager);
    }
    for (const [signal, listener] of cleanupHandlers.entries()) {
        process.off(signal, listener);
    }
    cleanupHandlers.clear();
    cleanupRegistered = false;
}
