import { MULTIMODAL_LOOKER_AGENT } from "./constants";
import { log } from "../../shared";
function isObject(value) {
    return typeof value === "object" && value !== null;
}
function toAgentInfo(value) {
    if (!isObject(value))
        return null;
    const name = typeof value["name"] === "string" ? value["name"] : undefined;
    const variant = typeof value["variant"] === "string" ? value["variant"] : undefined;
    const modelValue = value["model"];
    const model = isObject(modelValue) &&
        typeof modelValue["providerID"] === "string" &&
        typeof modelValue["modelID"] === "string"
        ? { providerID: modelValue["providerID"], modelID: modelValue["modelID"] }
        : undefined;
    return { name, model, variant };
}
export async function resolveMultimodalLookerAgentMetadata(ctx) {
    try {
        const agentsResult = await ctx.client.app?.agents?.();
        const agentsRaw = isObject(agentsResult) ? agentsResult["data"] : undefined;
        const agents = Array.isArray(agentsRaw) ? agentsRaw.map(toAgentInfo).filter(Boolean) : [];
        const matched = agents.find((agent) => agent?.name?.toLowerCase() === MULTIMODAL_LOOKER_AGENT.toLowerCase());
        return {
            agentModel: matched?.model,
            agentVariant: matched?.variant,
        };
    }
    catch (error) {
        log("[look_at] Failed to resolve multimodal-looker model info", error);
        return {};
    }
}
