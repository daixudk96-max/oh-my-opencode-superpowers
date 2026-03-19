const sessionModels = new Map();
export function setSessionModel(sessionID, model) {
    sessionModels.set(sessionID, model);
}
export function getSessionModel(sessionID) {
    return sessionModels.get(sessionID);
}
export function clearSessionModel(sessionID) {
    sessionModels.delete(sessionID);
}
