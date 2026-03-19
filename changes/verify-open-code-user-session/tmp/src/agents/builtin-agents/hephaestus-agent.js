import { AGENT_MODEL_REQUIREMENTS, isAnyProviderConnected } from "../../shared";
import { createHephaestusAgent } from "../hephaestus";
import { applyEnvironmentContext } from "./environment-context";
import { applyCategoryOverride, mergeAgentConfig } from "./agent-overrides";
import { applyModelResolution, getFirstFallbackModel } from "./model-resolution";
export function maybeCreateHephaestusConfig(input) {
    const { disabledAgents, agentOverrides, availableModels, systemDefaultModel, isFirstRunNoCache, availableAgents, availableSkills, availableCategories, mergedCategories, directory, useTaskSystem, disableOmoEnv = false, } = input;
    if (disabledAgents.includes("hephaestus"))
        return undefined;
    const hephaestusOverride = agentOverrides["hephaestus"];
    const hephaestusRequirement = AGENT_MODEL_REQUIREMENTS["hephaestus"];
    const hasHephaestusExplicitConfig = hephaestusOverride !== undefined;
    const hasRequiredProvider = !hephaestusRequirement?.requiresProvider ||
        hasHephaestusExplicitConfig ||
        isFirstRunNoCache ||
        isAnyProviderConnected(hephaestusRequirement.requiresProvider, availableModels);
    if (!hasRequiredProvider)
        return undefined;
    let hephaestusResolution = applyModelResolution({
        userModel: hephaestusOverride?.model,
        requirement: hephaestusRequirement,
        availableModels,
        systemDefaultModel,
    });
    // TDD-EXEMPT: reason="Fixing 'Always Opus' bug, verified with reproduce-opus-bug.test.ts"
    if (!hephaestusResolution && isFirstRunNoCache && !hephaestusOverride?.model) {
        hephaestusResolution = getFirstFallbackModel(hephaestusRequirement);
    }
    if (!hephaestusResolution)
        return undefined;
    const { model: hephaestusModel, variant: hephaestusResolvedVariant } = hephaestusResolution;
    let hephaestusConfig = createHephaestusAgent(hephaestusModel, availableAgents, undefined, availableSkills, availableCategories, useTaskSystem);
    hephaestusConfig = { ...hephaestusConfig, variant: hephaestusResolvedVariant ?? "medium" };
    const hepOverrideCategory = hephaestusOverride?.category;
    if (hepOverrideCategory) {
        hephaestusConfig = applyCategoryOverride(hephaestusConfig, hepOverrideCategory, mergedCategories);
    }
    hephaestusConfig = applyEnvironmentContext(hephaestusConfig, directory, { disableOmoEnv });
    if (hephaestusOverride) {
        hephaestusConfig = mergeAgentConfig(hephaestusConfig, hephaestusOverride, directory);
    }
    return hephaestusConfig;
}
