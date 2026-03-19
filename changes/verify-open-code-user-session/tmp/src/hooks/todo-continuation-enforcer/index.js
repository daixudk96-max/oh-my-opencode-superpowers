import { log } from "../../shared/logger";
import { DEFAULT_SKIP_AGENTS, HOOK_NAME } from "./constants";
import { createTodoContinuationHandler } from "./handler";
import { createSessionStateStore } from "./session-state";
export function createTodoContinuationEnforcer(ctx, options = {}) {
    const { backgroundManager, skipAgents = DEFAULT_SKIP_AGENTS, isContinuationStopped, } = options;
    const sessionStateStore = createSessionStateStore();
    const markRecovering = (sessionID) => {
        const state = sessionStateStore.getState(sessionID);
        state.isRecovering = true;
        sessionStateStore.cancelCountdown(sessionID);
        log(`[${HOOK_NAME}] Session marked as recovering`, { sessionID });
    };
    const markRecoveryComplete = (sessionID) => {
        const state = sessionStateStore.getExistingState(sessionID);
        if (state) {
            state.isRecovering = false;
            log(`[${HOOK_NAME}] Session recovery complete`, { sessionID });
        }
    };
    const handler = createTodoContinuationHandler({
        ctx,
        sessionStateStore,
        backgroundManager,
        skipAgents,
        isContinuationStopped,
    });
    const cancelAllCountdowns = () => {
        sessionStateStore.cancelAllCountdowns();
        log(`[${HOOK_NAME}] All countdowns cancelled`);
    };
    return {
        handler,
        markRecovering,
        markRecoveryComplete,
        cancelAllCountdowns,
    };
}
