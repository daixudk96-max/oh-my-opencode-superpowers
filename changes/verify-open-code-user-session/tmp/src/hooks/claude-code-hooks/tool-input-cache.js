/**
 * Caches tool_input from PreToolUse for PostToolUse
 */
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute
export function cacheToolInput(sessionId, toolName, invocationId, toolInput) {
    const key = `${sessionId}:${toolName}:${invocationId}`;
    cache.set(key, { toolInput, timestamp: Date.now() });
}
export function getToolInput(sessionId, toolName, invocationId) {
    const key = `${sessionId}:${toolName}:${invocationId}`;
    const entry = cache.get(key);
    if (!entry)
        return null;
    cache.delete(key);
    if (Date.now() - entry.timestamp > CACHE_TTL)
        return null;
    return entry.toolInput;
}
// Periodic cleanup (every minute)
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > CACHE_TTL) {
            cache.delete(key);
        }
    }
}, CACHE_TTL);
// Allow process to exit naturally even if interval is running
if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
}
