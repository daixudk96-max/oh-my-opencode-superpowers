import { createCommentCheckerHooks, createToolOutputTruncatorHook, createDirectoryAgentsInjectorHook, createDirectoryReadmeInjectorHook, createEmptyTaskResponseDetectorHook, createRulesInjectorHook, createTasksTodowriteDisablerHook, createWriteExistingFileGuardHook, createHashlineReadEnhancerHook, createReadImageResizerHook, createJsonErrorRecoveryHook, 
// TDD-EXEMPT: reason="Adding tasks-md-creation-guard to tool guard hooks"
createTasksMdCreationGuardHook, } from "../../hooks";
import { getOpenCodeVersion, isOpenCodeVersionAtLeast, log, OPENCODE_NATIVE_AGENTS_INJECTION_VERSION, } from "../../shared";
import { safeCreateHook } from "../../shared/safe-create-hook";
export function createToolGuardHooks(args) {
    const { ctx, pluginConfig, modelCacheState, isHookEnabled, safeHookEnabled } = args;
    const safeHook = (hookName, factory) => safeCreateHook(hookName, factory, { enabled: safeHookEnabled });
    const commentChecker = isHookEnabled("comment-checker")
        ? safeHook("comment-checker", () => createCommentCheckerHooks(pluginConfig.comment_checker))
        : null;
    const toolOutputTruncator = isHookEnabled("tool-output-truncator")
        ? safeHook("tool-output-truncator", () => createToolOutputTruncatorHook(ctx, {
            modelCacheState,
            experimental: pluginConfig.experimental,
        }))
        : null;
    let directoryAgentsInjector = null;
    if (isHookEnabled("directory-agents-injector")) {
        const currentVersion = getOpenCodeVersion();
        const hasNativeSupport = currentVersion !== null && isOpenCodeVersionAtLeast(OPENCODE_NATIVE_AGENTS_INJECTION_VERSION);
        if (hasNativeSupport) {
            log("directory-agents-injector auto-disabled due to native OpenCode support", {
                currentVersion,
                nativeVersion: OPENCODE_NATIVE_AGENTS_INJECTION_VERSION,
            });
        }
        else {
            directoryAgentsInjector = safeHook("directory-agents-injector", () => createDirectoryAgentsInjectorHook(ctx, modelCacheState));
        }
    }
    const directoryReadmeInjector = isHookEnabled("directory-readme-injector")
        ? safeHook("directory-readme-injector", () => createDirectoryReadmeInjectorHook(ctx, modelCacheState))
        : null;
    const emptyTaskResponseDetector = isHookEnabled("empty-task-response-detector")
        ? safeHook("empty-task-response-detector", () => createEmptyTaskResponseDetectorHook(ctx))
        : null;
    const rulesInjector = isHookEnabled("rules-injector")
        ? safeHook("rules-injector", () => createRulesInjectorHook(ctx, modelCacheState))
        : null;
    const tasksTodowriteDisabler = isHookEnabled("tasks-todowrite-disabler")
        ? safeHook("tasks-todowrite-disabler", () => createTasksTodowriteDisablerHook({ experimental: pluginConfig.experimental }))
        : null;
    const writeExistingFileGuard = isHookEnabled("write-existing-file-guard")
        ? safeHook("write-existing-file-guard", () => createWriteExistingFileGuardHook(ctx))
        : null;
    const hashlineReadEnhancer = isHookEnabled("hashline-read-enhancer")
        ? safeHook("hashline-read-enhancer", () => createHashlineReadEnhancerHook(ctx, { hashline_edit: { enabled: pluginConfig.hashline_edit ?? false } }))
        : null;
    const jsonErrorRecovery = isHookEnabled("json-error-recovery")
        ? safeHook("json-error-recovery", () => createJsonErrorRecoveryHook(ctx))
        : null;
    const readImageResizer = isHookEnabled("read-image-resizer")
        ? safeHook("read-image-resizer", () => createReadImageResizerHook(ctx))
        : null;
    // TDD-EXEMPT: reason="Adding tasks-md-creation-guard to tool guard hooks"
    const tasksMdCreationGuard = isHookEnabled("tasks-md-creation-guard")
        ? safeHook("tasks-md-creation-guard", () => createTasksMdCreationGuardHook(ctx))
        : null;
    return {
        commentChecker,
        toolOutputTruncator,
        directoryAgentsInjector,
        directoryReadmeInjector,
        emptyTaskResponseDetector,
        rulesInjector,
        tasksTodowriteDisabler,
        writeExistingFileGuard,
        hashlineReadEnhancer,
        jsonErrorRecovery,
        readImageResizer,
        tasksMdCreationGuard,
    };
}
