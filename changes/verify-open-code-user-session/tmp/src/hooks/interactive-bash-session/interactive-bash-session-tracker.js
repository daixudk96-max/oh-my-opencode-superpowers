import { loadInteractiveBashSessionState, saveInteractiveBashSessionState, clearInteractiveBashSessionState, } from "./storage";
import { OMO_SESSION_PREFIX, buildSessionReminderMessage } from "./constants";
import { subagentSessions } from "../../features/claude-code-session-state";
import { spawnWithWindowsHide } from "../../shared/spawn-with-windows-hide";
function isOmoSession(sessionName) {
    return sessionName !== null && sessionName.startsWith(OMO_SESSION_PREFIX);
}
async function killAllTrackedSessions(abortSession, state) {
    for (const sessionName of state.tmuxSessions) {
        try {
            const proc = spawnWithWindowsHide(["tmux", "kill-session", "-t", sessionName], {
                stdout: "ignore",
                stderr: "ignore",
            });
            await proc.exited;
        }
        catch {
            // best-effort cleanup
        }
    }
    for (const sessionId of subagentSessions) {
        abortSession({ path: { id: sessionId } }).catch(() => { });
    }
}
export function createInteractiveBashSessionTracker(options) {
    const { abortSession } = options;
    const sessionStates = new Map();
    function getOrCreateState(sessionID) {
        const existing = sessionStates.get(sessionID);
        if (existing)
            return existing;
        const persisted = loadInteractiveBashSessionState(sessionID);
        const state = persisted ?? {
            sessionID,
            tmuxSessions: new Set(),
            updatedAt: Date.now(),
        };
        sessionStates.set(sessionID, state);
        return state;
    }
    async function handleSessionDeleted(sessionID) {
        const state = getOrCreateState(sessionID);
        await killAllTrackedSessions(abortSession, state);
        sessionStates.delete(sessionID);
        clearInteractiveBashSessionState(sessionID);
    }
    function handleTmuxCommand(input) {
        const { sessionID, subCommand, sessionName, toolOutput } = input;
        const state = getOrCreateState(sessionID);
        let stateChanged = false;
        if (toolOutput.startsWith("Error:")) {
            return { reminderToAppend: null };
        }
        const isNewSession = subCommand === "new-session";
        const isKillSession = subCommand === "kill-session";
        const isKillServer = subCommand === "kill-server";
        if (isNewSession && isOmoSession(sessionName)) {
            state.tmuxSessions.add(sessionName);
            stateChanged = true;
        }
        else if (isKillSession && isOmoSession(sessionName)) {
            state.tmuxSessions.delete(sessionName);
            stateChanged = true;
        }
        else if (isKillServer) {
            state.tmuxSessions.clear();
            stateChanged = true;
        }
        if (stateChanged) {
            state.updatedAt = Date.now();
            saveInteractiveBashSessionState(state);
        }
        const isSessionOperation = isNewSession || isKillSession || isKillServer;
        if (!isSessionOperation) {
            return { reminderToAppend: null };
        }
        const reminder = buildSessionReminderMessage(Array.from(state.tmuxSessions));
        return { reminderToAppend: reminder || null };
    }
    return { getOrCreateState, handleSessionDeleted, handleTmuxCommand };
}
