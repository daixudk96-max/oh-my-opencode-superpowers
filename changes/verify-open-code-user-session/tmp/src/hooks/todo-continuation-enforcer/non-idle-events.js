import { log } from "../../shared/logger";
import { COUNTDOWN_GRACE_PERIOD_MS, HOOK_NAME } from "./constants";
export function handleNonIdleEvent(args) {
    const { eventType, properties, sessionStateStore } = args;
    if (eventType === "message.updated") {
        const info = properties?.info;
        const sessionID = info?.sessionID;
        const role = info?.role;
        if (!sessionID)
            return;
        if (role === "user") {
            const state = sessionStateStore.getExistingState(sessionID);
            if (state?.countdownStartedAt) {
                const elapsed = Date.now() - state.countdownStartedAt;
                if (elapsed < COUNTDOWN_GRACE_PERIOD_MS) {
                    log(`[${HOOK_NAME}] Ignoring user message in grace period`, { sessionID, elapsed });
                    return;
                }
            }
            if (state)
                state.abortDetectedAt = undefined;
            sessionStateStore.cancelCountdown(sessionID);
            return;
        }
        if (role === "assistant") {
            const state = sessionStateStore.getExistingState(sessionID);
            if (state)
                state.abortDetectedAt = undefined;
            sessionStateStore.cancelCountdown(sessionID);
            return;
        }
        return;
    }
    if (eventType === "message.part.updated") {
        const info = properties?.info;
        const sessionID = info?.sessionID;
        const role = info?.role;
        if (sessionID && role === "assistant") {
            const state = sessionStateStore.getExistingState(sessionID);
            if (state)
                state.abortDetectedAt = undefined;
            sessionStateStore.cancelCountdown(sessionID);
        }
        return;
    }
    if (eventType === "tool.execute.before" || eventType === "tool.execute.after") {
        const sessionID = properties?.sessionID;
        if (sessionID) {
            const state = sessionStateStore.getExistingState(sessionID);
            if (state)
                state.abortDetectedAt = undefined;
            sessionStateStore.cancelCountdown(sessionID);
        }
        return;
    }
    if (eventType === "session.deleted") {
        const sessionInfo = properties?.info;
        if (sessionInfo?.id) {
            sessionStateStore.cleanup(sessionInfo.id);
            log(`[${HOOK_NAME}] Session deleted: cleaned up`, { sessionID: sessionInfo.id });
        }
        return;
    }
}
