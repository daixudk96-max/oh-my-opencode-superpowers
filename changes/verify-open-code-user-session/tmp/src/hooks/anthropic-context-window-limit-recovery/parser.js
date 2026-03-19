const TOKEN_LIMIT_PATTERNS = [
    /(\d+)\s*tokens?\s*>\s*(\d+)\s*maximum/i,
    /prompt.*?(\d+).*?tokens.*?exceeds.*?(\d+)/i,
    /(\d+).*?tokens.*?limit.*?(\d+)/i,
    /context.*?length.*?(\d+).*?maximum.*?(\d+)/i,
    /max.*?context.*?(\d+).*?but.*?(\d+)/i,
];
const TOKEN_LIMIT_KEYWORDS = [
    "prompt is too long",
    "is too long",
    "context_length_exceeded",
    "max_tokens",
    "token limit",
    "context length",
    "too many tokens",
    "non-empty content",
];
// Patterns that indicate thinking block structure errors (NOT token limit errors)
// These should be handled by session-recovery hook, not compaction
const THINKING_BLOCK_ERROR_PATTERNS = [
    /thinking.*first block/i,
    /first block.*thinking/i,
    /must.*start.*thinking/i,
    /thinking.*redacted_thinking/i,
    /expected.*thinking.*found/i,
    /thinking.*disabled.*cannot.*contain/i,
];
function isThinkingBlockError(text) {
    return THINKING_BLOCK_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}
const MESSAGE_INDEX_PATTERN = /messages\.(\d+)/;
function extractTokensFromMessage(message) {
    for (const pattern of TOKEN_LIMIT_PATTERNS) {
        const match = message.match(pattern);
        if (match) {
            const num1 = parseInt(match[1], 10);
            const num2 = parseInt(match[2], 10);
            return num1 > num2 ? { current: num1, max: num2 } : { current: num2, max: num1 };
        }
    }
    return null;
}
function extractMessageIndex(text) {
    const match = text.match(MESSAGE_INDEX_PATTERN);
    if (match) {
        return parseInt(match[1], 10);
    }
    return undefined;
}
function isTokenLimitError(text) {
    if (isThinkingBlockError(text)) {
        return false;
    }
    const lower = text.toLowerCase();
    return TOKEN_LIMIT_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}
export function parseAnthropicTokenLimitError(err) {
    try {
        return parseAnthropicTokenLimitErrorUnsafe(err);
    }
    catch {
        return null;
    }
}
function parseAnthropicTokenLimitErrorUnsafe(err) {
    if (typeof err === "string") {
        if (err.toLowerCase().includes("non-empty content")) {
            return {
                currentTokens: 0,
                maxTokens: 0,
                errorType: "non-empty content",
                messageIndex: extractMessageIndex(err),
            };
        }
        if (isTokenLimitError(err)) {
            const tokens = extractTokensFromMessage(err);
            return {
                currentTokens: tokens?.current ?? 0,
                maxTokens: tokens?.max ?? 0,
                errorType: "token_limit_exceeded_string",
            };
        }
        return null;
    }
    if (!err || typeof err !== "object")
        return null;
    const errObj = err;
    const dataObj = errObj.data;
    const responseBody = dataObj?.responseBody;
    const errorMessage = errObj.message;
    const errorData = errObj.error;
    const nestedError = errorData?.error;
    const textSources = [];
    if (typeof responseBody === "string")
        textSources.push(responseBody);
    if (typeof errorMessage === "string")
        textSources.push(errorMessage);
    if (typeof errorData?.message === "string")
        textSources.push(errorData.message);
    if (typeof errObj.body === "string")
        textSources.push(errObj.body);
    if (typeof errObj.details === "string")
        textSources.push(errObj.details);
    if (typeof errObj.reason === "string")
        textSources.push(errObj.reason);
    if (typeof errObj.description === "string")
        textSources.push(errObj.description);
    if (typeof nestedError?.message === "string")
        textSources.push(nestedError.message);
    if (typeof dataObj?.message === "string")
        textSources.push(dataObj.message);
    if (typeof dataObj?.error === "string")
        textSources.push(dataObj.error);
    if (textSources.length === 0) {
        try {
            const jsonStr = JSON.stringify(errObj);
            if (isTokenLimitError(jsonStr)) {
                textSources.push(jsonStr);
            }
        }
        catch { }
    }
    const combinedText = textSources.join(" ");
    if (!isTokenLimitError(combinedText))
        return null;
    if (typeof responseBody === "string") {
        try {
            const jsonPatterns = [
                // Greedy match to last } for nested JSON
                /data:\s*(\{[\s\S]*\})\s*$/m,
                /(\{"type"\s*:\s*"error"[\s\S]*\})/,
                /(\{[\s\S]*"error"[\s\S]*\})/,
            ];
            for (const pattern of jsonPatterns) {
                const dataMatch = responseBody.match(pattern);
                if (dataMatch) {
                    try {
                        const jsonData = JSON.parse(dataMatch[1]);
                        const message = jsonData.error?.message || "";
                        const tokens = extractTokensFromMessage(message);
                        if (tokens) {
                            return {
                                currentTokens: tokens.current,
                                maxTokens: tokens.max,
                                requestId: jsonData.request_id,
                                errorType: jsonData.error?.type || "token_limit_exceeded",
                            };
                        }
                    }
                    catch { }
                }
            }
            const bedrockJson = JSON.parse(responseBody);
            if (typeof bedrockJson.message === "string" && isTokenLimitError(bedrockJson.message)) {
                return {
                    currentTokens: 0,
                    maxTokens: 0,
                    errorType: "bedrock_input_too_long",
                };
            }
        }
        catch { }
    }
    for (const text of textSources) {
        const tokens = extractTokensFromMessage(text);
        if (tokens) {
            return {
                currentTokens: tokens.current,
                maxTokens: tokens.max,
                errorType: "token_limit_exceeded",
            };
        }
    }
    if (combinedText.toLowerCase().includes("non-empty content")) {
        return {
            currentTokens: 0,
            maxTokens: 0,
            errorType: "non-empty content",
            messageIndex: extractMessageIndex(combinedText),
        };
    }
    if (isTokenLimitError(combinedText)) {
        return {
            currentTokens: 0,
            maxTokens: 0,
            errorType: "token_limit_exceeded_unknown",
        };
    }
    return null;
}
