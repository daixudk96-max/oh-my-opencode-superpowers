import { findMatchingHooks, log } from "../../shared";
import { dispatchHook, getHookIdentifier } from "./dispatch-hook";
import { getTodoPath } from "./todo";
import { isHookCommandDisabled } from "./config-loader";
// Module-level state to track stop_hook_active per session
const stopHookActiveState = new Map();
export function setStopHookActive(sessionId, active) {
    stopHookActiveState.set(sessionId, active);
}
export function getStopHookActive(sessionId) {
    return stopHookActiveState.get(sessionId) ?? false;
}
export async function executeStopHooks(ctx, config, extendedConfig) {
    if (ctx.parentSessionId) {
        return { block: false };
    }
    if (!config) {
        return { block: false };
    }
    const matchers = findMatchingHooks(config, "Stop");
    if (matchers.length === 0) {
        return { block: false };
    }
    const stdinData = {
        session_id: ctx.sessionId,
        transcript_path: ctx.transcriptPath,
        cwd: ctx.cwd,
        permission_mode: ctx.permissionMode ?? "bypassPermissions",
        hook_event_name: "Stop",
        stop_hook_active: stopHookActiveState.get(ctx.sessionId) ?? false,
        todo_path: getTodoPath(ctx.sessionId),
        hook_source: "opencode-plugin",
    };
    for (const matcher of matchers) {
        if (!matcher.hooks || matcher.hooks.length === 0)
            continue;
        for (const hook of matcher.hooks) {
            if (hook.type !== "command" && hook.type !== "http")
                continue;
            const hookName = getHookIdentifier(hook);
            if (isHookCommandDisabled("Stop", hookName, extendedConfig ?? null)) {
                log("Stop hook command skipped (disabled by config)", { command: hookName });
                continue;
            }
            const result = await dispatchHook(hook, JSON.stringify(stdinData), ctx.cwd);
            // Check exit code first - exit code 2 means block
            if (result.exitCode === 2) {
                const reason = result.stderr || result.stdout || "Blocked by stop hook";
                return {
                    block: true,
                    reason,
                    injectPrompt: reason,
                };
            }
            if (result.stdout) {
                try {
                    const output = JSON.parse(result.stdout || "{}");
                    if (output.stop_hook_active !== undefined) {
                        stopHookActiveState.set(ctx.sessionId, output.stop_hook_active);
                    }
                    const isBlock = output.decision === "block";
                    // Only return early if the hook explicitly blocks - non-blocking hooks
                    // should not prevent subsequent hooks from executing (matches Claude Code behavior)
                    if (isBlock) {
                        const injectPrompt = output.inject_prompt ?? (output.reason || undefined);
                        return {
                            block: true,
                            reason: output.reason,
                            stopHookActive: output.stop_hook_active,
                            permissionMode: output.permission_mode,
                            injectPrompt,
                        };
                    }
                }
                catch {
                    // Ignore JSON parse errors - hook may return non-JSON output
                }
            }
        }
    }
    return { block: false };
}
