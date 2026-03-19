import { discoverDownstreamTools } from "./downstream/auto-registry";
import { createAvailableCategories } from "./plugin/available-categories";
import { createSkillContext } from "./plugin/skill-context";
import { createToolRegistry } from "./plugin/tool-registry";
export async function createTools(args) {
    const { ctx, pluginConfig, managers } = args;
    const [skillContext, downstreamTools] = await Promise.all([
        createSkillContext({
            directory: ctx.directory,
            pluginConfig,
        }),
        discoverDownstreamTools().catch(() => []),
    ]);
    const availableCategories = createAvailableCategories(pluginConfig);
    const { filteredTools, taskSystemEnabled } = createToolRegistry({
        ctx,
        pluginConfig,
        managers,
        skillContext,
        availableCategories,
        additionalTools: downstreamTools,
    });
    return {
        filteredTools,
        mergedSkills: skillContext.mergedSkills,
        availableSkills: skillContext.availableSkills,
        availableCategories,
        browserProvider: skillContext.browserProvider,
        disabledSkills: skillContext.disabledSkills,
        taskSystemEnabled,
    };
}
