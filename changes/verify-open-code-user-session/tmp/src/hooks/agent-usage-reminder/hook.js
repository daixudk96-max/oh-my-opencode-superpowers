import { loadAgentUsageState, saveAgentUsageState, clearAgentUsageState, } from "./storage";
import { TARGET_TOOLS, AGENT_TOOLS, REMINDER_MESSAGE } from "./constants";
import { getSessionAgent } from "../../features/claude-code-session-state";
import { getAgentConfigKey } from "../../shared/agent-display-names";
/**
 * Only orchestrator agents should receive usage reminders.
 * Subagents (explore, librarian, oracle, etc.) are the targets of delegation,
 * so reminding them to delegate to themselves is counterproductive.
 */
const ORCHESTRATOR_AGENTS = new Set([
    "sisyphus",
    "sisyphus-junior",
    "atlas",
    "hephaestus",
    "prometheus",
]);
function isOrchestratorAgent(agentName) {
    return ORCHESTRATOR_AGENTS.has(getAgentConfigKey(agentName));
}
export function createAgentUsageReminderHook(_ctx) {
    const sessionStates = new Map();
    function getOrCreateState(sessionID) {
        if (!sessionStates.has(sessionID)) {
            const persisted = loadAgentUsageState(sessionID);
            const state = persisted ?? {
                sessionID,
                agentUsed: false,
                reminderCount: 0,
                updatedAt: Date.now(),
            };
            sessionStates.set(sessionID, state);
        }
        return sessionStates.get(sessionID);
    }
    function markAgentUsed(sessionID) {
        const state = getOrCreateState(sessionID);
        state.agentUsed = true;
        state.updatedAt = Date.now();
        saveAgentUsageState(state);
    }
    function resetState(sessionID) {
        sessionStates.delete(sessionID);
        clearAgentUsageState(sessionID);
    }
    const toolExecuteAfter = async (input, output) => {
        const { tool, sessionID } = input;
        const agent = getSessionAgent(sessionID);
        if (agent && !isOrchestratorAgent(agent)) {
            return;
        }
        const toolLower = tool.toLowerCase();
        if (AGENT_TOOLS.has(toolLower)) {
            markAgentUsed(sessionID);
            return;
        }
        if (!TARGET_TOOLS.has(toolLower)) {
            return;
        }
        const state = getOrCreateState(sessionID);
        if (state.agentUsed) {
            return;
        }
        output.output += REMINDER_MESSAGE;
        state.reminderCount++;
        state.updatedAt = Date.now();
        saveAgentUsageState(state);
    };
    const eventHandler = async ({ event }) => {
        const props = event.properties;
        if (event.type === "session.deleted") {
            const sessionInfo = props?.info;
            if (sessionInfo?.id) {
                resetState(sessionInfo.id);
            }
        }
        if (event.type === "session.compacted") {
            const sessionID = (props?.sessionID ??
                props?.info?.id);
            if (sessionID) {
                resetState(sessionID);
            }
        }
    };
    return {
        "tool.execute.after": toolExecuteAfter,
        event: eventHandler,
    };
}
