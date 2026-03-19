import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, } from "node:fs";
import { join } from "node:path";
import { INTERACTIVE_BASH_SESSION_STORAGE } from "./constants";
function getStoragePath(sessionID) {
    return join(INTERACTIVE_BASH_SESSION_STORAGE, `${sessionID}.json`);
}
export function loadInteractiveBashSessionState(sessionID) {
    const filePath = getStoragePath(sessionID);
    if (!existsSync(filePath))
        return null;
    try {
        const content = readFileSync(filePath, "utf-8");
        const serialized = JSON.parse(content);
        return {
            sessionID: serialized.sessionID,
            tmuxSessions: new Set(serialized.tmuxSessions),
            updatedAt: serialized.updatedAt,
        };
    }
    catch {
        return null;
    }
}
export function saveInteractiveBashSessionState(state) {
    if (!existsSync(INTERACTIVE_BASH_SESSION_STORAGE)) {
        mkdirSync(INTERACTIVE_BASH_SESSION_STORAGE, { recursive: true });
    }
    const filePath = getStoragePath(state.sessionID);
    const serialized = {
        sessionID: state.sessionID,
        tmuxSessions: Array.from(state.tmuxSessions),
        updatedAt: state.updatedAt,
    };
    writeFileSync(filePath, JSON.stringify(serialized, null, 2));
}
export function clearInteractiveBashSessionState(sessionID) {
    const filePath = getStoragePath(sessionID);
    if (existsSync(filePath)) {
        unlinkSync(filePath);
    }
}
