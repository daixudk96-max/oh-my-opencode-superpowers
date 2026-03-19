import { deepMerge, migrateAgentConfig } from "../../shared";
import { resolvePromptAppend } from "./resolve-file-uri";
/**
 * Expands a category reference from an agent override into concrete config properties.
 * Category properties are applied unconditionally (overwriting factory defaults),
 * because the user's chosen category should take priority over factory base values.
 * Direct override properties applied later via mergeAgentConfig() will supersede these.
 */
export function applyCategoryOverride(config, categoryName, mergedCategories) {
    const categoryConfig = mergedCategories[categoryName];
    if (!categoryConfig)
        return config;
    const result = { ...config };
    if (categoryConfig.model)
        result.model = categoryConfig.model;
    if (categoryConfig.variant !== undefined)
        result.variant = categoryConfig.variant;
    if (categoryConfig.temperature !== undefined)
        result.temperature = categoryConfig.temperature;
    if (categoryConfig.reasoningEffort !== undefined)
        result.reasoningEffort = categoryConfig.reasoningEffort;
    if (categoryConfig.textVerbosity !== undefined)
        result.textVerbosity = categoryConfig.textVerbosity;
    if (categoryConfig.thinking !== undefined)
        result.thinking = categoryConfig.thinking;
    if (categoryConfig.top_p !== undefined)
        result.top_p = categoryConfig.top_p;
    if (categoryConfig.maxTokens !== undefined)
        result.maxTokens = categoryConfig.maxTokens;
    if (categoryConfig.prompt_append && typeof result.prompt === "string") {
        result.prompt = result.prompt + "\n" + resolvePromptAppend(categoryConfig.prompt_append);
    }
    return result;
}
export function mergeAgentConfig(base, override, directory) {
    const migratedOverride = migrateAgentConfig(override);
    const { prompt_append, ...rest } = migratedOverride;
    const merged = deepMerge(base, rest);
    if (prompt_append && merged.prompt) {
        merged.prompt = merged.prompt + "\n" + resolvePromptAppend(prompt_append, directory);
    }
    return merged;
}
export function applyOverrides(config, override, mergedCategories, directory) {
    let result = config;
    const overrideCategory = override?.category;
    if (overrideCategory) {
        result = applyCategoryOverride(result, overrideCategory, mergedCategories);
    }
    if (override) {
        result = mergeAgentConfig(result, override, directory);
    }
    return result;
}
