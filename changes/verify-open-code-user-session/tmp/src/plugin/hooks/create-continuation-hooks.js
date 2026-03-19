import { createTodoContinuationEnforcer, createBackgroundNotificationHook, createStopContinuationGuardHook, createCompactionContextInjector, createCompactionTodoPreserverHook, createAtlasHook, } from "../../hooks";
import { safeCreateHook } from "../../shared/safe-create-hook";
import { createUnstableAgentBabysitter } from "../unstable-agent-babysitter";
export function createContinuationHooks(args) {
    const { ctx, pluginConfig, isHookEnabled, safeHookEnabled, backgroundManager, sessionRecovery, } = args;
    const safeHook = (hookName, factory) => safeCreateHook(hookName, factory, { enabled: safeHookEnabled });
    const stopContinuationGuard = isHookEnabled("stop-continuation-guard")
        ? safeHook("stop-continuation-guard", () => createStopContinuationGuardHook(ctx, {
            backgroundManager,
        }))
        : null;
    const compactionContextInjector = isHookEnabled("compaction-context-injector")
        ? safeHook("compaction-context-injector", () => createCompactionContextInjector(backgroundManager))
        : null;
    const compactionTodoPreserver = isHookEnabled("compaction-todo-preserver")
        ? safeHook("compaction-todo-preserver", () => createCompactionTodoPreserverHook(ctx))
        : null;
    const todoContinuationEnforcer = isHookEnabled("todo-continuation-enforcer")
        ? safeHook("todo-continuation-enforcer", () => createTodoContinuationEnforcer(ctx, {
            backgroundManager,
            isContinuationStopped: stopContinuationGuard?.isStopped,
        }))
        : null;
    const unstableAgentBabysitter = isHookEnabled("unstable-agent-babysitter")
        ? safeHook("unstable-agent-babysitter", () => createUnstableAgentBabysitter({ ctx, backgroundManager, pluginConfig }))
        : null;
    if (sessionRecovery) {
        const onAbortCallbacks = [];
        const onRecoveryCompleteCallbacks = [];
        if (todoContinuationEnforcer) {
            onAbortCallbacks.push(todoContinuationEnforcer.markRecovering);
            onRecoveryCompleteCallbacks.push(todoContinuationEnforcer.markRecoveryComplete);
        }
        if (onAbortCallbacks.length > 0) {
            sessionRecovery.setOnAbortCallback((sessionID) => {
                for (const callback of onAbortCallbacks)
                    callback(sessionID);
            });
        }
        if (onRecoveryCompleteCallbacks.length > 0) {
            sessionRecovery.setOnRecoveryCompleteCallback((sessionID) => {
                for (const callback of onRecoveryCompleteCallbacks)
                    callback(sessionID);
            });
        }
    }
    const backgroundNotificationHook = isHookEnabled("background-notification")
        ? safeHook("background-notification", () => createBackgroundNotificationHook(backgroundManager))
        : null;
    const atlasHook = isHookEnabled("atlas")
        ? safeHook("atlas", () => createAtlasHook(ctx, {
            directory: ctx.directory,
            backgroundManager,
            isContinuationStopped: (sessionID) => stopContinuationGuard?.isStopped(sessionID) ?? false,
            agentOverrides: pluginConfig.agents,
            autoCommit: pluginConfig.start_work?.auto_commit,
        }))
        : null;
    return {
        stopContinuationGuard,
        compactionContextInjector,
        compactionTodoPreserver,
        todoContinuationEnforcer,
        unstableAgentBabysitter,
        backgroundNotificationHook,
        atlasHook,
    };
}
