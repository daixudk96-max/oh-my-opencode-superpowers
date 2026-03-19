import { findMatchingHooks, objectToSnakeCase, transformToolName, log } from "../../shared";
import { dispatchHook, getHookIdentifier } from "./dispatch-hook";
import { buildTranscriptFromSession, deleteTempTranscript } from "./transcript";
import { isHookCommandDisabled } from "./config-loader";
export async function executePostToolUseHooks(ctx, config, extendedConfig) {
    if (!config) {
        return { block: false };
    }
    const transformedToolName = transformToolName(ctx.toolName);
    const matchers = findMatchingHooks(config, "PostToolUse", transformedToolName);
    if (matchers.length === 0) {
        return { block: false };
    }
    // PORT FROM DISABLED: Build Claude Code compatible transcript (temp file)
    let tempTranscriptPath = null;
    try {
        // Try to build full transcript from API if client available
        if (ctx.client) {
            tempTranscriptPath = await buildTranscriptFromSession(ctx.client, ctx.sessionId, ctx.cwd, ctx.toolName, ctx.toolInput);
        }
        const stdinData = {
            session_id: ctx.sessionId,
            // Use temp transcript if available, otherwise fallback to append-based
            transcript_path: tempTranscriptPath ?? ctx.transcriptPath,
            cwd: ctx.cwd,
            permission_mode: ctx.permissionMode ?? "bypassPermissions",
            hook_event_name: "PostToolUse",
            tool_name: transformedToolName,
            tool_input: objectToSnakeCase(ctx.toolInput),
            tool_response: objectToSnakeCase(ctx.toolOutput),
            tool_use_id: ctx.toolUseId,
            hook_source: "opencode-plugin",
        };
        const messages = [];
        const warnings = [];
        let firstHookName;
        const startTime = Date.now();
        for (const matcher of matchers) {
            if (!matcher.hooks || matcher.hooks.length === 0)
                continue;
            for (const hook of matcher.hooks) {
                if (hook.type !== "command" && hook.type !== "http")
                    continue;
                const hookName = getHookIdentifier(hook);
                if (isHookCommandDisabled("PostToolUse", hookName, extendedConfig ?? null)) {
                    log("PostToolUse hook command skipped (disabled by config)", { command: hookName, toolName: ctx.toolName });
                    continue;
                }
                if (!firstHookName)
                    firstHookName = hookName;
                const result = await dispatchHook(hook, JSON.stringify(stdinData), ctx.cwd);
                if (result.stdout) {
                    messages.push(result.stdout);
                }
                if (result.exitCode === 2) {
                    if (result.stderr) {
                        warnings.push(`[${hookName}]\n${result.stderr.trim()}`);
                    }
                    continue;
                }
                if (result.exitCode === 0 && result.stdout) {
                    try {
                        const output = JSON.parse(result.stdout || "{}");
                        if (output.decision === "block") {
                            return {
                                block: true,
                                reason: output.reason || result.stderr,
                                message: messages.join("\n"),
                                warnings: warnings.length > 0 ? warnings : undefined,
                                elapsedMs: Date.now() - startTime,
                                hookName: firstHookName,
                                toolName: transformedToolName,
                                additionalContext: output.hookSpecificOutput?.additionalContext,
                                continue: output.continue,
                                stopReason: output.stopReason,
                                suppressOutput: output.suppressOutput,
                                systemMessage: output.systemMessage,
                            };
                        }
                        if (output.hookSpecificOutput?.additionalContext || output.continue !== undefined || output.systemMessage || output.suppressOutput === true || output.stopReason !== undefined) {
                            return {
                                block: false,
                                message: messages.join("\n"),
                                warnings: warnings.length > 0 ? warnings : undefined,
                                elapsedMs: Date.now() - startTime,
                                hookName: firstHookName,
                                toolName: transformedToolName,
                                additionalContext: output.hookSpecificOutput?.additionalContext,
                                continue: output.continue,
                                stopReason: output.stopReason,
                                suppressOutput: output.suppressOutput,
                                systemMessage: output.systemMessage,
                            };
                        }
                    }
                    catch {
                    }
                }
                else if (result.exitCode !== 0 && result.exitCode !== 2) {
                    try {
                        const output = JSON.parse(result.stdout || "{}");
                        if (output.decision === "block") {
                            return {
                                block: true,
                                reason: output.reason || result.stderr,
                                message: messages.join("\n"),
                                warnings: warnings.length > 0 ? warnings : undefined,
                                elapsedMs: Date.now() - startTime,
                                hookName: firstHookName,
                                toolName: transformedToolName,
                                additionalContext: output.hookSpecificOutput?.additionalContext,
                                continue: output.continue,
                                stopReason: output.stopReason,
                                suppressOutput: output.suppressOutput,
                                systemMessage: output.systemMessage,
                            };
                        }
                    }
                    catch {
                    }
                }
            }
        }
        const elapsedMs = Date.now() - startTime;
        return {
            block: false,
            message: messages.length > 0 ? messages.join("\n") : undefined,
            warnings: warnings.length > 0 ? warnings : undefined,
            elapsedMs,
            hookName: firstHookName,
            toolName: transformedToolName,
        };
    }
    finally {
        // PORT FROM DISABLED: Cleanup temp file to avoid disk accumulation
        deleteTempTranscript(tempTranscriptPath);
    }
}
