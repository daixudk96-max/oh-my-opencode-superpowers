import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getOpenCodeStorageDir } from "../../shared/data-path";
import { truncateToolResult } from "./storage";
import { truncateToolResultAsync } from "./tool-result-storage-sdk";
import { log } from "../../shared/logger";
import { getMessageDir } from "../../shared/opencode-message-dir";
import { isSqliteBackend } from "../../shared/opencode-storage-detection";
import { normalizeSDKResponse } from "../../shared";
function getPartStorage() {
    return join(getOpenCodeStorageDir(), "part");
}
function getMessageIds(sessionID) {
    const messageDir = getMessageDir(sessionID);
    if (!messageDir)
        return [];
    const messageIds = [];
    for (const file of readdirSync(messageDir)) {
        if (!file.endsWith(".json"))
            continue;
        messageIds.push(file.replace(".json", ""));
    }
    return messageIds;
}
export async function truncateToolOutputsByCallId(sessionID, callIds, client) {
    if (callIds.size === 0)
        return { truncatedCount: 0 };
    if (client && isSqliteBackend()) {
        return truncateToolOutputsByCallIdFromSDK(client, sessionID, callIds);
    }
    const messageIds = getMessageIds(sessionID);
    if (messageIds.length === 0)
        return { truncatedCount: 0 };
    let truncatedCount = 0;
    for (const messageID of messageIds) {
        const partDir = join(getPartStorage(), messageID);
        if (!existsSync(partDir))
            continue;
        for (const file of readdirSync(partDir)) {
            if (!file.endsWith(".json"))
                continue;
            const partPath = join(partDir, file);
            try {
                const content = readFileSync(partPath, "utf-8");
                const part = JSON.parse(content);
                if (part.type !== "tool" || !part.callID)
                    continue;
                if (!callIds.has(part.callID))
                    continue;
                if (!part.state?.output || part.truncated)
                    continue;
                const result = truncateToolResult(partPath);
                if (result.success) {
                    truncatedCount++;
                }
            }
            catch {
                continue;
            }
        }
    }
    if (truncatedCount > 0) {
        log("[auto-compact] pruned duplicate tool outputs", {
            sessionID,
            truncatedCount,
        });
    }
    return { truncatedCount };
}
async function truncateToolOutputsByCallIdFromSDK(client, sessionID, callIds) {
    try {
        const response = await client.session.messages({ path: { id: sessionID } });
        const messages = normalizeSDKResponse(response, [], { preferResponseOnMissingData: true });
        let truncatedCount = 0;
        for (const msg of messages) {
            const messageID = msg.info?.id;
            if (!messageID || !msg.parts)
                continue;
            for (const part of msg.parts) {
                if (part.type !== "tool" || !part.callID)
                    continue;
                if (!callIds.has(part.callID))
                    continue;
                if (!part.state?.output || part.state?.time?.compacted)
                    continue;
                const result = await truncateToolResultAsync(client, sessionID, messageID, part.id, part);
                if (result.success) {
                    truncatedCount++;
                }
            }
        }
        if (truncatedCount > 0) {
            log("[auto-compact] pruned duplicate tool outputs (SDK)", {
                sessionID,
                truncatedCount,
            });
        }
        return { truncatedCount };
    }
    catch {
        return { truncatedCount: 0 };
    }
}
