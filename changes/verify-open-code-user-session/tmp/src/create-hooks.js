import { createCoreHooks } from "./plugin/hooks/create-core-hooks";
import { createContinuationHooks } from "./plugin/hooks/create-continuation-hooks";
import { createSkillHooks } from "./plugin/hooks/create-skill-hooks";
export function createHooks(args) {
    const { ctx, pluginConfig, modelCacheState, backgroundManager, isHookEnabled, safeHookEnabled, mergedSkills, availableSkills, } = args;
    const core = createCoreHooks({
        ctx,
        pluginConfig,
        modelCacheState,
        isHookEnabled,
        safeHookEnabled,
    });
    const continuation = createContinuationHooks({
        ctx,
        pluginConfig,
        isHookEnabled,
        safeHookEnabled,
        backgroundManager,
        sessionRecovery: core.sessionRecovery,
    });
    const skill = createSkillHooks({
        ctx,
        pluginConfig,
        isHookEnabled,
        safeHookEnabled,
        mergedSkills,
        availableSkills,
    });
    return {
        ...core,
        ...continuation,
        ...skill,
    };
}
