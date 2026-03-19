import { AGENT_NAMES, agentPattern } from "./agent-resolver";
import { HOOK_NAME } from "./constants";
import { log } from "../../shared/logger";
import { SessionCategoryRegistry } from "../../shared/session-category-registry";
import { normalizeFallbackModels } from "../../shared/model-resolver";
export function getFallbackModelsForSession(sessionID, agent, pluginConfig) {
    if (!pluginConfig)
        return [];
    const sessionCategory = SessionCategoryRegistry.get(sessionID);
    if (sessionCategory && pluginConfig.categories?.[sessionCategory]) {
        const categoryConfig = pluginConfig.categories[sessionCategory];
        if (categoryConfig?.fallback_models) {
            return normalizeFallbackModels(categoryConfig.fallback_models) ?? [];
        }
    }
    const tryGetFallbackFromAgent = (agentName) => {
        const agentConfig = pluginConfig.agents?.[agentName];
        if (!agentConfig)
            return undefined;
        if (agentConfig?.fallback_models) {
            return normalizeFallbackModels(agentConfig.fallback_models);
        }
        const agentCategory = agentConfig?.category;
        if (agentCategory && pluginConfig.categories?.[agentCategory]) {
            const categoryConfig = pluginConfig.categories[agentCategory];
            if (categoryConfig?.fallback_models) {
                return normalizeFallbackModels(categoryConfig.fallback_models);
            }
        }
        return undefined;
    };
    if (agent) {
        const result = tryGetFallbackFromAgent(agent);
        if (result)
            return result;
    }
    const sessionAgentMatch = sessionID.match(agentPattern);
    if (sessionAgentMatch) {
        const detectedAgent = sessionAgentMatch[1].toLowerCase();
        const result = tryGetFallbackFromAgent(detectedAgent);
        if (result)
            return result;
    }
    const sisyphusFallback = tryGetFallbackFromAgent("sisyphus");
    if (sisyphusFallback) {
        log(`[${HOOK_NAME}] Using sisyphus fallback models (no agent detected)`, { sessionID });
        return sisyphusFallback;
    }
    for (const agentName of AGENT_NAMES) {
        const result = tryGetFallbackFromAgent(agentName);
        if (result) {
            log(`[${HOOK_NAME}] Using ${agentName} fallback models (no agent detected)`, { sessionID });
            return result;
        }
    }
    return [];
}
