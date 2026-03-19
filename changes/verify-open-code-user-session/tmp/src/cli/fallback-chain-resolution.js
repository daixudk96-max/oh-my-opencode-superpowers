import { CLI_AGENT_MODEL_REQUIREMENTS } from "./model-fallback-requirements";
import { isProviderAvailable } from "./provider-availability";
import { transformModelForProvider } from "./provider-model-id-transform";
export function resolveModelFromChain(fallbackChain, availability) {
    for (const entry of fallbackChain) {
        for (const provider of entry.providers) {
            if (isProviderAvailable(provider, availability)) {
                const transformedModel = transformModelForProvider(provider, entry.model);
                return {
                    model: `${provider}/${transformedModel}`,
                    variant: entry.variant,
                };
            }
        }
    }
    return null;
}
export function getSisyphusFallbackChain() {
    return CLI_AGENT_MODEL_REQUIREMENTS.sisyphus.fallbackChain;
}
export function isAnyFallbackEntryAvailable(fallbackChain, availability) {
    return fallbackChain.some((entry) => entry.providers.some((provider) => isProviderAvailable(provider, availability)));
}
export function isRequiredModelAvailable(requiresModel, fallbackChain, availability) {
    const matchingEntry = fallbackChain.find((entry) => entry.model === requiresModel);
    if (!matchingEntry)
        return false;
    return matchingEntry.providers.some((provider) => isProviderAvailable(provider, availability));
}
export function isRequiredProviderAvailable(requiredProviders, availability) {
    return requiredProviders.some((provider) => isProviderAvailable(provider, availability));
}
