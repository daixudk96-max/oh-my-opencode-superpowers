// TDD-EXEMPT: reason="Path migration to changes/"
/**
 * Boulder State Storage
 *
 * Handles reading/writing boulder.json for active plan tracking.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, } from "node:fs";
import { basename, dirname, join } from "node:path";
import { BOULDER_DIR, BOULDER_FILE, LEGACY_PROMETHEUS_PLANS_DIR } from "./constants"; // TDD-EXEMPT: path migration fix
export function getBoulderFilePath(directory) {
    return join(directory, BOULDER_DIR, BOULDER_FILE);
}
export function readBoulderState(directory) {
    const filePath = getBoulderFilePath(directory);
    if (!existsSync(filePath)) {
        return null;
    }
    try {
        const content = readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(content);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return null;
        }
        if (!Array.isArray(parsed.session_ids)) {
            parsed.session_ids = [];
        }
        return parsed;
    }
    catch {
        return null;
    }
}
export function writeBoulderState(directory, state) {
    const filePath = getBoulderFilePath(directory);
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
export function appendSessionId(directory, sessionId) {
    const state = readBoulderState(directory);
    if (!state)
        return null;
    if (!state.session_ids?.includes(sessionId)) {
        if (!Array.isArray(state.session_ids)) {
            state.session_ids = [];
        }
        state.session_ids.push(sessionId);
        if (writeBoulderState(directory, state)) {
            return state;
        }
    }
    return state;
}
export function clearBoulderState(directory) {
    const filePath = getBoulderFilePath(directory);
    try {
        if (existsSync(filePath)) {
            const { unlinkSync } = require("node:fs");
            unlinkSync(filePath);
        }
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Find Prometheus plan files for this project.
 * 1. New format: {project}/changes/{name}/tasks.md
 * 2. Legacy format: {project}/.sisyphus/plans/{name}.md
 * Deduplicates by plan name, prioritizing new format.
 */
export function findPrometheusPlans(directory) {
    const resultsMap = new Map();
    // 1. Check changes directory (new format)
    const changesDir = join(directory, "changes");
    if (existsSync(changesDir)) {
        try {
            const entries = readdirSync(changesDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const tasksPath = join(changesDir, entry.name, "tasks.md");
                    if (existsSync(tasksPath)) {
                        resultsMap.set(entry.name, tasksPath);
                    }
                }
            }
        }
        catch {
            // ignore
        }
    }
    // 2. Check legacy plan directory (legacy format)
    const plansDir = join(directory, LEGACY_PROMETHEUS_PLANS_DIR); // TDD-EXEMPT: path migration fix
    if (existsSync(plansDir)) {
        try {
            const files = readdirSync(plansDir);
            for (const f of files) {
                if (f.endsWith(".md")) {
                    const name = basename(f, ".md");
                    if (!resultsMap.has(name)) {
                        resultsMap.set(name, join(plansDir, f));
                    }
                }
            }
        }
        catch {
            // ignore
        }
    }
    const results = Array.from(resultsMap.values());
    return results.sort((a, b) => {
        // Sort by modification time, newest first
        const aStat = require("node:fs").statSync(a);
        const bStat = require("node:fs").statSync(b);
        return bStat.mtimeMs - aStat.mtimeMs;
    });
}
/**
 * Parse phase status from text (backtick or Status line)
 * Priority: backtick > Status line > default pending
 */
function parsePhaseStatus(headerLine, contentLines) {
    // 1. Check backtick syntax: `complete`, `in_progress`, `pending`
    const backtickMatch = headerLine.match(/`(complete|in_progress|pending)`/i);
    if (backtickMatch) {
        return backtickMatch[1].toLowerCase().replace(" ", "_");
    }
    // 2. Check Status line: - **Status:** complete
    for (const line of contentLines) {
        const statusMatch = line.match(/\*\*Status:\*\*\s*(complete|in_progress|pending)/i);
        if (statusMatch) {
            return statusMatch[1].toLowerCase().replace(" ", "_");
        }
    }
    // 3. Default to pending
    return "pending";
}
/**
 * Extract phase name from header line (remove backtick status)
 */
function extractPhaseName(headerLine) {
    return headerLine
        .replace(/^#{2,3}\s*/, "")
        .replace(/\s*`[^`]+`\s*$/, "")
        .trim();
}
/**
 * Parse a plan file and count checkbox progress.
 * Detects checkboxes at ALL indentation levels (including sub-task acceptance criteria).
 * Also parses phase information from Manus-style syntax.
 */
export function getPlanProgress(planPath) {
    if (!existsSync(planPath)) {
        return { total: 0, completed: 0, isComplete: true };
    }
    try {
        const content = readFileSync(planPath, "utf-8");
        const lines = content.split(/\r?\n/);
        // Match markdown checkboxes at ANY indentation level:
        // - [ ] unchecked or - [x]/- [X] checked
        // Allows any amount of leading whitespace (spaces/tabs)
        const uncheckedMatches = content.match(/^\s*[-*]\s*\[\s*\]/gm) || [];
        const checkedMatches = content.match(/^\s*[-*]\s*\[[xX]\]/gm) || [];
        const total = uncheckedMatches.length + checkedMatches.length;
        const completed = checkedMatches.length;
        // Parse phases
        const phases = [];
        const phaseHeaderRegex = /^#{2,3}\s+Phase\s+\d+:/i;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (phaseHeaderRegex.test(line)) {
                // Find phase end (next phase header, ---, or EOF)
                let endLine = lines.length;
                for (let j = i + 1; j < lines.length; j++) {
                    if (phaseHeaderRegex.test(lines[j]) || lines[j].trim() === "---") {
                        endLine = j;
                        break;
                    }
                }
                // Get content lines between header and end
                const contentLines = lines.slice(i + 1, endLine);
                phases.push({
                    name: extractPhaseName(line),
                    status: parsePhaseStatus(line, contentLines),
                    line: i + 1, // 1-indexed line number
                    endLine: endLine,
                });
            }
        }
        // Calculate isComplete: checkboxes AND phases
        const checkboxesComplete = total === 0 || completed === total;
        const phasesComplete = phases.length === 0 || phases.every((p) => p.status === "complete");
        return {
            total,
            completed,
            isComplete: checkboxesComplete && phasesComplete,
            phases: phases.length > 0 ? phases : undefined,
        };
    }
    catch {
        return { total: 0, completed: 0, isComplete: true };
    }
}
/**
 * Get the first incomplete task from a plan file.
 * Used for fine-grained retry tracking per task instead of per plan.
 *
 * Matches top-level unchecked tasks like:
 * - [ ] 1. Task Name
 * - [ ] Task Name
 *
 * @param planPath - Path to the tasks.md file
 * @returns Task name/description or null if all complete
 */
export function getFirstIncompleteTask(planPath) {
    if (!existsSync(planPath)) {
        return null;
    }
    try {
        const content = readFileSync(planPath, "utf-8");
        const lines = content.split(/\r?\n/);
        // Find first unchecked top-level task (- [ ] N. Task Name or - [ ] Task Name)
        // Only match lines that start with - [ ] (no leading whitespace = top-level)
        const taskRegex = /^[-*]\s*\[\s*\]\s*(\d+\.\s*)?(.+)$/;
        for (const line of lines) {
            const match = line.match(taskRegex);
            if (match) {
                // Return the task name (group 2), cleaned up
                const taskName = match[2]
                    .trim()
                    .replace(/\*\*/g, "") // Remove bold markdown
                    .replace(/`/g, "") // Remove code ticks
                    .slice(0, 80); // Limit length for key storage
                return taskName || null;
            }
        }
        return null; // All tasks complete
    }
    catch {
        return null;
    }
}
/**
 * Extract plan name from file path.
 */
export function getPlanName(planPath) {
    // For changes/*/tasks.md format, return the parent directory name
    // For legacy plan format, return the file name without .md
    const fileName = basename(planPath, ".md");
    if (fileName === "tasks") {
        // New format: changes/{name}/tasks.md - return parent directory name
        return basename(dirname(planPath));
    }
    // Legacy format
    return fileName;
}
/**
 * Create a new boulder state for a plan.
 */
export function createBoulderState(planPath, sessionId, agent, worktreePath) {
    return {
        active_plan: planPath,
        started_at: new Date().toISOString(),
        session_ids: [sessionId],
        plan_name: getPlanName(planPath),
        phase: "idle",
        last_updated: new Date().toISOString(),
        ...(agent !== undefined ? { agent } : {}),
        ...(worktreePath !== undefined ? { worktree_path: worktreePath } : {}),
    };
}
/**
 * Update phase status in boulder state (Task 9.1)
 */
export function updatePhaseStatus(directory, phase, currentTask) {
    const state = readBoulderState(directory);
    if (!state)
        return null;
    state.phase = phase;
    state.last_updated = new Date().toISOString();
    if (currentTask !== undefined) {
        state.current_task = currentTask;
    }
    // Reset failure count when moving to a new phase
    if (phase === "executing" || phase === "planning") {
        state.failure_count = 0;
        state.last_error = undefined;
    }
    if (writeBoulderState(directory, state)) {
        return state;
    }
    return null;
}
/**
 * Increment failure count for current task (Task 9.2)
 */
export function incrementFailureCount(directory, errorMessage) {
    const state = readBoulderState(directory);
    if (!state)
        return { state: null, count: 0 };
    state.failure_count = (state.failure_count || 0) + 1;
    state.last_error = errorMessage;
    state.last_updated = new Date().toISOString();
    if (writeBoulderState(directory, state)) {
        return { state, count: state.failure_count };
    }
    return { state: null, count: 0 };
}
/**
 * Reset failure count (e.g., after successful task or user intervention)
 */
export function resetFailureCount(directory) {
    const state = readBoulderState(directory);
    if (!state)
        return null;
    state.failure_count = 0;
    state.last_error = undefined;
    state.last_updated = new Date().toISOString();
    if (writeBoulderState(directory, state)) {
        return state;
    }
    return null;
}
/**
 * Get current phase status
 */
export function getCurrentPhase(directory) {
    const state = readBoulderState(directory);
    return state?.phase || "idle";
}
/**
 * Check if currently in a phase that allows planning agents
 */
export function canCallPlanningAgents(directory) {
    const phase = getCurrentPhase(directory);
    return phase === "idle" || phase === "planning" || phase === "reviewing";
}
/**
 * Check if currently in executing phase
 */
export function isExecutingPhase(directory) {
    const phase = getCurrentPhase(directory);
    return phase === "executing";
}
/**
 * Mark boulder as complete - clears active_plan and sets phase to completed.
 * This prevents Phase 3 from triggering repeatedly.
 */
export function markBoulderComplete(directory) {
    const state = readBoulderState(directory);
    if (!state)
        return null;
    // Store the completed plan info before clearing
    const completedState = {
        ...state,
        active_plan: "", // Clear active plan to stop continuation triggers
        phase: "completed",
        last_updated: new Date().toISOString(),
        completed_at: new Date().toISOString(),
    };
    if (writeBoulderState(directory, completedState)) {
        return completedState;
    }
    return null;
}
