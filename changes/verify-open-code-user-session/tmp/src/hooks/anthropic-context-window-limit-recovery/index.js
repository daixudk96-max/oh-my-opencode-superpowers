import { log } from "../../shared/logger";
import { clearCompactionInProgress, isCompactionInProgress, markCompactionInProgress } from "../compaction-state";
import { parseAnthropicTokenLimitError as parseTokenLimitError } from "./parser";
import { createAnthropicContextWindowLimitRecoveryHook as createRecoveryHook, } from "./recovery-hook";
const SHARED_COMPACTION_GUARD_TIMEOUT_MS = 60_000;
const pendingGuardClearBySession = new Map();
const ownedSharedCompactionSessions = new Set();
function clearPendingGuardTimeout(sessionID) {
    const timeoutID = pendingGuardClearBySession.get(sessionID);
    if (timeoutID !== undefined) {
        clearTimeout(timeoutID);
        pendingGuardClearBySession.delete(sessionID);
    }
}
function clearSharedCompactionGuard(sessionID) {
    clearPendingGuardTimeout(sessionID);
    ownedSharedCompactionSessions.delete(sessionID);
    clearCompactionInProgress(sessionID);
}
function scheduleSharedCompactionGuardClear(sessionID) {
    clearPendingGuardTimeout(sessionID);
    const timeoutID = setTimeout(() => {
        clearSharedCompactionGuard(sessionID);
    }, SHARED_COMPACTION_GUARD_TIMEOUT_MS);
    pendingGuardClearBySession.set(sessionID, timeoutID);
}
function getSessionID(event) {
    const props = event.properties;
    if (event.type === "session.deleted") {
        const info = props?.info;
        return info?.id;
    }
    if (event.type === "message.updated") {
        const info = props?.info;
        return info?.sessionID;
    }
    return props?.sessionID;
}
function isTokenLimitSessionError(event) {
    if (event.type !== "session.error") {
        return false;
    }
    const props = event.properties;
    return parseTokenLimitError(props?.error) !== null;
}
export function createAnthropicContextWindowLimitRecoveryHook(ctx, options) {
    const baseHook = createRecoveryHook(ctx, options);
    return {
        event: async ({ event }) => {
            const sessionID = getSessionID(event);
            if (event.type === "session.deleted" && sessionID) {
                clearSharedCompactionGuard(sessionID);
            }
            if (event.type === "session.error" && sessionID && isTokenLimitSessionError(event)) {
                if (isCompactionInProgress(sessionID)) {
                    log("[auto-compact] skipped: shared compaction already in progress", { sessionID });
                    return;
                }
                markCompactionInProgress(sessionID);
                ownedSharedCompactionSessions.add(sessionID);
                scheduleSharedCompactionGuardClear(sessionID);
                try {
                    return await baseHook.event({ event });
                }
                catch (error) {
                    clearSharedCompactionGuard(sessionID);
                    throw error;
                }
            }
            if (event.type === "session.idle" && sessionID) {
                const sharedCompactionInProgress = isCompactionInProgress(sessionID);
                const ownedByThisHook = ownedSharedCompactionSessions.has(sessionID);
                if (sharedCompactionInProgress && !ownedByThisHook) {
                    log("[auto-compact] session.idle skipped: shared compaction already in progress", { sessionID });
                    return;
                }
                if (!sharedCompactionInProgress) {
                    markCompactionInProgress(sessionID);
                    ownedSharedCompactionSessions.add(sessionID);
                    scheduleSharedCompactionGuardClear(sessionID);
                }
                try {
                    return await baseHook.event({ event });
                }
                finally {
                    if (ownedSharedCompactionSessions.has(sessionID)) {
                        clearSharedCompactionGuard(sessionID);
                    }
                }
            }
            return baseHook.event({ event });
        },
    };
}
export { parseAnthropicTokenLimitError } from "./parser";
export { executeCompact, getLastAssistant } from "./executor";
export * from "./state";
export * from "./message-builder";
export * from "./recovery-strategy";
