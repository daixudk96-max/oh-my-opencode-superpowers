import { createInternalAgentTextPart, resolveInheritedPromptTools } from "../../shared";
const RECOVERY_RESUME_TEXT = "[session recovered - continuing previous task]";
export function findLastUserMessage(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].info?.role === "user") {
            return messages[i];
        }
    }
    return undefined;
}
export function extractResumeConfig(userMessage, sessionID) {
    return {
        sessionID,
        agent: userMessage?.info?.agent,
        model: userMessage?.info?.model,
        tools: userMessage?.info?.tools,
    };
}
export async function resumeSession(client, config) {
    try {
        const inheritedTools = resolveInheritedPromptTools(config.sessionID, config.tools);
        await client.session.promptAsync({
            path: { id: config.sessionID },
            body: {
                parts: [createInternalAgentTextPart(RECOVERY_RESUME_TEXT)],
                agent: config.agent,
                model: config.model,
                ...(inheritedTools ? { tools: inheritedTools } : {}),
            },
        });
        return true;
    }
    catch {
        return false;
    }
}
