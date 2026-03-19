import { KEYWORD_DETECTORS, CODE_BLOCK_PATTERN, INLINE_CODE_PATTERN, } from "./constants";
export function removeCodeBlocks(text) {
    return text.replace(CODE_BLOCK_PATTERN, "").replace(INLINE_CODE_PATTERN, "");
}
/**
 * Resolves message to string, handling both static strings and dynamic functions.
 */
function resolveMessage(message, agentName, modelID) {
    return typeof message === "function" ? message(agentName, modelID) : message;
}
export function detectKeywords(text, agentName, modelID) {
    const textWithoutCode = removeCodeBlocks(text);
    return KEYWORD_DETECTORS.filter(({ pattern }) => pattern.test(textWithoutCode)).map(({ message }) => resolveMessage(message, agentName, modelID));
}
export function detectKeywordsWithType(text, agentName, modelID) {
    const textWithoutCode = removeCodeBlocks(text);
    const types = ["ultrawork", "search", "analyze", "brainstorm", "consult-metis"];
    return KEYWORD_DETECTORS.map(({ pattern, message }, index) => ({
        matches: pattern.test(textWithoutCode),
        type: types[index],
        message: resolveMessage(message, agentName, modelID),
    }))
        .filter((result) => result.matches)
        .map(({ type, message }) => ({ type, message }));
}
export function extractPromptText(parts) {
    return parts
        .filter((p) => p.type === "text")
        .map((p) => p.text || "")
        .join(" ");
}
