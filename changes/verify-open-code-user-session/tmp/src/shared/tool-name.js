const SPECIAL_TOOL_MAPPINGS = {
    webfetch: "WebFetch",
    websearch: "WebSearch",
    todoread: "TodoRead",
    todowrite: "TodoWrite",
};
function toPascalCase(str) {
    return str
        .split(/[-_\s]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join("");
}
export function transformToolName(toolName) {
    const trimmed = toolName.trim();
    const lower = trimmed.toLowerCase();
    if (lower in SPECIAL_TOOL_MAPPINGS) {
        return SPECIAL_TOOL_MAPPINGS[lower];
    }
    if (trimmed.includes("-") || trimmed.includes("_")) {
        return toPascalCase(trimmed);
    }
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
