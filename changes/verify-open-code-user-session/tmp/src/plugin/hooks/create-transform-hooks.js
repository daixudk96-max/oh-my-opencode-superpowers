import { createClaudeCodeHooksHook, createKeywordDetectorHook, createThinkingBlockValidatorHook, } from "../../hooks";
import { contextCollector, createContextInjectorMessagesTransformHook, } from "../../features/context-injector";
import { safeCreateHook } from "../../shared/safe-create-hook";
export function createTransformHooks(args) {
    const { ctx, pluginConfig, isHookEnabled } = args;
    const safeHookEnabled = args.safeHookEnabled ?? true;
    const claudeCodeHooks = isHookEnabled("claude-code-hooks")
        ? safeCreateHook("claude-code-hooks", () => createClaudeCodeHooksHook(ctx, {
            disabledHooks: (pluginConfig.claude_code?.hooks ?? true) ? undefined : true,
            keywordDetectorDisabled: !isHookEnabled("keyword-detector"),
        }, contextCollector), { enabled: safeHookEnabled })
        : null;
    const keywordDetector = isHookEnabled("keyword-detector")
        ? safeCreateHook("keyword-detector", () => createKeywordDetectorHook(ctx, contextCollector), { enabled: safeHookEnabled })
        : null;
    const contextInjectorMessagesTransform = createContextInjectorMessagesTransformHook(contextCollector);
    const thinkingBlockValidator = isHookEnabled("thinking-block-validator")
        ? safeCreateHook("thinking-block-validator", () => createThinkingBlockValidatorHook(), { enabled: safeHookEnabled })
        : null;
    return {
        claudeCodeHooks,
        keywordDetector,
        contextInjectorMessagesTransform,
        thinkingBlockValidator,
    };
}
