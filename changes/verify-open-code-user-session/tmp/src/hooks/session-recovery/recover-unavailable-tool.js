import { extractUnavailableToolName } from "./detect-error-type";
import { readParts } from "./storage";
import { normalizeSDKResponse } from "../../shared";
import { isSqliteBackend } from "../../shared/opencode-storage-detection";
function extractToolUseParts(parts) {
    return parts.filter((part) => part.type === "tool_use" && typeof part.id === "string" && typeof part.name === "string");
}
async function readPartsFromSDKFallback(client, sessionID, messageID) {
    try {
        const response = await client.session.messages({ path: { id: sessionID } });
        const messages = normalizeSDKResponse(response, [], { preferResponseOnMissingData: true });
        const target = messages.find((message) => message.info?.id === messageID);
        if (!target?.parts)
            return [];
        return target.parts.map((part) => ({
            type: part.type === "tool" ? "tool_use" : part.type,
            id: "callID" in part ? part.callID : part.id,
            name: "name" in part && typeof part.name === "string" ? part.name : ("tool" in part && typeof part.tool === "string" ? part.tool : undefined),
        }));
    }
    catch {
        return [];
    }
}
export async function recoverUnavailableTool(client, sessionID, failedAssistantMsg) {
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
                name: "tool" in part && typeof part.tool === "string" ? part.tool : undefined,
            }));
        }
    }
    const toolUseParts = extractToolUseParts(parts);
    if (toolUseParts.length === 0) {
        return false;
    }
    const unavailableToolName = extractUnavailableToolName(failedAssistantMsg.info?.error);
    const matchingToolUses = unavailableToolName
        ? toolUseParts.filter((part) => part.name.toLowerCase() === unavailableToolName)
        : [];
    const targetToolUses = matchingToolUses.length > 0 ? matchingToolUses : toolUseParts;
    const toolResultParts = targetToolUses.map((part) => ({
        type: "tool_result",
        tool_use_id: part.id,
        content: '{"status":"error","error":"Tool not available. Please continue without this tool."}',
    }));
    try {
        const promptInput = {
            path: { id: sessionID },
            body: { parts: toolResultParts },
        };
        const promptAsync = client.session.promptAsync;
        await Reflect.apply(promptAsync, client.session, [promptInput]);
        return true;
    }
    catch {
        return false;
    }
}
