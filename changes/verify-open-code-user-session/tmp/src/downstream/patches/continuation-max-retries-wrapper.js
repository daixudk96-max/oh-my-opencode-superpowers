import { HOOK_NAME } from "../../hooks/atlas/hook-name";
import { log } from "../../shared/logger";
function extractSessionID(props) {
    if (!props || typeof props !== "object")
        return undefined;
    const candidate = props.sessionID;
    return typeof candidate === "string" ? candidate : undefined;
}
/**
 * Pattern C wrapper: cap continuation retries without modifying upstream atlas logic.
 */
export function createContinuationMaxRetriesWrapper(input) {
    const { handler, getState, maxRetries = 5 } = input;
    return async (arg) => {
        if (arg.event.type !== "session.idle") {
            await handler(arg);
            return;
        }
        const sessionID = extractSessionID(arg.event.properties);
        if (!sessionID) {
            await handler(arg);
            return;
        }
        const state = getState(sessionID);
        if (state.promptFailureCount >= maxRetries) {
            log(`[${HOOK_NAME}] [downstream:continuation-max-retries] Skipped: max retries reached`, {
                sessionID,
                promptFailureCount: state.promptFailureCount,
                maxRetries,
            });
            return;
        }
        await handler(arg);
    };
}
