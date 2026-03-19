import { getSessionTools } from "./session-tools-store";
export function normalizePromptTools(tools) {
    if (!tools) {
        return undefined;
    }
    const normalized = {};
    for (const [toolName, permission] of Object.entries(tools)) {
        if (permission === false || permission === "deny") {
            normalized[toolName] = false;
            continue;
        }
        if (permission === true || permission === "allow" || permission === "ask") {
            normalized[toolName] = true;
        }
    }
    return Object.keys(normalized).length > 0 ? normalized : undefined;
}
export function resolveInheritedPromptTools(sessionID, fallbackTools) {
    const sessionTools = getSessionTools(sessionID);
    if (sessionTools && Object.keys(sessionTools).length > 0) {
        return { ...sessionTools };
    }
    return normalizePromptTools(fallbackTools);
}
