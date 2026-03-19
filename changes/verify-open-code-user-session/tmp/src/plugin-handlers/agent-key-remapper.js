import { AGENT_DISPLAY_NAMES } from "../shared/agent-display-names";
export function remapAgentKeysToDisplayNames(agents) {
    const result = {};
    for (const [key, value] of Object.entries(agents)) {
        const displayName = AGENT_DISPLAY_NAMES[key];
        if (displayName && displayName !== key) {
            result[displayName] = value;
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
