/**
 * Agent tool restrictions for session.prompt calls.
 * OpenCode SDK's session.prompt `tools` parameter expects boolean values.
 * true = tool allowed, false = tool denied.
 */
const EXPLORATION_AGENT_DENYLIST = {
    write: false,
    edit: false,
    task: false,
    call_omo_agent: false,
};
const AGENT_RESTRICTIONS = {
    explore: EXPLORATION_AGENT_DENYLIST,
    librarian: EXPLORATION_AGENT_DENYLIST,
    oracle: {
        write: false,
        edit: false,
        task: false,
        call_omo_agent: false,
    },
    metis: {
        write: false,
        edit: false,
        task: false,
    },
    momus: {
        write: false,
        edit: false,
        task: false,
    },
    "multimodal-looker": {
        read: true,
    },
    "sisyphus-junior": {
        task: false,
    },
};
export function getAgentToolRestrictions(agentName) {
    return AGENT_RESTRICTIONS[agentName]
        ?? Object.entries(AGENT_RESTRICTIONS).find(([key]) => key.toLowerCase() === agentName.toLowerCase())?.[1]
        ?? {};
}
export function hasAgentToolRestrictions(agentName) {
    const restrictions = AGENT_RESTRICTIONS[agentName]
        ?? Object.entries(AGENT_RESTRICTIONS).find(([key]) => key.toLowerCase() === agentName.toLowerCase())?.[1];
    return restrictions !== undefined && Object.keys(restrictions).length > 0;
}
