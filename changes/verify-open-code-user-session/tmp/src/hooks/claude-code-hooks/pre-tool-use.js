import { findMatchingHooks, objectToSnakeCase, transformToolName, log } from "../../shared";
import { dispatchHook, getHookIdentifier } from "./dispatch-hook";
import { isHookCommandDisabled } from "./config-loader";
function buildInputLines(toolInput) {
    return Object.entries(toolInput)
        .slice(0, 3)
        .map(([key, val]) => {
        const valStr = String(val).slice(0, 40);
        return `  ${key}: ${valStr}${String(val).length > 40 ? "..." : ""}`;
    })
        .join("\n");
}
export async function executePreToolUseHooks(ctx, config, extendedConfig) {
    if (!config) {
        return { decision: "allow" };
    }
    const transformedToolName = transformToolName(ctx.toolName);
    const matchers = findMatchingHooks(config, "PreToolUse", transformedToolName);
    if (matchers.length === 0) {
        return { decision: "allow" };
    }
    const stdinData = {
        session_id: ctx.sessionId,
        transcript_path: ctx.transcriptPath,
        cwd: ctx.cwd,
        permission_mode: ctx.permissionMode ?? "bypassPermissions",
        hook_event_name: "PreToolUse",
        tool_name: transformedToolName,
        tool_input: objectToSnakeCase(ctx.toolInput),
        tool_use_id: ctx.toolUseId,
        hook_source: "opencode-plugin",
    };
    const startTime = Date.now();
    let firstHookName;
    const inputLines = buildInputLines(ctx.toolInput);
    for (const matcher of matchers) {
        if (!matcher.hooks || matcher.hooks.length === 0)
            continue;
        for (const hook of matcher.hooks) {
            if (hook.type !== "command" && hook.type !== "http")
                continue;
            const hookName = getHookIdentifier(hook);
            if (isHookCommandDisabled("PreToolUse", hookName, extendedConfig ?? null)) {
                log("PreToolUse hook command skipped (disabled by config)", { command: hookName, toolName: ctx.toolName });
                continue;
            }
            if (!firstHookName)
                firstHookName = hookName;
            const result = await dispatchHook(hook, JSON.stringify(stdinData), ctx.cwd);
            if (result.exitCode === 2) {
                return {
                    decision: "deny",
                    reason: result.stderr || result.stdout || "Hook blocked the operation",
                    elapsedMs: Date.now() - startTime,
                    hookName: firstHookName,
                    toolName: transformedToolName,
                    inputLines,
                };
            }
            if (result.exitCode === 1) {
                return {
                    decision: "ask",
                    reason: result.stderr || result.stdout,
                    elapsedMs: Date.now() - startTime,
                    hookName: firstHookName,
                    toolName: transformedToolName,
                    inputLines,
                };
            }
            if (result.stdout) {
                try {
                    const output = JSON.parse(result.stdout || "{}");
                    // Handle deprecated decision/reason fields (Claude Code backward compat)
                    let decision;
                    let reason;
                    let modifiedInput;
                    if (output.hookSpecificOutput?.permissionDecision) {
                        decision = output.hookSpecificOutput.permissionDecision;
                        reason = output.hookSpecificOutput.permissionDecisionReason;
                        modifiedInput = output.hookSpecificOutput.updatedInput;
                    }
                    else if (output.decision) {
                        // Map deprecated values: approve->allow, block->deny, ask->ask
                        const legacyDecision = output.decision;
                        if (legacyDecision === "approve" || legacyDecision === "allow") {
                            decision = "allow";
                        }
                        else if (legacyDecision === "block" || legacyDecision === "deny") {
                            decision = "deny";
                        }
                        else if (legacyDecision === "ask") {
                            decision = "ask";
                        }
                        reason = output.reason;
                    }
                    // Return if decision is set OR if any common fields are set (fallback to allow)
                    const hasCommonFields = output.continue !== undefined ||
                        output.stopReason !== undefined ||
                        output.suppressOutput !== undefined ||
                        output.systemMessage !== undefined;
                    if (decision || hasCommonFields) {
                        return {
                            decision: decision ?? "allow",
                            reason,
                            modifiedInput,
                            elapsedMs: Date.now() - startTime,
                            hookName: firstHookName,
                            toolName: transformedToolName,
                            inputLines,
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
    return { decision: "allow" };
}
