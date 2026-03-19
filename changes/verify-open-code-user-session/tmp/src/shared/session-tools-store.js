const store = new Map();
export function setSessionTools(sessionID, tools) {
    store.set(sessionID, { ...tools });
}
export function getSessionTools(sessionID) {
    const tools = store.get(sessionID);
    return tools ? { ...tools } : undefined;
}
export function deleteSessionTools(sessionID) {
    store.delete(sessionID);
}
export function clearSessionTools() {
    store.clear();
}
