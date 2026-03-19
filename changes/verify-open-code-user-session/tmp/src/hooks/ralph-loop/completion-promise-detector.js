import { existsSync, readFileSync } from "node:fs";
import { log } from "../../shared/logger";
import { HOOK_NAME } from "./constants";
import { withTimeout } from "./with-timeout";
function escapeRegex(str) {
    const specialCharacters = new Set([
        "\\",
        ".",
        "*",
        "+",
        "?",
        "^",
        "$",
        "{",
        "}",
        "(",
        ")",
        "|",
        "[",
        "]",
    ]);
    let escaped = "";
    for (const character of str) {
        escaped += specialCharacters.has(character) ? `\\${character}` : character;
    }
    return escaped;
}
function buildPromisePattern(promise) {
    return new RegExp(`<promise>\\s*${escapeRegex(promise)}\\s*</promise>`, "is");
}
function isInstructionLikePromiseMention(text) {
    if (!text)
        return false;
    const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
    if (!normalized.includes("<promise"))
        return false;
    if (/\binstruction\b/.test(normalized))
        return true;
    return /(?:when|once|if)\s+.{0,80}\bcomplete\b.{0,120}\b(?:output|return|print|emit|respond)\b/.test(normalized);
}
function isCompletionText(text, pattern) {
    if (!pattern.test(text))
        return false;
    return !isInstructionLikePromiseMention(text);
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function getToolOutputTextCandidates(toolOutput) {
    if (typeof toolOutput === "string")
        return [toolOutput];
    if (!isRecord(toolOutput))
        return [];
    const candidates = [];
    if (typeof toolOutput.output === "string")
        candidates.push(toolOutput.output);
    if (typeof toolOutput.content === "string")
        candidates.push(toolOutput.content);
    if (typeof toolOutput.text === "string")
        candidates.push(toolOutput.text);
    return candidates;
}
export function detectCompletionInTranscript(transcriptPath, promise) {
    if (!transcriptPath)
        return false;
    try {
        if (!existsSync(transcriptPath))
            return false;
        const content = readFileSync(transcriptPath, "utf-8");
        const pattern = buildPromisePattern(promise);
        const lines = content.split("\n").filter((line) => line.trim());
        for (const line of lines) {
            try {
                const entry = JSON.parse(line);
                if (entry.type !== "user" && entry.type !== "tool_use") {
                    if (entry.type === "assistant") {
                        if (typeof entry.content === "string" && isCompletionText(entry.content, pattern)) {
                            return true;
                        }
                    }
                    else if (entry.type === "tool_result") {
                        const candidates = getToolOutputTextCandidates(entry.tool_output);
                        if (candidates.some((candidate) => isCompletionText(candidate, pattern))) {
                            return true;
                        }
                    }
                }
            }
            catch {
            }
        }
        return false;
    }
    catch {
        return false;
    }
}
export async function detectCompletionInSessionMessages(ctx, options) {
    try {
        const response = await withTimeout(ctx.client.session.messages({
            path: { id: options.sessionID },
            query: { directory: options.directory },
        }), options.apiTimeoutMs);
        const messagesResponse = response;
        const responseData = typeof messagesResponse === "object" && messagesResponse !== null && "data" in messagesResponse
            ? messagesResponse.data
            : undefined;
        const messageArray = Array.isArray(messagesResponse)
            ? messagesResponse
            : Array.isArray(responseData)
                ? responseData
                : [];
        const scopedMessages = typeof options.sinceMessageIndex === "number" && options.sinceMessageIndex >= 0 && options.sinceMessageIndex < messageArray.length
            ? messageArray.slice(options.sinceMessageIndex)
            : messageArray;
        const assistantMessages = scopedMessages.filter((message) => message.info?.role === "assistant");
        if (assistantMessages.length === 0)
            return false;
        const pattern = buildPromisePattern(options.promise);
        for (let index = assistantMessages.length - 1; index >= 0; index -= 1) {
            const assistant = assistantMessages[index];
            if (!assistant.parts)
                continue;
            let responseText = "";
            for (const part of assistant.parts) {
                if (part.type !== "text")
                    continue;
                responseText += `${responseText ? "\n" : ""}${part.text ?? ""}`;
            }
            if (isCompletionText(responseText, pattern)) {
                return true;
            }
        }
        return false;
    }
    catch (error) {
        setTimeout(() => {
            log(`[${HOOK_NAME}] Session messages check failed`, {
                sessionID: options.sessionID,
                error: String(error),
            });
        }, 0);
        return false;
    }
}
