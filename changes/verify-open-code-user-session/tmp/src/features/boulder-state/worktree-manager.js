/**
 * Wave Worktree Manager (Task 10.3)
 *
 * Automates git worktree creation, tracking, and cleanup for Wave parallel execution.
 * Integrates with boulder-state for persistent tracking across sessions.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { readBoulderState, writeBoulderState } from "./storage";
import { buildWaveBranchName } from "../../shared/wave-grouper";
const DEFAULT_WORKTREE_DIR = ".worktrees";
const GITIGNORE_ENTRY = ".worktrees/";
/**
 * Initialize wave execution state in boulder state
 */
export function initializeWaveExecution(directory, featureName, waves, mode = "parallel") {
    const state = readBoulderState(directory);
    if (!state)
        return null;
    const worktreeBaseDir = findOrCreateWorktreeDir(directory);
    if (!worktreeBaseDir)
        return null;
    const waveWorktrees = waves.map((wave) => ({
        waveId: wave.id,
        branch: wave.worktreeBranch || buildWaveBranchName(featureName, wave.id),
        path: join(worktreeBaseDir, `${featureName}-wave${wave.id}`),
        status: "pending",
        taskIds: wave.tasks.map((t) => t.id),
        createdAt: new Date().toISOString(),
    }));
    const waveExecution = {
        featureName,
        mode,
        worktreeBaseDir,
        waves: waveWorktrees,
        startedAt: new Date().toISOString(),
    };
    state.wave_execution = waveExecution;
    state.last_updated = new Date().toISOString();
    if (writeBoulderState(directory, state)) {
        return waveExecution;
    }
    return null;
}
/**
 * Find existing worktree directory or create one
 */
export function findOrCreateWorktreeDir(directory) {
    // Check priority: .worktrees > worktrees
    const hiddenDir = join(directory, ".worktrees");
    const visibleDir = join(directory, "worktrees");
    if (existsSync(hiddenDir)) {
        return hiddenDir;
    }
    if (existsSync(visibleDir)) {
        return visibleDir;
    }
    // Create .worktrees (preferred)
    try {
        mkdirSync(hiddenDir, { recursive: true });
        ensureGitignored(directory, GITIGNORE_ENTRY);
        return hiddenDir;
    }
    catch {
        return null;
    }
}
/**
 * Ensure the worktree directory is in .gitignore
 */
export function ensureGitignored(directory, entry) {
    const gitignorePath = join(directory, ".gitignore");
    try {
        let content = "";
        if (existsSync(gitignorePath)) {
            content = readFileSync(gitignorePath, "utf-8");
        }
        // Check if already ignored
        const lines = content.split("\n").map((l) => l.trim());
        if (lines.includes(entry) || lines.includes(entry.replace(/\/$/, ""))) {
            return true;
        }
        // Add to gitignore
        const newContent = content.endsWith("\n") ? `${content}${entry}\n` : `${content}\n${entry}\n`;
        writeFileSync(gitignorePath, newContent, "utf-8");
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Create a git worktree for a specific wave
 */
export function createWaveWorktree(directory, waveId) {
    const state = readBoulderState(directory);
    if (!state?.wave_execution) {
        return { success: false, error: "No wave execution state found" };
    }
    const wave = state.wave_execution.waves.find((w) => w.waveId === waveId);
    if (!wave) {
        return { success: false, error: `Wave ${waveId} not found` };
    }
    if (wave.status !== "pending") {
        return { success: false, error: `Wave ${waveId} is not in pending state (current: ${wave.status})` };
    }
    try {
        // Ensure parent directory exists
        // worktreeBaseDir is already an absolute path
        const parentDir = state.wave_execution.worktreeBaseDir;
        if (!existsSync(parentDir)) {
            mkdirSync(parentDir, { recursive: true });
        }
        // Create worktree with new branch - wave.path is already the full path
        const worktreePath = wave.path;
        execSync(`git worktree add "${worktreePath}" -b "${wave.branch}"`, {
            cwd: directory,
            stdio: "pipe",
        });
        // Update state
        wave.status = "ready";
        wave.path = worktreePath;
        wave.updatedAt = new Date().toISOString();
        state.last_updated = new Date().toISOString();
        writeBoulderState(directory, state);
        return { success: true, path: worktreePath };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Update state with error
        wave.status = "failed";
        wave.error = errorMessage;
        wave.updatedAt = new Date().toISOString();
        state.last_updated = new Date().toISOString();
        writeBoulderState(directory, state);
        return { success: false, error: errorMessage };
    }
}
/**
 * Create all wave worktrees in parallel mode
 */
export function createAllWaveWorktrees(directory) {
    const state = readBoulderState(directory);
    if (!state?.wave_execution) {
        return { success: false, results: [] };
    }
    const results = [];
    for (const wave of state.wave_execution.waves) {
        if (wave.status === "pending") {
            const result = createWaveWorktree(directory, wave.waveId);
            results.push({ waveId: wave.waveId, ...result });
        }
        else {
            results.push({ waveId: wave.waveId, success: true, path: wave.path });
        }
    }
    const allSuccess = results.every((r) => r.success);
    return { success: allSuccess, results };
}
/**
 * Update wave worktree status
 */
export function updateWaveStatus(directory, waveId, status, completedShas, error) {
    const state = readBoulderState(directory);
    if (!state?.wave_execution)
        return false;
    const wave = state.wave_execution.waves.find((w) => w.waveId === waveId);
    if (!wave)
        return false;
    wave.status = status;
    wave.updatedAt = new Date().toISOString();
    if (completedShas) {
        wave.completedShas = { ...(wave.completedShas || {}), ...completedShas };
    }
    if (error) {
        wave.error = error;
    }
    state.last_updated = new Date().toISOString();
    return writeBoulderState(directory, state);
}
/**
 * Record completed task SHA for a wave
 */
export function recordTaskCompletion(directory, waveId, taskId, commitSha) {
    const state = readBoulderState(directory);
    if (!state?.wave_execution)
        return false;
    const wave = state.wave_execution.waves.find((w) => w.waveId === waveId);
    if (!wave)
        return false;
    wave.completedShas = wave.completedShas || {};
    wave.completedShas[taskId] = commitSha;
    wave.updatedAt = new Date().toISOString();
    state.last_updated = new Date().toISOString();
    return writeBoulderState(directory, state);
}
/**
 * Clean up a single wave worktree
 */
export function cleanupWaveWorktree(directory, waveId) {
    const state = readBoulderState(directory);
    if (!state?.wave_execution) {
        return { success: false, error: "No wave execution state found" };
    }
    const wave = state.wave_execution.waves.find((w) => w.waveId === waveId);
    if (!wave) {
        return { success: false, error: `Wave ${waveId} not found` };
    }
    if (wave.status === "cleaned") {
        return { success: true };
    }
    try {
        // Remove the worktree
        execSync(`git worktree remove "${wave.path}" --force`, {
            cwd: directory,
            stdio: "pipe",
        });
        // Delete the branch if it exists
        try {
            execSync(`git branch -D "${wave.branch}"`, {
                cwd: directory,
                stdio: "pipe",
            });
        }
        catch {
            // Branch may already be deleted or merged
        }
        // Update state
        wave.status = "cleaned";
        wave.updatedAt = new Date().toISOString();
        state.last_updated = new Date().toISOString();
        writeBoulderState(directory, state);
        return { success: true };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
    }
}
/**
 * Clean up all wave worktrees
 */
export function cleanupAllWaveWorktrees(directory) {
    const state = readBoulderState(directory);
    if (!state?.wave_execution) {
        return { success: false, results: [] };
    }
    const results = [];
    for (const wave of state.wave_execution.waves) {
        if (wave.status !== "cleaned" && wave.status !== "pending") {
            const result = cleanupWaveWorktree(directory, wave.waveId);
            results.push({ waveId: wave.waveId, ...result });
        }
        else {
            results.push({ waveId: wave.waveId, success: true });
        }
    }
    const allSuccess = results.every((r) => r.success);
    // Clear wave execution state if all cleaned
    if (allSuccess) {
        state.wave_execution.completedAt = new Date().toISOString();
        state.last_updated = new Date().toISOString();
        writeBoulderState(directory, state);
    }
    return { success: allSuccess, results };
}
/**
 * Get current wave execution summary
 */
export function getWaveExecutionSummary(directory) {
    const state = readBoulderState(directory);
    if (!state?.wave_execution)
        return null;
    const waves = state.wave_execution.waves;
    const counts = {
        pending: 0,
        ready: 0,
        in_progress: 0,
        completed: 0,
        failed: 0,
        cleaned: 0,
    };
    for (const wave of waves) {
        counts[wave.status] = (counts[wave.status] || 0) + 1;
    }
    return {
        featureName: state.wave_execution.featureName,
        mode: state.wave_execution.mode,
        totalWaves: waves.length,
        pending: counts.pending,
        ready: counts.ready,
        inProgress: counts.in_progress,
        completed: counts.completed,
        failed: counts.failed,
        cleaned: counts.cleaned,
    };
}
/**
 * Check if wave execution is active
 */
export function hasActiveWaveExecution(directory) {
    const state = readBoulderState(directory);
    if (!state?.wave_execution)
        return false;
    // Active if not all waves are completed or cleaned
    return state.wave_execution.waves.some((w) => w.status !== "completed" && w.status !== "cleaned" && w.status !== "failed");
}
/**
 * Get worktree path for a specific wave
 */
export function getWaveWorktreePath(directory, waveId) {
    const state = readBoulderState(directory);
    if (!state?.wave_execution)
        return null;
    const wave = state.wave_execution.waves.find((w) => w.waveId === waveId);
    return wave?.path || null;
}
/**
 * List all active worktrees from git
 */
export function listGitWorktrees(directory) {
    try {
        const output = execSync("git worktree list --porcelain", {
            cwd: directory,
            encoding: "utf-8",
        });
        const worktrees = [];
        let current = {};
        for (const line of output.split("\n")) {
            if (line.startsWith("worktree ")) {
                if (current.path) {
                    worktrees.push({
                        path: current.path,
                        branch: current.branch || "",
                        commit: current.commit || "",
                    });
                }
                current = { path: line.substring(9) };
            }
            else if (line.startsWith("HEAD ")) {
                current.commit = line.substring(5);
            }
            else if (line.startsWith("branch ")) {
                current.branch = line.substring(7).replace("refs/heads/", "");
            }
        }
        if (current.path) {
            worktrees.push({
                path: current.path,
                branch: current.branch || "",
                commit: current.commit || "",
            });
        }
        return worktrees;
    }
    catch {
        return [];
    }
}
/**
 * Prune stale worktree references
 */
export function pruneWorktrees(directory) {
    try {
        execSync("git worktree prune", {
            cwd: directory,
            stdio: "pipe",
        });
        return true;
    }
    catch {
        return false;
    }
}
