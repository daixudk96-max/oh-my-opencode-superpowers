import { log } from "../../shared/logger";
import { detectErrorType } from "./detect-error-type";
import { recoverToolResultMissing } from "./recover-tool-result-missing";
import { recoverUnavailableTool } from "./recover-unavailable-tool";
import { recoverThinkingBlockOrder } from "./recover-thinking-block-order";
import { recoverThinkingDisabledViolation } from "./recover-thinking-disabled-violation";
import { extractResumeConfig, findLastUserMessage, resumeSession } from "./resume";
export function createSessionRecoveryHook(ctx, options) {
    const processingErrors = new Set();
    const experimental = options?.experimental;
    let onAbortCallback = null;
    let onRecoveryCompleteCallback = null;
    const setOnAbortCallback = (callback) => {
        onAbortCallback = callback;
    };
    const setOnRecoveryCompleteCallback = (callback) => {
        onRecoveryCompleteCallback = callback;
    };
    const isRecoverableError = (error) => {
        return detectErrorType(error) !== null;
    };
    const handleSessionRecovery = async (info) => {
        if (!info || info.role !== "assistant" || !info.error)
            return false;
        const errorType = detectErrorType(info.error);
        if (!errorType)
            return false;
        const sessionID = info.sessionID;
        const assistantMsgID = info.id;
        if (!sessionID || !assistantMsgID)
            return false;
        if (processingErrors.has(assistantMsgID))
            return false;
        processingErrors.add(assistantMsgID);
        try {
            if (onAbortCallback) {
                onAbortCallback(sessionID);
            }
            await ctx.client.session.abort({ path: { id: sessionID } }).catch(() => { });
            const messagesResp = await ctx.client.session.messages({
                path: { id: sessionID },
                query: { directory: ctx.directory },
            });
            const msgs = messagesResp.data;
            const failedMsg = msgs?.find((m) => m.info?.id === assistantMsgID);
            if (!failedMsg) {
                return false;
            }
            const toastTitles = {
                tool_result_missing: "Tool Crash Recovery",
                unavailable_tool: "Tool Recovery",
                thinking_block_order: "Thinking Block Recovery",
                thinking_disabled_violation: "Thinking Strip Recovery",
                "assistant_prefill_unsupported": "Prefill Unsupported",
            };
            const toastMessages = {
                tool_result_missing: "Injecting cancelled tool results...",
                unavailable_tool: "Recovering from unavailable tool call...",
                thinking_block_order: "Fixing message structure...",
                thinking_disabled_violation: "Stripping thinking blocks...",
                "assistant_prefill_unsupported": "Prefill not supported; continuing without recovery.",
            };
            await ctx.client.tui
                .showToast({
                body: {
                    title: toastTitles[errorType],
                    message: toastMessages[errorType],
                    variant: "warning",
                    duration: 3000,
                },
            })
                .catch(() => { });
            let success = false;
            if (errorType === "tool_result_missing") {
                success = await recoverToolResultMissing(ctx.client, sessionID, failedMsg);
            }
            else if (errorType === "unavailable_tool") {
                success = await recoverUnavailableTool(ctx.client, sessionID, failedMsg);
            }
            else if (errorType === "thinking_block_order") {
                success = await recoverThinkingBlockOrder(ctx.client, sessionID, failedMsg, ctx.directory, info.error);
                if (success && experimental?.auto_resume) {
                    const lastUser = findLastUserMessage(msgs ?? []);
                    const resumeConfig = extractResumeConfig(lastUser, sessionID);
                    await resumeSession(ctx.client, resumeConfig);
                }
            }
            else if (errorType === "thinking_disabled_violation") {
                success = await recoverThinkingDisabledViolation(ctx.client, sessionID, failedMsg);
                if (success && experimental?.auto_resume) {
                    const lastUser = findLastUserMessage(msgs ?? []);
                    const resumeConfig = extractResumeConfig(lastUser, sessionID);
                    await resumeSession(ctx.client, resumeConfig);
                }
            }
            else if (errorType === "assistant_prefill_unsupported") {
                success = false;
            }
            return success;
        }
        catch (err) {
            log("[session-recovery] Recovery failed:", err);
            return false;
        }
        finally {
            processingErrors.delete(assistantMsgID);
            if (sessionID && onRecoveryCompleteCallback) {
                onRecoveryCompleteCallback(sessionID);
            }
        }
    };
    return {
        handleSessionRecovery,
        isRecoverableError,
        setOnAbortCallback,
        setOnRecoveryCompleteCallback,
    };
}
