export function parseAllowedTools(allowedTools) {
    if (!allowedTools)
        return undefined;
    if (Array.isArray(allowedTools)) {
        return allowedTools.map((tool) => tool.trim()).filter(Boolean);
    }
    return allowedTools.split(/\s+/).filter(Boolean);
}
