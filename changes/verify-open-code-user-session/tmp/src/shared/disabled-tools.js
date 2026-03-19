export function filterDisabledTools(tools, disabledTools) {
    if (!disabledTools || disabledTools.length === 0) {
        return tools;
    }
    const disabledToolSet = new Set(disabledTools);
    const filtered = {};
    for (const [toolName, toolDefinition] of Object.entries(tools)) {
        if (!disabledToolSet.has(toolName)) {
            filtered[toolName] = toolDefinition;
        }
    }
    return filtered;
}
