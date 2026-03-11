import type {
	AvailableCategory,
	AvailableSkill,
} from "./agents/dynamic-agent-prompt-builder";
import type { OhMyOpenCodeConfig } from "./config";
import type { BrowserAutomationProvider } from "./config/schema/browser-automation";
import type { Managers } from "./create-managers";
import { discoverDownstreamTools } from "./downstream/auto-registry";
import type { LoadedSkill } from "./features/opencode-skill-loader/types";

import { createAvailableCategories } from "./plugin/available-categories";
import { createSkillContext } from "./plugin/skill-context";
import { createToolRegistry } from "./plugin/tool-registry";
import type { PluginContext, ToolsRecord } from "./plugin/types";

export type CreateToolsResult = {
	filteredTools: ToolsRecord;
	mergedSkills: LoadedSkill[];
	availableSkills: AvailableSkill[];
	availableCategories: AvailableCategory[];
	browserProvider: BrowserAutomationProvider;
	disabledSkills: Set<string>;
	taskSystemEnabled: boolean;
};

export async function createTools(args: {
	ctx: PluginContext;
	pluginConfig: OhMyOpenCodeConfig;
	managers: Pick<
		Managers,
		"backgroundManager" | "tmuxSessionManager" | "skillMcpManager"
	>;
}): Promise<CreateToolsResult> {
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
