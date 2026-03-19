import { getAgentDisplayName } from "../shared/agent-display-names";
const CORE_AGENT_ORDER = [
    getAgentDisplayName("sisyphus"),
    getAgentDisplayName("hephaestus"),
    getAgentDisplayName("prometheus"),
    getAgentDisplayName("atlas"),
];
export function reorderAgentsByPriority(agents) {
    const ordered = {};
    const seen = new Set();
    for (const key of CORE_AGENT_ORDER) {
        if (Object.prototype.hasOwnProperty.call(agents, key)) {
            ordered[key] = agents[key];
            seen.add(key);
        }
    }
    for (const [key, value] of Object.entries(agents)) {
        if (!seen.has(key)) {
            ordered[key] = value;
        }
    }
    return ordered;
}
