import { DEFAULT_COMPLETION_PROMISE, DEFAULT_MAX_ITERATIONS, HOOK_NAME, } from "./constants";
import { clearState, incrementIteration, readState, writeState } from "./storage";
import { log } from "../../shared/logger";
export function createLoopStateController(options) {
    const directory = options.directory;
    const stateDir = options.stateDir;
    const config = options.config;
    return {
        startLoop(sessionID, prompt, loopOptions) {
            const state = {
                active: true,
                iteration: 1,
                max_iterations: loopOptions?.maxIterations ??
                    config?.default_max_iterations ??
                    DEFAULT_MAX_ITERATIONS,
                message_count_at_start: loopOptions?.messageCountAtStart,
                completion_promise: loopOptions?.completionPromise ??
                    DEFAULT_COMPLETION_PROMISE,
                ultrawork: loopOptions?.ultrawork,
                strategy: loopOptions?.strategy ?? config?.default_strategy ?? "continue",
                started_at: new Date().toISOString(),
                prompt,
                session_id: sessionID,
            };
            const success = writeState(directory, state, stateDir);
            if (success) {
                log(`[${HOOK_NAME}] Loop started`, {
                    sessionID,
                    maxIterations: state.max_iterations,
                    completionPromise: state.completion_promise,
                });
            }
            return success;
        },
        cancelLoop(sessionID) {
            const state = readState(directory, stateDir);
            if (!state || state.session_id !== sessionID) {
                return false;
            }
            const success = clearState(directory, stateDir);
            if (success) {
                log(`[${HOOK_NAME}] Loop cancelled`, { sessionID, iteration: state.iteration });
            }
            return success;
        },
        getState() {
            return readState(directory, stateDir);
        },
        clear() {
            return clearState(directory, stateDir);
        },
        incrementIteration() {
            return incrementIteration(directory, stateDir);
        },
        setSessionID(sessionID) {
            const state = readState(directory, stateDir);
            if (!state) {
                return null;
            }
            state.session_id = sessionID;
            if (!writeState(directory, state, stateDir)) {
                return null;
            }
            return state;
        },
        setMessageCountAtStart(sessionID, messageCountAtStart) {
            const state = readState(directory, stateDir);
            if (!state || state.session_id !== sessionID) {
                return null;
            }
            state.message_count_at_start = messageCountAtStart;
            if (!writeState(directory, state, stateDir)) {
                return null;
            }
            return state;
        },
    };
}
