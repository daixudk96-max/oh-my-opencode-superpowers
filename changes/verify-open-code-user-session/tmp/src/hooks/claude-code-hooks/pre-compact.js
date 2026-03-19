import { findMatchingHooks, log } from "../../shared";
import { dispatchHook, getHookIdentifier } from "./dispatch-hook";
import { isHookCommandDisabled } from "./config-loader";
export async function executePreCompactHooks(ctx, config, extendedConfig) {
    if (!config) {
        return { context: [] };
    }
    const matchers = findMatchingHooks(config, "PreCompact", "*");
    if (matchers.length === 0) {
        return { context: [] };
    }
    const stdinData = {
        session_id: ctx.sessionId,
        cwd: ctx.cwd,
        hook_event_name: "PreCompact",
        hook_source: "opencode-plugin",
    };
    const startTime = Date.now();
    let firstHookName;
    const collectedContext = [];
    for (const matcher of matchers) {
        if (!matcher.hooks || matcher.hooks.length === 0)
            continue;
        for (const hook of matcher.hooks) {
            if (hook.type !== "command" && hook.type !== "http")
                continue;
            const hookName = getHookIdentifier(hook);
            if (isHookCommandDisabled("PreCompact", hookName, extendedConfig ?? null)) {
                log("PreCompact hook command skipped (disabled by config)", { command: hookName });
                continue;
            }
            if (!firstHookName)
                firstHookName = hookName;
            const result = await dispatchHook(hook, JSON.stringify(stdinData), ctx.cwd);
            if (result.exitCode === 2) {
                log("PreCompact hook blocked", { hookName, stderr: result.stderr });
                continue;
            }
            if (result.stdout) {
                try {
                    const output = JSON.parse(result.stdout || "{}");
                    if (output.hookSpecificOutput?.additionalContext) {
                        collectedContext.push(...output.hookSpecificOutput.additionalContext);
                    }
                    else if (output.context) {
                        collectedContext.push(...output.context);
                    }
                    if (output.continue === false) {
                        return {
                            context: collectedContext,
                            elapsedMs: Date.now() - startTime,
                            hookName: firstHookName,
                            continue: output.continue,
                            stopReason: output.stopReason,
                            suppressOutput: output.suppressOutput,
                            systemMessage: output.systemMessage,
                        };
                    }
                }
                catch {
                    if (result.stdout.trim()) {
                        collectedContext.push(result.stdout.trim());
                    }
                }
            }
        }
    }
    return {
        context: collectedContext,
        elapsedMs: Date.now() - startTime,
        hookName: firstHookName,
    };
}
