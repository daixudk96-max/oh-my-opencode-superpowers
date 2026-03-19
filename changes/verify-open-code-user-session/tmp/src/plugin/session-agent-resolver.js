import { log } from "../shared";
import { normalizeSDKResponse } from "../shared";
export async function resolveSessionAgent(client, sessionId) {
    try {
        const messagesResp = await client.session.messages({ path: { id: sessionId } });
        const messages = normalizeSDKResponse(messagesResp, []);
        for (const msg of messages) {
            if (msg.info?.agent) {
                return msg.info.agent;
            }
        }
    }
    catch (error) {
        log("[session-agent-resolver] Failed to resolve agent from session", {
            sessionId,
            error: String(error),
        });
    }
    return undefined;
}
