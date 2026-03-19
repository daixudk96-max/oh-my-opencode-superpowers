import { resolveModelPipeline } from "../../shared";
import { transformModelForProvider } from "../../shared/provider-model-id-transform";
export function applyModelResolution(input) {
    const { uiSelectedModel, userModel, requirement, availableModels, systemDefaultModel } = input;
    return resolveModelPipeline({
        intent: { uiSelectedModel, userModel },
        constraints: { availableModels },
        policy: { fallbackChain: requirement?.fallbackChain, systemDefaultModel },
    });
}
export function getFirstFallbackModel(requirement) {
    const entry = requirement?.fallbackChain?.[0];
    if (!entry || entry.providers.length === 0)
        return undefined;
    const provider = entry.providers[0];
    const transformedModel = transformModelForProvider(provider, entry.model);
    return {
        model: `${provider}/${transformedModel}`,
        provenance: "provider-fallback",
        variant: entry.variant,
    };
}
