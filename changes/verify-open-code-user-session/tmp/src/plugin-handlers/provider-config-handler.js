export function applyProviderConfig(params) {
    const providers = params.config.provider;
    const anthropicBeta = providers?.anthropic?.options?.headers?.["anthropic-beta"];
    params.modelCacheState.anthropicContext1MEnabled =
        anthropicBeta?.includes("context-1m") ?? false;
    if (!providers)
        return;
    for (const [providerID, providerConfig] of Object.entries(providers)) {
        const models = providerConfig?.models;
        if (!models)
            continue;
        for (const [modelID, modelConfig] of Object.entries(models)) {
            const contextLimit = modelConfig?.limit?.context;
            if (!contextLimit)
                continue;
            params.modelCacheState.modelContextLimitsCache.set(`${providerID}/${modelID}`, contextLimit);
        }
    }
}
