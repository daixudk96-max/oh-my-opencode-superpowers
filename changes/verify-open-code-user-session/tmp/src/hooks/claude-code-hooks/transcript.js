import { join } from "path";
import { mkdirSync, appendFileSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { transformToolName } from "../../shared/tool-name";
import { getClaudeConfigDir } from "../../shared";
const TRANSCRIPT_DIR = join(getClaudeConfigDir(), "transcripts");
export function getTranscriptPath(sessionId) {
    return join(TRANSCRIPT_DIR, `${sessionId}.jsonl`);
}
function ensureTranscriptDir() {
    if (!existsSync(TRANSCRIPT_DIR)) {
        mkdirSync(TRANSCRIPT_DIR, { recursive: true });
    }
}
export function appendTranscriptEntry(sessionId, entry) {
    ensureTranscriptDir();
    const path = getTranscriptPath(sessionId);
    const line = JSON.stringify(entry) + "\n";
    appendFileSync(path, line);
}
const TRANSCRIPT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const transcriptCache = new Map();
/**
 * Clear transcript cache for a specific session or all sessions.
 * Call on session.deleted to prevent memory accumulation.
 */
export function clearTranscriptCache(sessionId) {
    if (sessionId) {
        const entry = transcriptCache.get(sessionId);
        if (entry?.tempPath) {
            try {
                unlinkSync(entry.tempPath);
            }
            catch { /* ignore */ }
        }
        transcriptCache.delete(sessionId);
    }
    else {
        for (const [, entry] of transcriptCache) {
            if (entry.tempPath) {
                try {
                    unlinkSync(entry.tempPath);
                }
                catch { /* ignore */ }
            }
        }
        transcriptCache.clear();
    }
}
function isCacheValid(entry) {
    return Date.now() - entry.createdAt < TRANSCRIPT_CACHE_TTL_MS;
}
function buildCurrentEntry(toolName, toolInput) {
    const entry = {
        type: "assistant",
        message: {
            role: "assistant",
            content: [
                {
                    type: "tool_use",
                    name: transformToolName(toolName),
                    input: toolInput,
                },
            ],
        },
    };
    return JSON.stringify(entry);
}
function parseMessagesToEntries(messages) {
    const entries = [];
    for (const msg of messages) {
        if (msg.info?.role !== "assistant")
            continue;
        for (const part of msg.parts || []) {
            if (part.type !== "tool")
                continue;
            if (part.state?.status !== "completed")
                continue;
            if (!part.state?.input)
                continue;
            const rawToolName = part.tool;
            const toolName = transformToolName(rawToolName);
            const entry = {
                type: "assistant",
                message: {
                    role: "assistant",
                    content: [{ type: "tool_use", name: toolName, input: part.state.input }],
                },
            };
            entries.push(JSON.stringify(entry));
        }
    }
    return entries;
}
/**
 * Build Claude Code compatible transcript from session messages.
 * Uses per-session cache to avoid redundant session.messages() API calls.
 * First call fetches and caches; subsequent calls reuse cached base entries.
 */
export async function buildTranscriptFromSession(client, sessionId, directory, currentToolName, currentToolInput) {
    try {
        let baseEntries;
        const cached = transcriptCache.get(sessionId);
        if (cached && isCacheValid(cached)) {
            baseEntries = cached.baseEntries;
        }
        else {
            // Fetch full session messages (only on first call or cache expiry)
            const response = await client.session.messages({
                path: { id: sessionId },
                query: { directory },
            });
            const messages = response["200"]
                ?? response.data
                ?? (Array.isArray(response) ? response : []);
            baseEntries = Array.isArray(messages)
                ? parseMessagesToEntries(messages)
                : [];
            // Clean up old temp file if exists
            if (cached?.tempPath) {
                try {
                    unlinkSync(cached.tempPath);
                }
                catch { /* ignore */ }
            }
            transcriptCache.set(sessionId, {
                baseEntries,
                tempPath: null,
                createdAt: Date.now(),
            });
        }
        // Append current tool call
        const allEntries = [...baseEntries, buildCurrentEntry(currentToolName, currentToolInput)];
        const tempPath = join(tmpdir(), `opencode-transcript-${sessionId}-${randomUUID()}.jsonl`);
        writeFileSync(tempPath, allEntries.join("\n") + "\n");
        // Update cache temp path for cleanup tracking
        const cacheEntry = transcriptCache.get(sessionId);
        if (cacheEntry) {
            cacheEntry.tempPath = tempPath;
        }
        return tempPath;
    }
    catch {
        try {
            const tempPath = join(tmpdir(), `opencode-transcript-${sessionId}-${randomUUID()}.jsonl`);
            writeFileSync(tempPath, buildCurrentEntry(currentToolName, currentToolInput) + "\n");
            return tempPath;
        }
        catch {
            return null;
        }
    }
}
/**
 * Delete temp transcript file (call in finally block)
 */
export function deleteTempTranscript(path) {
    if (!path)
        return;
    try {
        unlinkSync(path);
    }
    catch {
        // Ignore deletion errors
    }
}
