import { getSessionAgent } from "../../features/claude-code-session-state";
export const AGENT_NAMES = [
    "sisyphus",
    "oracle",
    "librarian",
    "explore",
    "prometheus",
    "atlas",
    "metis",
    "momus",
    "hephaestus",
    "sisyphus-junior",
    "build",
    "plan",
    "multimodal-looker",
];
export const agentPattern = new RegExp(`\\b(${AGENT_NAMES
    .sort((a, b) => b.length - a.length)
    .map((a) => a.replace(/-/g, "\\-"))
    .join("|")})\\b`, "i");
export function detectAgentFromSession(sessionID) {
    const match = sessionID.match(agentPattern);
    if (match) {
        return match[1].toLowerCase();
    }
    return undefined;
}
export function normalizeAgentName(agent) {
    if (!agent)
        return undefined;
    const normalized = agent.toLowerCase().trim();
    if (AGENT_NAMES.includes(normalized)) {
        return normalized;
    }
    const match = normalized.match(agentPattern);
    if (match) {
        return match[1].toLowerCase();
    }
    return undefined;
}
export function resolveAgentForSession(sessionID, eventAgent) {
    return (normalizeAgentName(eventAgent) ??
        normalizeAgentName(getSessionAgent(sessionID)) ??
        detectAgentFromSession(sessionID));
}
