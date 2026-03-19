export function createModelCacheState() {
    return {
        modelContextLimitsCache: new Map(),
        anthropicContext1MEnabled: false,
    };
}
