import { readBoulderState } from "../../features/boulder-state";
import { subagentSessions } from "../../features/claude-code-session-state";
import { HOOK_NAME } from "../../hooks/atlas/hook-name";
import { log } from "../../shared/logger";
function extractSessionID(props) {
    if (!props || typeof props !== "object")
        return undefined;
    const candidate = props.sessionID;
    return typeof candidate === "string" ? candidate : undefined;
}
/**
 * Pattern C wrapper: keep upstream atlas event handler intact,
 * add an early boulder gate before invoking upstream logic.
 */
export function createBoulderGatingWrapper(input) {
    const { ctx, handler } = input;
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
        if (subagentSessions.has(sessionID)) {
            await handler(arg);
            return;
        }
        const boulderState = readBoulderState(ctx.directory);
        const inBoulderSession = boulderState?.session_ids?.includes(sessionID) ?? false;
        const hasActivePlan = typeof boulderState?.active_plan === "string" && boulderState.active_plan.length > 0;
        if (!inBoulderSession || !hasActivePlan) {
            log(`[${HOOK_NAME}] [downstream:boulder-gating] Skipped: missing active boulder plan/session gate`, {
                sessionID,
                inBoulderSession,
                hasActivePlan,
            });
            return;
        }
        await handler(arg);
    };
}
