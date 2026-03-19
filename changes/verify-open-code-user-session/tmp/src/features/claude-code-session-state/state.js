export const subagentSessions = new Set();
export const syncSubagentSessions = new Set();
let _mainSessionID;
export function setMainSession(id) {
    _mainSessionID = id;
}
export function getMainSessionID() {
    return _mainSessionID;
}
/** @internal For testing only */
export function _resetForTesting() {
    _mainSessionID = undefined;
    subagentSessions.clear();
    syncSubagentSessions.clear();
    sessionAgentMap.clear();
}
const sessionAgentMap = new Map();
export function setSessionAgent(sessionID, agent) {
    if (!sessionAgentMap.has(sessionID)) {
        sessionAgentMap.set(sessionID, agent);
    }
}
export function updateSessionAgent(sessionID, agent) {
    sessionAgentMap.set(sessionID, agent);
}
export function getSessionAgent(sessionID) {
    return sessionAgentMap.get(sessionID);
}
export function clearSessionAgent(sessionID) {
    sessionAgentMap.delete(sessionID);
}
