import { loadClaudeHooksConfig } from "../config";
import { loadPluginExtendedConfig } from "../config-loader";
import { executePreCompactHooks } from "../pre-compact";
import { isHookDisabled, log } from "../../../shared";
export function createPreCompactHandler(ctx, config) {
    return async (input, output) => {
        if (isHookDisabled(config, "PreCompact")) {
            return;
        }
        const claudeConfig = await loadClaudeHooksConfig();
        const extendedConfig = await loadPluginExtendedConfig();
        const preCompactCtx = {
            sessionId: input.sessionID,
            cwd: ctx.directory,
        };
        const result = await executePreCompactHooks(preCompactCtx, claudeConfig, extendedConfig);
        if (result.context.length > 0) {
            log("PreCompact hooks injecting context", {
                sessionID: input.sessionID,
                contextCount: result.context.length,
                hookName: result.hookName,
                elapsedMs: result.elapsedMs,
            });
            output.context.push(...result.context);
        }
    };
}
