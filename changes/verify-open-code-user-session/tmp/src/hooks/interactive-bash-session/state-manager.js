import { loadInteractiveBashSessionState } from "./storage";
import { OMO_SESSION_PREFIX } from "./constants";
import { spawnWithWindowsHide } from "../../shared/spawn-with-windows-hide";
export function getOrCreateState(sessionID, sessionStates) {
    if (!sessionStates.has(sessionID)) {
        const persisted = loadInteractiveBashSessionState(sessionID);
        const state = persisted ?? {
            sessionID,
            tmuxSessions: new Set(),
            updatedAt: Date.now(),
        };
        sessionStates.set(sessionID, state);
    }
    return sessionStates.get(sessionID);
}
export function isOmoSession(sessionName) {
    return sessionName !== null && sessionName.startsWith(OMO_SESSION_PREFIX);
}
export async function killAllTrackedSessions(state) {
    for (const sessionName of state.tmuxSessions) {
        try {
            const proc = spawnWithWindowsHide(["tmux", "kill-session", "-t", sessionName], {
                stdout: "ignore",
                stderr: "ignore",
            });
            await proc.exited;
        }
        catch { }
    }
}
