import { createBuiltinAgents } from "../agents";
import { createSisyphusJuniorAgentWithOverrides } from "../agents/sisyphus-junior";
import { log, migrateAgentConfig } from "../shared";
import { AGENT_NAME_MAP } from "../shared/migration";
import { getAgentDisplayName } from "../shared/agent-display-names";
import { discoverConfigSourceSkills, discoverOpencodeGlobalSkills, discoverOpencodeProjectSkills, discoverProjectClaudeSkills, discoverUserClaudeSkills, } from "../features/opencode-skill-loader";
import { loadProjectAgents, loadUserAgents } from "../features/claude-code-agent-loader";
import { reorderAgentsByPriority } from "./agent-priority-order";
import { remapAgentKeysToDisplayNames } from "./agent-key-remapper";
import { buildPrometheusAgentConfig } from "./prometheus-agent-config-builder";
import { buildPlanDemoteConfig } from "./plan-model-inheritance";
function getConfiguredDefaultAgent(config) {
    const defaultAgent = config.default_agent;
    if (typeof defaultAgent !== "string")
        return undefined;
    const trimmedDefaultAgent = defaultAgent.trim();
    return trimmedDefaultAgent.length > 0 ? trimmedDefaultAgent : undefined;
}
export async function applyAgentConfig(params) {
    const migratedDisabledAgents = (params.pluginConfig.disabled_agents ?? []).map((agent) => {
        return AGENT_NAME_MAP[agent.toLowerCase()] ?? AGENT_NAME_MAP[agent] ?? agent;
    });
    const includeClaudeSkillsForAwareness = params.pluginConfig.claude_code?.skills ?? true;
    const [discoveredConfigSourceSkills, discoveredUserSkills, discoveredProjectSkills, discoveredOpencodeGlobalSkills, discoveredOpencodeProjectSkills,] = await Promise.all([
        discoverConfigSourceSkills({
            config: params.pluginConfig.skills,
            configDir: params.ctx.directory,
        }),
        includeClaudeSkillsForAwareness ? discoverUserClaudeSkills() : Promise.resolve([]),
        includeClaudeSkillsForAwareness
            ? discoverProjectClaudeSkills(params.ctx.directory)
            : Promise.resolve([]),
        discoverOpencodeGlobalSkills(),
        discoverOpencodeProjectSkills(params.ctx.directory),
    ]);
    const allDiscoveredSkills = [
        ...discoveredConfigSourceSkills,
        ...discoveredOpencodeProjectSkills,
        ...discoveredProjectSkills,
        ...discoveredOpencodeGlobalSkills,
        ...discoveredUserSkills,
    ];
    const browserProvider = params.pluginConfig.browser_automation_engine?.provider ?? "playwright";
    const currentModel = params.config.model;
    const disabledSkills = new Set(params.pluginConfig.disabled_skills ?? []);
    const useTaskSystem = params.pluginConfig.experimental?.task_system ?? false;
    const disableOmoEnv = params.pluginConfig.experimental?.disable_omo_env ?? false;
    const builtinAgents = await createBuiltinAgents(migratedDisabledAgents, params.pluginConfig.agents, params.ctx.directory, currentModel, params.pluginConfig.categories, params.pluginConfig.git_master, allDiscoveredSkills, params.ctx.client, browserProvider, currentModel, disabledSkills, useTaskSystem, disableOmoEnv);
    const includeClaudeAgents = params.pluginConfig.claude_code?.agents ?? true;
    const userAgents = includeClaudeAgents ? loadUserAgents() : {};
    const projectAgents = includeClaudeAgents ? loadProjectAgents(params.ctx.directory) : {};
    const rawPluginAgents = params.pluginComponents.agents;
    const pluginAgents = Object.fromEntries(Object.entries(rawPluginAgents).map(([key, value]) => [
        key,
        value ? migrateAgentConfig(value) : value,
    ]));
    const disabledAgentNames = new Set((migratedDisabledAgents ?? []).map(a => a.toLowerCase()));
    const filterDisabledAgents = (agents) => Object.fromEntries(Object.entries(agents).filter(([name]) => !disabledAgentNames.has(name.toLowerCase())));
    const isSisyphusEnabled = params.pluginConfig.sisyphus_agent?.disabled !== true;
    const builderEnabled = params.pluginConfig.sisyphus_agent?.default_builder_enabled ?? false;
    const plannerEnabled = params.pluginConfig.sisyphus_agent?.planner_enabled ?? true;
    const replacePlan = params.pluginConfig.sisyphus_agent?.replace_plan ?? true;
    const shouldDemotePlan = plannerEnabled && replacePlan;
    const configuredDefaultAgent = getConfiguredDefaultAgent(params.config);
    const configAgent = params.config.agent;
    if (isSisyphusEnabled && builtinAgents.sisyphus) {
        if (configuredDefaultAgent) {
            params.config.default_agent =
                getAgentDisplayName(configuredDefaultAgent);
        }
        else {
            params.config.default_agent =
                getAgentDisplayName("sisyphus");
        }
        const agentConfig = {
            sisyphus: builtinAgents.sisyphus,
        };
        agentConfig["sisyphus-junior"] = createSisyphusJuniorAgentWithOverrides(params.pluginConfig.agents?.["sisyphus-junior"], undefined);
        if (builderEnabled) {
            const { name: _buildName, ...buildConfigWithoutName } = configAgent?.build ?? {};
            const migratedBuildConfig = migrateAgentConfig(buildConfigWithoutName);
            const override = params.pluginConfig.agents?.["OpenCode-Builder"];
            const base = {
                ...migratedBuildConfig,
                description: `${configAgent?.build?.description ?? "Build agent"} (OpenCode default)`,
            };
            agentConfig["OpenCode-Builder"] = override ? { ...base, ...override } : base;
        }
        if (plannerEnabled) {
            const prometheusOverride = params.pluginConfig.agents?.["prometheus"];
            agentConfig["prometheus"] = await buildPrometheusAgentConfig({
                configAgentPlan: configAgent?.plan,
                pluginPrometheusOverride: prometheusOverride,
                userCategories: params.pluginConfig.categories,
                currentModel,
            });
        }
        const filteredConfigAgents = configAgent
            ? Object.fromEntries(Object.entries(configAgent)
                .filter(([key]) => {
                if (key === "build")
                    return false;
                if (key === "plan" && shouldDemotePlan)
                    return false;
                if (key in builtinAgents)
                    return false;
                return true;
            })
                .map(([key, value]) => [
                key,
                value ? migrateAgentConfig(value) : value,
            ]))
            : {};
        const migratedBuild = configAgent?.build
            ? migrateAgentConfig(configAgent.build)
            : {};
        const planDemoteConfig = shouldDemotePlan
            ? buildPlanDemoteConfig(agentConfig["prometheus"], params.pluginConfig.agents?.plan)
            : undefined;
        params.config.agent = {
            ...agentConfig,
            ...Object.fromEntries(Object.entries(builtinAgents).filter(([key]) => key !== "sisyphus")),
            ...filterDisabledAgents(userAgents),
            ...filterDisabledAgents(projectAgents),
            ...filterDisabledAgents(pluginAgents),
            ...filteredConfigAgents,
            build: { ...migratedBuild, mode: "subagent", hidden: true },
            ...(planDemoteConfig ? { plan: planDemoteConfig } : {}),
        };
    }
    else {
        params.config.agent = {
            ...builtinAgents,
            ...filterDisabledAgents(userAgents),
            ...filterDisabledAgents(projectAgents),
            ...filterDisabledAgents(pluginAgents),
            ...configAgent,
        };
    }
    if (params.config.agent) {
        params.config.agent = remapAgentKeysToDisplayNames(params.config.agent);
        params.config.agent = reorderAgentsByPriority(params.config.agent);
    }
    const agentResult = params.config.agent;
    log("[config-handler] agents loaded", { agentKeys: Object.keys(agentResult) });
    return agentResult;
}
