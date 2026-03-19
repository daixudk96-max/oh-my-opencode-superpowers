import { loadClaudeHooksConfig } from "../config";
import { loadPluginExtendedConfig } from "../config-loader";
import { executeUserPromptSubmitHooks, } from "../user-prompt-submit";
import { isHookDisabled, log } from "../../../shared";
import { appendTranscriptEntry } from "../transcript";
import { sessionFirstMessageProcessed, sessionInterruptState } from "../session-hook-state";
export function createChatMessageHandler(ctx, config, contextCollector) {
    return async (input, output) => {
        const interruptState = sessionInterruptState.get(input.sessionID);
        if (interruptState?.interrupted) {
            log("chat.message hook skipped - session interrupted", {
                sessionID: input.sessionID,
            });
            return;
        }
        const claudeConfig = await loadClaudeHooksConfig();
        const extendedConfig = await loadPluginExtendedConfig();
        const textParts = output.parts.filter((p) => p.type === "text" && p.text);
        const prompt = textParts.map((p) => p.text ?? "").join("\n");
        appendTranscriptEntry(input.sessionID, {
            type: "user",
            timestamp: new Date().toISOString(),
            content: prompt,
        });
        const messageParts = textParts.map((p) => ({
            type: "text",
            text: p.text,
        }));
        const interruptStateBeforeHooks = sessionInterruptState.get(input.sessionID);
        if (interruptStateBeforeHooks?.interrupted) {
            log("chat.message hooks skipped - interrupted during preparation", {
                sessionID: input.sessionID,
            });
            return;
        }
        let parentSessionId;
        try {
            const sessionInfo = await ctx.client.session.get({
                path: { id: input.sessionID },
            });
            parentSessionId = sessionInfo.data?.parentID;
        }
        catch {
            parentSessionId = undefined;
        }
        const isFirstMessage = !sessionFirstMessageProcessed.has(input.sessionID);
        sessionFirstMessageProcessed.add(input.sessionID);
        if (isHookDisabled(config, "UserPromptSubmit")) {
            return;
        }
        const userPromptCtx = {
            sessionId: input.sessionID,
            parentSessionId,
            prompt,
            parts: messageParts,
            cwd: ctx.directory,
        };
        const result = await executeUserPromptSubmitHooks(userPromptCtx, claudeConfig, extendedConfig);
        if (result.block) {
            throw new Error(result.reason ?? "Hook blocked the prompt");
        }
        const interruptStateAfterHooks = sessionInterruptState.get(input.sessionID);
        if (interruptStateAfterHooks?.interrupted) {
            log("chat.message injection skipped - interrupted during hooks", {
                sessionID: input.sessionID,
            });
            return;
        }
        if (result.messages.length === 0) {
            return;
        }
        const hookContent = result.messages.join("\n\n");
        log(`[claude-code-hooks] Injecting ${result.messages.length} hook messages`, {
            sessionID: input.sessionID,
            contentLength: hookContent.length,
            isFirstMessage,
        });
        if (!contextCollector) {
            return;
        }
        log("[DEBUG] Registering hook content to contextCollector", {
            sessionID: input.sessionID,
            contentLength: hookContent.length,
            contentPreview: hookContent.slice(0, 100),
        });
        contextCollector.register(input.sessionID, {
            id: "hook-context",
            source: "custom",
            content: hookContent,
            priority: "high",
        });
        log("Hook content registered for synthetic message injection", {
            sessionID: input.sessionID,
            contentLength: hookContent.length,
        });
    };
}
