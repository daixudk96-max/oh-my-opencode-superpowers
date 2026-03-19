import { normalizeModel } from "./model-normalization";
import { resolveModelPipeline } from "./model-resolution-pipeline";
export function resolveModel(input) {
    return (normalizeModel(input.userModel) ??
        normalizeModel(input.inheritedModel) ??
        input.systemDefault);
}
export function resolveModelWithFallback(input) {
    const { uiSelectedModel, userModel, userFallbackModels, categoryDefaultModel, fallbackChain, availableModels, systemDefaultModel } = input;
    const resolved = resolveModelPipeline({
        intent: { uiSelectedModel, userModel, userFallbackModels, categoryDefaultModel },
        constraints: { availableModels },
        policy: { fallbackChain, systemDefaultModel },
    });
    if (!resolved) {
        return undefined;
    }
    // TDD-EXEMPT: reason="Cleaning up debug logs after verifying Always Opus bug is NOT in shared/model-resolver"
    return {
        model: resolved.model,
        source: resolved.provenance,
        variant: resolved.variant,
    };
}
/**
 * Normalizes fallback_models config (which can be string or string[]) to string[]
 * Centralized helper to avoid duplicated normalization logic
 */
export function normalizeFallbackModels(models) {
    if (!models)
        return undefined;
    if (typeof models === "string")
        return [models];
    return models;
}
