import { AGENT_MODEL_REQUIREMENTS, isModelAvailable } from "../../shared";
import { buildAgent, isFactory } from "../agent-builder";
import { applyOverrides } from "./agent-overrides";
import { applyEnvironmentContext } from "./environment-context";
import { applyModelResolution } from "./model-resolution";
export function collectPendingBuiltinAgents(input) {
    const { agentSources, agentMetadata, disabledAgents, agentOverrides, directory, systemDefaultModel, mergedCategories, gitMasterConfig, browserProvider, uiSelectedModel, availableModels, disabledSkills, disableOmoEnv = false, } = input;
    const availableAgents = [];
    const pendingAgentConfigs = new Map();
    for (const [name, source] of Object.entries(agentSources)) {
        const agentName = name;
        if (agentName === "sisyphus")
            continue;
        if (agentName === "hephaestus")
            continue;
        if (agentName === "atlas")
            continue;
        if (disabledAgents.some((name) => name.toLowerCase() === agentName.toLowerCase()))
            continue;
        const override = agentOverrides[agentName]
            ?? Object.entries(agentOverrides).find(([key]) => key.toLowerCase() === agentName.toLowerCase())?.[1];
        const requirement = AGENT_MODEL_REQUIREMENTS[agentName];
        // Check if agent requires a specific model
        if (requirement?.requiresModel && availableModels) {
            if (!isModelAvailable(requirement.requiresModel, availableModels)) {
                continue;
            }
        }
        const isPrimaryAgent = isFactory(source) && source.mode === "primary";
        const resolution = applyModelResolution({
            uiSelectedModel: (isPrimaryAgent && !override?.model) ? uiSelectedModel : undefined,
            userModel: override?.model,
            requirement,
            availableModels,
            systemDefaultModel,
        });
        if (!resolution)
            continue;
        const { model, variant: resolvedVariant } = resolution;
        let config = buildAgent(source, model, mergedCategories, gitMasterConfig, browserProvider, disabledSkills);
        // Apply resolved variant from model fallback chain
        if (resolvedVariant) {
            config = { ...config, variant: resolvedVariant };
        }
        if (agentName === "librarian") {
            config = applyEnvironmentContext(config, directory, { disableOmoEnv });
        }
        config = applyOverrides(config, override, mergedCategories, directory);
        // Store for later - will be added after sisyphus and hephaestus
        pendingAgentConfigs.set(name, config);
        const metadata = agentMetadata[agentName];
        if (metadata) {
            availableAgents.push({
                name: agentName,
                description: config.description ?? "",
                metadata,
            });
        }
    }
    return { pendingAgentConfigs, availableAgents };
}
