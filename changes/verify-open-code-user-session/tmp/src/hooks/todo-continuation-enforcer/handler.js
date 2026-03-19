import { clearContinuationMarker, } from "../../features/run-continuation-state";
import { log } from "../../shared/logger";
import { DEFAULT_SKIP_AGENTS, HOOK_NAME } from "./constants";
import { handleSessionIdle } from "./idle-event";
import { handleNonIdleEvent } from "./non-idle-events";
export function createTodoContinuationHandler(args) {
    const { ctx, sessionStateStore, backgroundManager, skipAgents = DEFAULT_SKIP_AGENTS, isContinuationStopped, } = args;
    return async ({ event }) => {
        const props = event.properties;
        if (event.type === "session.error") {
            const sessionID = props?.sessionID;
            if (!sessionID)
                return;
            const error = props?.error;
            if (error?.name === "MessageAbortedError" || error?.name === "AbortError") {
                const state = sessionStateStore.getState(sessionID);
                state.abortDetectedAt = Date.now();
                log(`[${HOOK_NAME}] Abort detected via session.error`, { sessionID, errorName: error.name });
            }
            sessionStateStore.cancelCountdown(sessionID);
            log(`[${HOOK_NAME}] session.error`, { sessionID });
            return;
        }
        if (event.type === "session.idle") {
            const sessionID = props?.sessionID;
            if (!sessionID)
                return;
            await handleSessionIdle({
                ctx,
                sessionID,
                sessionStateStore,
                backgroundManager,
                skipAgents,
                isContinuationStopped,
            });
            return;
        }
        if (event.type === "session.deleted") {
            const sessionInfo = props?.info;
            if (sessionInfo?.id) {
                clearContinuationMarker(ctx.directory, sessionInfo.id);
            }
        }
        handleNonIdleEvent({
            eventType: event.type,
            properties: props,
            sessionStateStore,
        });
    };
}
