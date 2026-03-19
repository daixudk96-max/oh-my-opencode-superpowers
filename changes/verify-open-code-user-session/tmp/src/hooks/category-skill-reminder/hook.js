import { getSessionAgent } from "../../features/claude-code-session-state";
import { log } from "../../shared";
import { getAgentConfigKey } from "../../shared/agent-display-names";
import { buildReminderMessage } from "./formatter";
/**
 * Target agents that should receive category+skill reminders.
 * These are orchestrator agents that delegate work to specialized agents.
 */
const TARGET_AGENTS = new Set([
    "sisyphus",
    "sisyphus-junior",
    "atlas",
]);
/**
 * Tools that indicate the agent is doing work that could potentially be delegated.
 * When these tools are used, we remind the agent about the category+skill system.
 */
const DELEGATABLE_WORK_TOOLS = new Set([
    "edit",
    "write",
    "bash",
    "read",
    "grep",
    "glob",
]);
/**
 * Tools that indicate the agent is already using delegation properly.
 */
const DELEGATION_TOOLS = new Set([
    "task",
    "call_omo_agent",
]);
export function createCategorySkillReminderHook(_ctx, availableSkills = []) {
    const sessionStates = new Map();
    const reminderMessage = buildReminderMessage(availableSkills);
    function getOrCreateState(sessionID) {
        if (!sessionStates.has(sessionID)) {
            sessionStates.set(sessionID, {
                delegationUsed: false,
                reminderShown: false,
                toolCallCount: 0,
            });
        }
        return sessionStates.get(sessionID);
    }
    function isTargetAgent(sessionID, inputAgent) {
        const agent = getSessionAgent(sessionID) ?? inputAgent;
        if (!agent)
            return false;
        const agentKey = getAgentConfigKey(agent);
        return (TARGET_AGENTS.has(agentKey) ||
            agentKey.includes("sisyphus") ||
            agentKey.includes("atlas"));
    }
    const toolExecuteAfter = async (input, output) => {
        const { tool, sessionID } = input;
        const toolLower = tool.toLowerCase();
        if (!isTargetAgent(sessionID, input.agent)) {
            return;
        }
        const state = getOrCreateState(sessionID);
        if (DELEGATION_TOOLS.has(toolLower)) {
            state.delegationUsed = true;
            log("[category-skill-reminder] Delegation tool used", { sessionID, tool });
            return;
        }
        if (!DELEGATABLE_WORK_TOOLS.has(toolLower)) {
            return;
        }
        state.toolCallCount++;
        if (state.toolCallCount >= 3 && !state.delegationUsed && !state.reminderShown) {
            output.output += reminderMessage;
            state.reminderShown = true;
            log("[category-skill-reminder] Reminder injected", {
                sessionID,
                toolCallCount: state.toolCallCount,
            });
        }
    };
    const eventHandler = async ({ event }) => {
        const props = event.properties;
        if (event.type === "session.deleted") {
            const sessionInfo = props?.info;
            if (sessionInfo?.id) {
                sessionStates.delete(sessionInfo.id);
            }
        }
        if (event.type === "session.compacted") {
            const sessionID = (props?.sessionID ??
                props?.info?.id);
            if (sessionID) {
                sessionStates.delete(sessionID);
            }
        }
    };
    return {
        "tool.execute.after": toolExecuteAfter,
        event: eventHandler,
    };
}
