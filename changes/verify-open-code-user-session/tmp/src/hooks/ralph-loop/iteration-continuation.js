import { log } from "../../shared/logger";
import { HOOK_NAME } from "./constants";
import { buildContinuationPrompt } from "./continuation-prompt-builder";
import { injectContinuationPrompt } from "./continuation-prompt-injector";
import { createIterationSession, selectSessionInTui } from "./session-reset-strategy";
export async function continueIteration(ctx, state, options) {
    const strategy = state.strategy ?? "continue";
    const continuationPrompt = buildContinuationPrompt(state);
    if (strategy === "reset") {
        const newSessionID = await createIterationSession(ctx, options.previousSessionID, options.directory);
        if (!newSessionID) {
            return;
        }
        await injectContinuationPrompt(ctx, {
            sessionID: newSessionID,
            inheritFromSessionID: options.previousSessionID,
            prompt: continuationPrompt,
            directory: options.directory,
            apiTimeoutMs: options.apiTimeoutMs,
        });
        await selectSessionInTui(ctx.client, newSessionID);
        const boundState = options.loopState.setSessionID(newSessionID);
        if (!boundState) {
            log(`[${HOOK_NAME}] Failed to bind loop state to new session`, {
                previousSessionID: options.previousSessionID,
                newSessionID,
            });
            return;
        }
        return;
    }
    await injectContinuationPrompt(ctx, {
        sessionID: options.previousSessionID,
        prompt: continuationPrompt,
        directory: options.directory,
        apiTimeoutMs: options.apiTimeoutMs,
    });
}
