export function toProviderAvailability(config) {
    return {
        native: {
            claude: config.hasClaude,
            openai: config.hasOpenAI,
            gemini: config.hasGemini,
        },
        opencodeZen: config.hasOpencodeZen,
        copilot: config.hasCopilot,
        zai: config.hasZaiCodingPlan,
        kimiForCoding: config.hasKimiForCoding,
        isMaxPlan: config.isMax20,
    };
}
export function isProviderAvailable(provider, availability) {
    const mapping = {
        anthropic: availability.native.claude,
        openai: availability.native.openai,
        google: availability.native.gemini,
        "github-copilot": availability.copilot,
        opencode: availability.opencodeZen,
        "zai-coding-plan": availability.zai,
        "kimi-for-coding": availability.kimiForCoding,
    };
    return mapping[provider] ?? false;
}
