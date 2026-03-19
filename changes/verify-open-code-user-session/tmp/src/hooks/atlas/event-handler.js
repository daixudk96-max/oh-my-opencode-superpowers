import { getPlanProgress, readBoulderState } from "../../features/boulder-state";
import { getSessionAgent, subagentSessions } from "../../features/claude-code-session-state";
import { log } from "../../shared/logger";
import { getAgentConfigKey } from "../../shared/agent-display-names";
import { HOOK_NAME } from "./hook-name";
import { isAbortError } from "./is-abort-error";
import { injectBoulderContinuation } from "./boulder-continuation-injector";
import { getLastAgentFromSession } from "./session-last-agent";
const CONTINUATION_COOLDOWN_MS = 5000;
const FAILURE_BACKOFF_MS = 5 * 60 * 1000;
export function createAtlasEventHandler(input) {
    const { ctx, options, sessions, getState } = input;
    return async ({ event }) => {
        const props = event.properties;
        if (event.type === "session.error") {
            const sessionID = props?.sessionID;
            if (!sessionID)
                return;
            const state = getState(sessionID);
            const isAbort = isAbortError(props?.error);
            state.lastEventWasAbortError = isAbort;
            log(`[${HOOK_NAME}] session.error`, { sessionID, isAbort });
            return;
        }
        if (event.type === "session.idle") {
            const sessionID = props?.sessionID;
            if (!sessionID)
                return;
            log(`[${HOOK_NAME}] session.idle`, { sessionID });
            // Read boulder state FIRST to check if this session is part of an active boulder
            const boulderState = readBoulderState(ctx.directory);
            const isBoulderSession = boulderState?.session_ids?.includes(sessionID) ?? false;
            const isBackgroundTaskSession = subagentSessions.has(sessionID);
            // Allow continuation only if: session is in boulder's session_ids OR is a background task
            if (!isBackgroundTaskSession && !isBoulderSession) {
                log(`[${HOOK_NAME}] Skipped: not boulder or background task session`, { sessionID });
                return;
            }
            const state = getState(sessionID);
            const now = Date.now();
            if (state.lastEventWasAbortError) {
                state.lastEventWasAbortError = false;
                log(`[${HOOK_NAME}] Skipped: abort error immediately before idle`, { sessionID });
                return;
            }
            if (state.promptFailureCount >= 2) {
                const timeSinceLastFailure = state.lastFailureAt !== undefined ? now - state.lastFailureAt : Number.POSITIVE_INFINITY;
                if (timeSinceLastFailure < FAILURE_BACKOFF_MS) {
                    log(`[${HOOK_NAME}] Skipped: continuation in backoff after repeated failures`, {
                        sessionID,
                        promptFailureCount: state.promptFailureCount,
                        backoffRemaining: FAILURE_BACKOFF_MS - timeSinceLastFailure,
                    });
                    return;
                }
                state.promptFailureCount = 0;
                state.lastFailureAt = undefined;
            }
            const backgroundManager = options?.backgroundManager;
            const hasRunningBgTasks = backgroundManager
                ? backgroundManager.getTasksByParentSession(sessionID).some((t) => t.status === "running")
                : false;
            if (hasRunningBgTasks) {
                log(`[${HOOK_NAME}] Skipped: background tasks running`, { sessionID });
                return;
            }
            if (!boulderState) {
                log(`[${HOOK_NAME}] No active boulder`, { sessionID });
                return;
            }
            if (options?.isContinuationStopped?.(sessionID)) {
                log(`[${HOOK_NAME}] Skipped: continuation stopped for session`, { sessionID });
                return;
            }
            const sessionAgent = getSessionAgent(sessionID);
            const lastAgent = await getLastAgentFromSession(sessionID, ctx.client);
            const effectiveAgent = sessionAgent ?? lastAgent;
            const lastAgentKey = getAgentConfigKey(effectiveAgent ?? "");
            const requiredAgent = getAgentConfigKey(boulderState.agent ?? "atlas");
            const lastAgentMatchesRequired = lastAgentKey === requiredAgent;
            const boulderAgentDefaultsToAtlas = requiredAgent === "atlas";
            const lastAgentIsSisyphus = lastAgentKey === "sisyphus";
            const allowSisyphusForAtlasBoulder = boulderAgentDefaultsToAtlas && lastAgentIsSisyphus;
            const agentMatches = lastAgentMatchesRequired || allowSisyphusForAtlasBoulder;
            if (!agentMatches) {
                log(`[${HOOK_NAME}] Skipped: last agent does not match boulder agent`, {
                    sessionID,
                    lastAgent: effectiveAgent ?? "unknown",
                    requiredAgent,
                });
                return;
            }
            const progress = getPlanProgress(boulderState.active_plan);
            if (progress.isComplete) {
                log(`[${HOOK_NAME}] Boulder complete`, { sessionID, plan: boulderState.plan_name });
                return;
            }
            if (state.lastContinuationInjectedAt && now - state.lastContinuationInjectedAt < CONTINUATION_COOLDOWN_MS) {
                log(`[${HOOK_NAME}] Skipped: continuation cooldown active`, {
                    sessionID,
                    cooldownRemaining: CONTINUATION_COOLDOWN_MS - (now - state.lastContinuationInjectedAt),
                });
                return;
            }
            state.lastContinuationInjectedAt = now;
            const remaining = progress.total - progress.completed;
            try {
                await injectBoulderContinuation({
                    ctx,
                    sessionID,
                    planName: boulderState.plan_name,
                    remaining,
                    total: progress.total,
                    agent: boulderState.agent,
                    worktreePath: boulderState.worktree_path,
                    backgroundManager,
                    sessionState: state,
                });
            }
            catch (err) {
                log(`[${HOOK_NAME}] Failed to inject boulder continuation`, { sessionID, error: err });
                state.promptFailureCount++;
            }
            return;
        }
        if (event.type === "message.updated") {
            const info = props?.info;
            const sessionID = info?.sessionID;
            if (!sessionID)
                return;
            const state = sessions.get(sessionID);
            if (state) {
                state.lastEventWasAbortError = false;
            }
            return;
        }
        if (event.type === "message.part.updated") {
            const info = props?.info;
            const sessionID = info?.sessionID;
            const role = info?.role;
            if (sessionID && role === "assistant") {
                const state = sessions.get(sessionID);
                if (state) {
                    state.lastEventWasAbortError = false;
                }
            }
            return;
        }
        if (event.type === "tool.execute.before" || event.type === "tool.execute.after") {
            const sessionID = props?.sessionID;
            if (sessionID) {
                const state = sessions.get(sessionID);
                if (state) {
                    state.lastEventWasAbortError = false;
                }
            }
            return;
        }
        if (event.type === "session.deleted") {
            const sessionInfo = props?.info;
            if (sessionInfo?.id) {
                sessions.delete(sessionInfo.id);
                log(`[${HOOK_NAME}] Session deleted: cleaned up`, { sessionID: sessionInfo.id });
            }
            return;
        }
        if (event.type === "session.compacted") {
            const sessionID = (props?.sessionID ?? props?.info?.id);
            if (sessionID) {
                sessions.delete(sessionID);
                log(`[${HOOK_NAME}] Session compacted: cleaned up`, { sessionID });
            }
        }
    };
}
