import { replaceEmptyTextPartsAsync } from "../session-recovery/storage/empty-text";
import { injectTextPartAsync } from "../session-recovery/storage/text-part-injector";
const IGNORE_TYPES = new Set(["thinking", "redacted_thinking", "meta"]);
const TOOL_TYPES = new Set(["tool", "tool_use", "tool_result"]);
function messageHasContentFromSDK(message) {
    const parts = message.parts;
    if (!parts || parts.length === 0)
        return false;
    for (const part of parts) {
        const type = part.type;
        if (!type)
            continue;
        if (IGNORE_TYPES.has(type)) {
            continue;
        }
        if (type === "text") {
            if (part.text?.trim())
                return true;
            continue;
        }
        if (TOOL_TYPES.has(type))
            return true;
        return true;
    }
    // Messages with only thinking/meta parts are treated as empty
    // to align with file-based logic (messageHasContent)
    return false;
}
function getSdkMessages(response) {
    if (typeof response !== "object" || response === null)
        return [];
    if (Array.isArray(response))
        return response;
    const record = response;
    const data = record["data"];
    if (Array.isArray(data))
        return data;
    return Array.isArray(record) ? record : [];
}
async function findEmptyMessagesFromSDK(client, sessionID) {
    try {
        const response = await client.session.messages({ path: { id: sessionID } });
        const messages = getSdkMessages(response);
        const emptyIds = [];
        for (const message of messages) {
            const messageID = message.info?.id;
            if (!messageID)
                continue;
            if (!messageHasContentFromSDK(message)) {
                emptyIds.push(messageID);
            }
        }
        return emptyIds;
    }
    catch {
        return [];
    }
}
async function findEmptyMessageByIndexFromSDK(client, sessionID, targetIndex) {
    try {
        const response = await client.session.messages({ path: { id: sessionID } });
        const messages = getSdkMessages(response);
        const indicesToTry = [
            targetIndex,
            targetIndex - 1,
            targetIndex + 1,
            targetIndex - 2,
            targetIndex + 2,
            targetIndex - 3,
            targetIndex - 4,
            targetIndex - 5,
        ];
        for (const index of indicesToTry) {
            if (index < 0 || index >= messages.length)
                continue;
            const targetMessage = messages[index];
            const targetMessageId = targetMessage?.info?.id;
            if (!targetMessageId)
                continue;
            if (!messageHasContentFromSDK(targetMessage)) {
                return targetMessageId;
            }
        }
        return null;
    }
    catch {
        return null;
    }
}
export async function fixEmptyMessagesWithSDK(params) {
    let fixed = false;
    const fixedMessageIds = [];
    if (params.messageIndex !== undefined) {
        const targetMessageId = await findEmptyMessageByIndexFromSDK(params.client, params.sessionID, params.messageIndex);
        if (targetMessageId) {
            const replaced = await replaceEmptyTextPartsAsync(params.client, params.sessionID, targetMessageId, params.placeholderText);
            if (replaced) {
                fixed = true;
                fixedMessageIds.push(targetMessageId);
            }
            else {
                const injected = await injectTextPartAsync(params.client, params.sessionID, targetMessageId, params.placeholderText);
                if (injected) {
                    fixed = true;
                    fixedMessageIds.push(targetMessageId);
                }
            }
        }
    }
    if (fixed) {
        return { fixed, fixedMessageIds, scannedEmptyCount: 0 };
    }
    const emptyMessageIds = await findEmptyMessagesFromSDK(params.client, params.sessionID);
    if (emptyMessageIds.length === 0) {
        return { fixed: false, fixedMessageIds: [], scannedEmptyCount: 0 };
    }
    for (const messageID of emptyMessageIds) {
        const replaced = await replaceEmptyTextPartsAsync(params.client, params.sessionID, messageID, params.placeholderText);
        if (replaced) {
            fixed = true;
            fixedMessageIds.push(messageID);
        }
        else {
            const injected = await injectTextPartAsync(params.client, params.sessionID, messageID, params.placeholderText);
            if (injected) {
                fixed = true;
                fixedMessageIds.push(messageID);
            }
        }
    }
    return { fixed, fixedMessageIds, scannedEmptyCount: emptyMessageIds.length };
}
