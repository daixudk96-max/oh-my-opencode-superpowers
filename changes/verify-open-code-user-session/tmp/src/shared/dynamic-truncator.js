import { normalizeSDKResponse } from "./normalize-sdk-response";
const DEFAULT_ANTHROPIC_ACTUAL_LIMIT = 200_000;
const CHARS_PER_TOKEN_ESTIMATE = 4;
const DEFAULT_TARGET_MAX_TOKENS = 50_000;
function getAnthropicActualLimit(modelCacheState) {
    return (modelCacheState?.anthropicContext1MEnabled ?? false) ||
        process.env.ANTHROPIC_1M_CONTEXT === "true" ||
        process.env.VERTEX_ANTHROPIC_1M_CONTEXT === "true"
        ? 1_000_000
        : DEFAULT_ANTHROPIC_ACTUAL_LIMIT;
}
function estimateTokens(text) {
    return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}
export function truncateToTokenLimit(output, maxTokens, preserveHeaderLines = 3) {
    if (typeof output !== 'string') {
        return { result: String(output ?? ''), truncated: false };
    }
    const currentTokens = estimateTokens(output);
    if (currentTokens <= maxTokens) {
        return { result: output, truncated: false };
    }
    const lines = output.split("\n");
    if (lines.length <= preserveHeaderLines) {
        const maxChars = maxTokens * CHARS_PER_TOKEN_ESTIMATE;
        return {
            result: output.slice(0, maxChars) +
                "\n\n[Output truncated due to context window limit]",
            truncated: true,
        };
    }
    const headerLines = lines.slice(0, preserveHeaderLines);
    const contentLines = lines.slice(preserveHeaderLines);
    const headerText = headerLines.join("\n");
    const headerTokens = estimateTokens(headerText);
    const truncationMessageTokens = 50;
    const availableTokens = maxTokens - headerTokens - truncationMessageTokens;
    if (availableTokens <= 0) {
        return {
            result: headerText + "\n\n[Content truncated due to context window limit]",
            truncated: true,
            removedCount: contentLines.length,
        };
    }
    const resultLines = [];
    let currentTokenCount = 0;
    for (const line of contentLines) {
        const lineTokens = estimateTokens(line + "\n");
        if (currentTokenCount + lineTokens > availableTokens) {
            break;
        }
        resultLines.push(line);
        currentTokenCount += lineTokens;
    }
    const truncatedContent = [...headerLines, ...resultLines].join("\n");
    const removedCount = contentLines.length - resultLines.length;
    return {
        result: truncatedContent +
            `\n\n[${removedCount} more lines truncated due to context window limit]`,
        truncated: true,
        removedCount,
    };
}
export async function getContextWindowUsage(ctx, sessionID, modelCacheState) {
    try {
        const response = await ctx.client.session.messages({
            path: { id: sessionID },
        });
        const messages = normalizeSDKResponse(response, [], { preferResponseOnMissingData: true });
        const assistantMessages = messages
            .filter((m) => m.info.role === "assistant")
            .map((m) => m.info);
        if (assistantMessages.length === 0)
            return null;
        const lastAssistant = assistantMessages[assistantMessages.length - 1];
        const lastTokens = lastAssistant.tokens;
        const usedTokens = (lastTokens?.input ?? 0) +
            (lastTokens?.cache?.read ?? 0) +
            (lastTokens?.output ?? 0);
        const anthropicActualLimit = getAnthropicActualLimit(modelCacheState);
        const remainingTokens = anthropicActualLimit - usedTokens;
        return {
            usedTokens,
            remainingTokens,
            usagePercentage: usedTokens / anthropicActualLimit,
        };
    }
    catch {
        return null;
    }
}
export async function dynamicTruncate(ctx, sessionID, output, options = {}, modelCacheState) {
    if (typeof output !== 'string') {
        return { result: String(output ?? ''), truncated: false };
    }
    const { targetMaxTokens = DEFAULT_TARGET_MAX_TOKENS, preserveHeaderLines = 3, } = options;
    const usage = await getContextWindowUsage(ctx, sessionID, modelCacheState);
    if (!usage) {
        // Fallback: apply conservative truncation when context usage unavailable
        return truncateToTokenLimit(output, targetMaxTokens, preserveHeaderLines);
    }
    const maxOutputTokens = Math.min(usage.remainingTokens * 0.5, targetMaxTokens);
    if (maxOutputTokens <= 0) {
        return {
            result: "[Output suppressed - context window exhausted]",
            truncated: true,
        };
    }
    return truncateToTokenLimit(output, maxOutputTokens, preserveHeaderLines);
}
export function createDynamicTruncator(ctx, modelCacheState) {
    return {
        truncate: (sessionID, output, options) => dynamicTruncate(ctx, sessionID, output, options, modelCacheState),
        getUsage: (sessionID) => getContextWindowUsage(ctx, sessionID, modelCacheState),
        truncateSync: (output, maxTokens, preserveHeaderLines) => truncateToTokenLimit(output, maxTokens, preserveHeaderLines),
    };
}
