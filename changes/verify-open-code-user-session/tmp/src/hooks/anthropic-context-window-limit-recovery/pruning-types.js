export const CHARS_PER_TOKEN = 4;
export function estimateTokens(text) {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}
