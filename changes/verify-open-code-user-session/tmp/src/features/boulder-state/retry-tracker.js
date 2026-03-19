/**
 * Retry Tracker
 *
 * Tracks retry counts for blocked tasks to prevent infinite continuation loops.
 * Uses in-memory storage with optional file persistence.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { BOULDER_DIR } from "./constants";
const RETRY_STATE_FILE = "retry-state.json";
const DEFAULT_MAX_RETRIES = 3;
/**
 * Get the retry state file path
 */
function getRetryStatePath(directory) {
    return join(directory, BOULDER_DIR, RETRY_STATE_FILE);
}
/**
 * Read retry state from file
 */
function readRetryState(directory) {
    const filePath = getRetryStatePath(directory);
    if (!existsSync(filePath)) {
        return {};
    }
    try {
        const content = readFileSync(filePath, "utf-8");
        return JSON.parse(content);
    }
    catch {
        return {};
    }
}
/**
 * Write retry state to file
 */
function writeRetryState(directory, state) {
    const filePath = getRetryStatePath(directory);
    try {
        const dir = dirname(filePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Increment retry count for a task
 * @returns The new retry count
 */
export function incrementRetry(directory, taskId, reason) {
    const state = readRetryState(directory);
    const current = state[taskId] || { count: 0, lastAttempt: "" };
    current.count++;
    current.lastAttempt = new Date().toISOString();
    if (reason) {
        current.reason = reason;
    }
    state[taskId] = current;
    writeRetryState(directory, state);
    return current.count;
}
/**
 * Check if a task has reached max retries
 */
export function isMaxRetries(directory, taskId, max = DEFAULT_MAX_RETRIES) {
    const state = readRetryState(directory);
    const current = state[taskId];
    if (!current)
        return false;
    return current.count >= max;
}
/**
 * Get the current retry count for a task
 */
export function getRetryCount(directory, taskId) {
    const state = readRetryState(directory);
    return state[taskId]?.count ?? 0;
}
/**
 * Reset retry count for a task
 */
export function resetRetry(directory, taskId) {
    const state = readRetryState(directory);
    delete state[taskId];
    writeRetryState(directory, state);
}
/**
 * Reset all retry counts
 */
export function resetAllRetries(directory) {
    writeRetryState(directory, {});
}
/**
 * Get all blocked tasks (tasks that have reached max retries)
 */
export function getBlockedTasks(directory, max = DEFAULT_MAX_RETRIES) {
    const state = readRetryState(directory);
    return Object.entries(state)
        .filter(([_, data]) => data.count >= max)
        .map(([taskId]) => taskId);
}
/**
 * Get retry info for a specific task
 */
export function getRetryInfo(directory, taskId) {
    const state = readRetryState(directory);
    return state[taskId] ?? null;
}
