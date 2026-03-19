import { saveInteractiveBashSessionState, clearInteractiveBashSessionState } from "./storage";
import { buildSessionReminderMessage } from "./constants";
import { tokenizeCommand, findSubcommand, extractSessionNameFromTokens } from "./parser";
import { getOrCreateState, isOmoSession, killAllTrackedSessions } from "./state-manager";
import { subagentSessions } from "../../features/claude-code-session-state";
export function createInteractiveBashSessionHook(ctx) {
    const sessionStates = new Map();
    function getOrCreateStateLocal(sessionID) {
        return getOrCreateState(sessionID, sessionStates);
    }
    async function killAllTrackedSessionsLocal(state) {
        await killAllTrackedSessions(state);
        for (const sessionId of subagentSessions) {
            ctx.client.session.abort({ path: { id: sessionId } }).catch(() => { });
        }
    }
    const toolExecuteAfter = async (input, output) => {
        const { tool, sessionID, args } = input;
        const toolLower = tool.toLowerCase();
        if (toolLower !== "interactive_bash") {
            return;
        }
        if (typeof args?.tmux_command !== "string") {
            return;
        }
        const tmuxCommand = args.tmux_command;
        const tokens = tokenizeCommand(tmuxCommand);
        const subCommand = findSubcommand(tokens);
        const state = getOrCreateStateLocal(sessionID);
        let stateChanged = false;
        const toolOutput = output?.output ?? "";
        if (toolOutput.startsWith("Error:")) {
            return;
        }
        const isNewSession = subCommand === "new-session";
        const isKillSession = subCommand === "kill-session";
        const isKillServer = subCommand === "kill-server";
        const sessionName = extractSessionNameFromTokens(tokens, subCommand);
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
        if (isSessionOperation) {
            const reminder = buildSessionReminderMessage(Array.from(state.tmuxSessions));
            if (reminder) {
                output.output += reminder;
            }
        }
    };
    const eventHandler = async ({ event }) => {
        const props = event.properties;
        if (event.type === "session.deleted") {
            const sessionInfo = props?.info;
            const sessionID = sessionInfo?.id;
            if (sessionID) {
                const state = getOrCreateStateLocal(sessionID);
                await killAllTrackedSessionsLocal(state);
                sessionStates.delete(sessionID);
                clearInteractiveBashSessionState(sessionID);
            }
        }
    };
    return {
        "tool.execute.after": toolExecuteAfter,
        event: eventHandler,
    };
}
