import { findToolResultsBySize, truncateToolResult } from "./tool-result-storage";
import { truncateToolResultAsync } from "./tool-result-storage-sdk";
import { isSqliteBackend } from "../../shared/opencode-storage-detection";
import { normalizeSDKResponse } from "../../shared";
function calculateTargetBytesToRemove(currentTokens, maxTokens, targetRatio, charsPerToken) {
    const targetTokens = Math.floor(maxTokens * targetRatio);
    const tokensToReduce = currentTokens - targetTokens;
    const targetBytesToRemove = tokensToReduce * charsPerToken;
    return { tokensToReduce, targetBytesToRemove };
}
export async function truncateUntilTargetTokens(sessionID, currentTokens, maxTokens, targetRatio = 0.8, charsPerToken = 4, client) {
    const { tokensToReduce, targetBytesToRemove } = calculateTargetBytesToRemove(currentTokens, maxTokens, targetRatio, charsPerToken);
    if (tokensToReduce <= 0) {
        return {
            success: true,
            sufficient: true,
            truncatedCount: 0,
            totalBytesRemoved: 0,
            targetBytesToRemove: 0,
            truncatedTools: [],
        };
    }
    if (client && isSqliteBackend()) {
        let toolPartsByKey = new Map();
        try {
            const response = (await client.session.messages({
                path: { id: sessionID },
            }));
            const messages = normalizeSDKResponse(response, [], { preferResponseOnMissingData: true });
            toolPartsByKey = new Map();
            for (const message of messages) {
                const messageID = message.info?.id;
                if (!messageID || !message.parts)
                    continue;
                for (const part of message.parts) {
                    if (part.type !== "tool")
                        continue;
                    toolPartsByKey.set(`${messageID}:${part.id}`, part);
                }
            }
        }
        catch {
            toolPartsByKey = new Map();
        }
        const results = [];
        for (const [key, part] of toolPartsByKey) {
            if (part.type === "tool" && part.state?.output && !part.state?.time?.compacted && part.tool) {
                results.push({
                    partPath: "",
                    partId: part.id,
                    messageID: key.split(":")[0],
                    toolName: part.tool,
                    outputSize: part.state.output.length,
                });
            }
        }
        results.sort((a, b) => b.outputSize - a.outputSize);
        if (results.length === 0) {
            return {
                success: false,
                sufficient: false,
                truncatedCount: 0,
                totalBytesRemoved: 0,
                targetBytesToRemove,
                truncatedTools: [],
            };
        }
        let totalRemoved = 0;
        let truncatedCount = 0;
        const truncatedTools = [];
        for (const result of results) {
            const part = toolPartsByKey.get(`${result.messageID}:${result.partId}`);
            if (!part)
                continue;
            const truncateResult = await truncateToolResultAsync(client, sessionID, result.messageID, result.partId, part);
            if (truncateResult.success) {
                truncatedCount++;
                const removedSize = truncateResult.originalSize ?? result.outputSize;
                totalRemoved += removedSize;
                truncatedTools.push({
                    toolName: truncateResult.toolName ?? result.toolName,
                    originalSize: removedSize,
                });
                if (totalRemoved >= targetBytesToRemove) {
                    break;
                }
            }
        }
        const sufficient = totalRemoved >= targetBytesToRemove;
        return {
            success: truncatedCount > 0,
            sufficient,
            truncatedCount,
            totalBytesRemoved: totalRemoved,
            targetBytesToRemove,
            truncatedTools,
        };
    }
    const results = findToolResultsBySize(sessionID);
    if (results.length === 0) {
        return {
            success: false,
            sufficient: false,
            truncatedCount: 0,
            totalBytesRemoved: 0,
            targetBytesToRemove,
            truncatedTools: [],
        };
    }
    let totalRemoved = 0;
    let truncatedCount = 0;
    const truncatedTools = [];
    for (const result of results) {
        const truncateResult = truncateToolResult(result.partPath);
        if (truncateResult.success) {
            truncatedCount++;
            const removedSize = truncateResult.originalSize ?? result.outputSize;
            totalRemoved += removedSize;
            truncatedTools.push({
                toolName: truncateResult.toolName ?? result.toolName,
                originalSize: removedSize,
            });
            if (totalRemoved >= targetBytesToRemove) {
                break;
            }
        }
    }
    const sufficient = totalRemoved >= targetBytesToRemove;
    return {
        success: truncatedCount > 0,
        sufficient,
        truncatedCount,
        totalBytesRemoved: totalRemoved,
        targetBytesToRemove,
        truncatedTools,
    };
}
