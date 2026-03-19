const MODEL_SETTINGS_KEYS = [
    "model",
    "variant",
    "temperature",
    "top_p",
    "maxTokens",
    "thinking",
    "reasoningEffort",
    "textVerbosity",
    "providerOptions",
];
export function buildPlanDemoteConfig(prometheusConfig, planOverride) {
    const modelSettings = {};
    for (const key of MODEL_SETTINGS_KEYS) {
        const value = planOverride?.[key] ?? prometheusConfig?.[key];
        if (value !== undefined) {
            modelSettings[key] = value;
        }
    }
    return { mode: "subagent", ...modelSettings };
}
