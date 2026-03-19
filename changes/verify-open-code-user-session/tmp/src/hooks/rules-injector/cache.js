import { clearInjectedRules, loadInjectedRules } from "./storage";
export function createSessionCacheStore() {
    const sessionCaches = new Map();
    function getSessionCache(sessionID) {
        if (!sessionCaches.has(sessionID)) {
            sessionCaches.set(sessionID, loadInjectedRules(sessionID));
        }
        return sessionCaches.get(sessionID);
    }
    function clearSessionCache(sessionID) {
        sessionCaches.delete(sessionID);
        clearInjectedRules(sessionID);
    }
    return { getSessionCache, clearSessionCache };
}
