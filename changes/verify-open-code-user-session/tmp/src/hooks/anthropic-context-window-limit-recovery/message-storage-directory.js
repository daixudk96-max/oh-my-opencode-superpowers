import { existsSync, readdirSync } from "node:fs";
import { getMessageDir } from "../../shared/opencode-message-dir";
import { normalizeSDKResponse } from "../../shared";
export { getMessageDir };
export async function getMessageIdsFromSDK(client, sessionID) {
    try {
        const response = await client.session.messages({ path: { id: sessionID } });
        const messages = normalizeSDKResponse(response, [], { preferResponseOnMissingData: true });
        return messages.map(msg => msg.info.id);
    }
    catch {
        return [];
    }
}
export function getMessageIds(sessionID) {
    const messageDir = getMessageDir(sessionID);
    if (!messageDir || !existsSync(messageDir))
        return [];
    const messageIds = [];
    for (const file of readdirSync(messageDir)) {
        if (!file.endsWith(".json"))
            continue;
        const messageId = file.replace(".json", "");
        messageIds.push(messageId);
    }
    return messageIds;
}
