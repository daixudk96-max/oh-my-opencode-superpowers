import { readParts } from "./storage";
import { isSqliteBackend } from "../../shared/opencode-storage-detection";
import { normalizeSDKResponse } from "../../shared";
function extractToolUseIds(parts) {
    return parts.filter((part) => part.type === "tool_use" && !!part.id).map((part) => part.id);
}
async function readPartsFromSDKFallback(client, sessionID, messageID) {
    try {
        const response = await client.session.messages({ path: { id: sessionID } });
        const messages = normalizeSDKResponse(response, [], { preferResponseOnMissingData: true });
        const target = messages.find((m) => m.info?.id === messageID);
        if (!target?.parts)
            return [];
        return target.parts.map((part) => ({
            type: part.type === "tool" ? "tool_use" : part.type,
            id: "callID" in part ? part.callID : part.id,
        }));
    }
    catch {
        return [];
    }
}
export async function recoverToolResultMissing(client, sessionID, failedAssistantMsg) {
    let parts = failedAssistantMsg.parts || [];
    if (parts.length === 0 && failedAssistantMsg.info?.id) {
        if (isSqliteBackend()) {
            parts = await readPartsFromSDKFallback(client, sessionID, failedAssistantMsg.info.id);
        }
        else {
            const storedParts = readParts(failedAssistantMsg.info.id);
            parts = storedParts.map((part) => ({
                type: part.type === "tool" ? "tool_use" : part.type,
                id: "callID" in part ? part.callID : part.id,
            }));
        }
    }
    const toolUseIds = extractToolUseIds(parts);
    if (toolUseIds.length === 0) {
        return false;
    }
    const toolResultParts = toolUseIds.map((id) => ({
        type: "tool_result",
        tool_use_id: id,
        content: "Operation cancelled by user (ESC pressed)",
    }));
    const promptInput = {
        path: { id: sessionID },
        body: { parts: toolResultParts },
    };
    try {
        await client.session.promptAsync(promptInput);
        return true;
    }
    catch {
        return false;
    }
}
