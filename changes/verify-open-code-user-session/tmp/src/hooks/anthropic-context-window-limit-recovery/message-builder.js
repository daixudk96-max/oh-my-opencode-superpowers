import { log } from "../../shared/logger";
import { normalizeSDKResponse } from "../../shared";
import { isSqliteBackend } from "../../shared/opencode-storage-detection";
import { findEmptyMessages, injectTextPart, replaceEmptyTextParts, } from "../session-recovery/storage";
import { replaceEmptyTextPartsAsync } from "../session-recovery/storage/empty-text";
import { injectTextPartAsync } from "../session-recovery/storage/text-part-injector";
export const PLACEHOLDER_TEXT = "[user interrupted]";
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
async function findEmptyMessageIdsFromSDK(client, sessionID) {
    try {
        const response = (await client.session.messages({
            path: { id: sessionID },
        }));
        const messages = normalizeSDKResponse(response, [], { preferResponseOnMissingData: true });
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
export async function sanitizeEmptyMessagesBeforeSummarize(sessionID, client) {
    if (client && isSqliteBackend()) {
        const emptyMessageIds = await findEmptyMessageIdsFromSDK(client, sessionID);
        if (emptyMessageIds.length === 0) {
            return 0;
        }
        let fixedCount = 0;
        for (const messageID of emptyMessageIds) {
            const replaced = await replaceEmptyTextPartsAsync(client, sessionID, messageID, PLACEHOLDER_TEXT);
            if (replaced) {
                fixedCount++;
            }
            else {
                const injected = await injectTextPartAsync(client, sessionID, messageID, PLACEHOLDER_TEXT);
                if (injected) {
                    fixedCount++;
                }
            }
        }
        if (fixedCount > 0) {
            log("[auto-compact] pre-summarize sanitization fixed empty messages", {
                sessionID,
                fixedCount,
                totalEmpty: emptyMessageIds.length,
            });
        }
        return fixedCount;
    }
    const emptyMessageIds = findEmptyMessages(sessionID);
    if (emptyMessageIds.length === 0) {
        return 0;
    }
    let fixedCount = 0;
    for (const messageID of emptyMessageIds) {
        const replaced = replaceEmptyTextParts(messageID, PLACEHOLDER_TEXT);
        if (replaced) {
            fixedCount++;
        }
        else {
            const injected = injectTextPart(sessionID, messageID, PLACEHOLDER_TEXT);
            if (injected) {
                fixedCount++;
            }
        }
    }
    if (fixedCount > 0) {
        log("[auto-compact] pre-summarize sanitization fixed empty messages", {
            sessionID,
            fixedCount,
            totalEmpty: emptyMessageIds.length,
        });
    }
    return fixedCount;
}
export function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
export async function getLastAssistant(sessionID, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
client, directory) {
    try {
        const resp = await client.session.messages({
            path: { id: sessionID },
            query: { directory },
        });
        const data = resp.data;
        if (!Array.isArray(data))
            return null;
        const reversed = [...data].reverse();
        const last = reversed.find((m) => {
            const msg = m;
            const info = msg.info;
            return info?.role === "assistant";
        });
        if (!last)
            return null;
        return last.info ?? null;
    }
    catch {
        return null;
    }
}
