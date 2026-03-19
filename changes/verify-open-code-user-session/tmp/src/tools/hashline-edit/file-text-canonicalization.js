function detectLineEnding(content) {
    const crlfIndex = content.indexOf("\r\n");
    const lfIndex = content.indexOf("\n");
    if (lfIndex === -1)
        return "\n";
    if (crlfIndex === -1)
        return "\n";
    return crlfIndex < lfIndex ? "\r\n" : "\n";
}
function stripBom(content) {
    if (!content.startsWith("\uFEFF")) {
        return { content, hadBom: false };
    }
    return { content: content.slice(1), hadBom: true };
}
function normalizeToLf(content) {
    return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
function restoreLineEndings(content, lineEnding) {
    if (lineEnding === "\n")
        return content;
    return content.replace(/\n/g, "\r\n");
}
export function canonicalizeFileText(content) {
    const stripped = stripBom(content);
    return {
        content: normalizeToLf(stripped.content),
        hadBom: stripped.hadBom,
        lineEnding: detectLineEnding(stripped.content),
    };
}
export function restoreFileText(content, envelope) {
    const withLineEnding = restoreLineEndings(content, envelope.lineEnding);
    if (!envelope.hadBom)
        return withLineEnding;
    return `\uFEFF${withLineEnding}`;
}
