import { findMessagesWithThinkingBlocks, stripThinkingParts } from "./storage";
import { isSqliteBackend } from "../../shared/opencode-storage-detection";
import { stripThinkingPartsAsync } from "./storage/thinking-strip";
import { THINKING_TYPES } from "./constants";
import { log } from "../../shared/logger";
import { normalizeSDKResponse } from "../../shared";
export async function recoverThinkingDisabledViolation(client, sessionID, _failedAssistantMsg) {
    if (isSqliteBackend()) {
        return recoverThinkingDisabledViolationFromSDK(client, sessionID);
    }
    const messagesWithThinking = findMessagesWithThinkingBlocks(sessionID);
    if (messagesWithThinking.length === 0) {
        return false;
    }
    let anySuccess = false;
    for (const messageID of messagesWithThinking) {
        if (stripThinkingParts(messageID)) {
            anySuccess = true;
        }
    }
    return anySuccess;
}
async function recoverThinkingDisabledViolationFromSDK(client, sessionID) {
    try {
        const response = await client.session.messages({ path: { id: sessionID } });
        const messages = normalizeSDKResponse(response, [], { preferResponseOnMissingData: true });
        const messageIDsWithThinking = [];
        for (const msg of messages) {
            if (msg.info?.role !== "assistant")
                continue;
            if (!msg.info?.id)
                continue;
            if (!msg.parts)
                continue;
            const hasThinking = msg.parts.some((part) => THINKING_TYPES.has(part.type));
            if (hasThinking) {
                messageIDsWithThinking.push(msg.info.id);
            }
        }
        if (messageIDsWithThinking.length === 0) {
            return false;
        }
        let anySuccess = false;
        for (const messageID of messageIDsWithThinking) {
            if (await stripThinkingPartsAsync(client, sessionID, messageID)) {
                anySuccess = true;
            }
        }
        return anySuccess;
    }
    catch (error) {
        log("[session-recovery] recoverThinkingDisabledViolationFromSDK failed", {
            sessionID,
            error: String(error),
        });
        return false;
    }
}
