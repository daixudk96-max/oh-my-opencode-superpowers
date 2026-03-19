import { existsSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { getMainSessionID, subagentSessions } from "../../features/claude-code-session-state";
import { log } from "../../shared";
import { BASH_FILE_CREATION_PATTERNS, ERROR_MESSAGE, INTERCEPTED_TOOLS, PLANNING_FILE_PATTERNS } from "./constants";
export * from "./constants";
const PLANNING_FILE_REGEXES = PLANNING_FILE_PATTERNS.map(toPatternRegex);
function toPatternRegex(pattern) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    const withWildcard = escaped.replace(/\*/g, "[^/]+");
    return new RegExp(`^${withWildcard}$`, "i");
}
function normalizeRelativePath(filePath, workspaceRoot) {
    const resolved = resolve(workspaceRoot, filePath);
    const rel = relative(workspaceRoot, resolved);
    if (rel.startsWith("..") || isAbsolute(rel)) {
        return null;
    }
    return rel.replace(/\\/g, "/");
}
function matchesPlanningFilePattern(filePath, workspaceRoot) {
    const rel = normalizeRelativePath(filePath, workspaceRoot);
    if (!rel) {
        return false;
    }
    return PLANNING_FILE_REGEXES.some(regex => regex.test(rel));
}
function extractFilePathsFromBashCommand(command) {
    const paths = [];
    for (const pattern of BASH_FILE_CREATION_PATTERNS) {
        const match = command.match(pattern);
        const pathMatch = match?.[1];
        if (pathMatch) {
            paths.push(pathMatch);
        }
    }
    return paths;
}
function getFilePaths(args, toolName) {
    if (!args) {
        return [];
    }
    const paths = [];
    // Handle Bash tool - extract file paths from command
    if (toolName.toLowerCase() === "bash") {
        const command = args.command;
        if (command) {
            paths.push(...extractFilePathsFromBashCommand(command));
        }
        return paths;
    }
    // Handle Write/Edit tools
    const directPath = args.filePath ?? args.file_path ?? args.path ?? args.file;
    if (typeof directPath === "string") {
        paths.push(directPath);
    }
    const edits = args.edits;
    if (Array.isArray(edits)) {
        for (const edit of edits) {
            const editPath = edit.filePath ?? edit.file_path ?? edit.path;
            if (typeof editPath === "string") {
                paths.push(editPath);
            }
        }
    }
    return paths;
}
// TDD-EXEMPT: reason="DEBUGGING: adding extreme logs to tasks-md-creation-guard"
export function createTasksMdCreationGuardHook(ctx) {
    const skillUsedSessions = new Set();
    function hasSkillAuthorization(sessionID) {
        if (!sessionID)
            return false;
        const authorized = skillUsedSessions.has(sessionID);
        log("[tasks-md-creation-guard] hasSkillAuthorization", {
            sessionID,
            authorized,
            skillUsedSessions: Array.from(skillUsedSessions),
        });
        if (authorized)
            return true;
        const mainSessionID = getMainSessionID();
        if (!mainSessionID)
            return false;
        const isMainSession = sessionID === mainSessionID;
        const isSubagentSession = subagentSessions.has(sessionID);
        const mainAuthorized = skillUsedSessions.has(mainSessionID);
        log("[tasks-md-creation-guard] checking main session", {
            mainSessionID,
            isMainSession,
            isSubagentSession,
            mainAuthorized,
        });
        if (mainAuthorized)
            return true;
        for (const subagentSession of subagentSessions) {
            if (skillUsedSessions.has(subagentSession)) {
                log("[tasks-md-creation-guard] subagent authorized", { subagentSession });
                return true;
            }
        }
        return false;
    }
    return {
        "tool.execute.before": async (input, output) => {
            const toolName = input.tool;
            const toolLower = toolName.toLowerCase();
            log("[tasks-md-creation-guard] before hook ENTRY", { toolName, sessionID: input.sessionID });
            // TDD-EXEMPT: reason="Pre-authorize session if it's invoking creating-changes skill"
            if (toolLower === "skill" || toolLower === "slashcommand") {
                const skillName = (output.args?.name ?? output.args?.skillName ?? "");
                log("[tasks-md-creation-guard] skill tool detected", { skillName });
                if (skillName.toLowerCase().includes("creating-changes")) {
                    if (input.sessionID) {
                        skillUsedSessions.add(input.sessionID);
                        log("[tasks-md-creation-guard] Authorized session via skill before hook", { sessionID: input.sessionID });
                    }
                }
            }
            const isIntercepted = INTERCEPTED_TOOLS.some(tool => tool.toLowerCase() === toolName.toLowerCase());
            log("[tasks-md-creation-guard] interception check", { isIntercepted });
            if (!isIntercepted) {
                return;
            }
            const filePaths = getFilePaths(output.args, toolName);
            log("[tasks-md-creation-guard] extracted filePaths", { filePaths });
            if (filePaths.length === 0) {
                return;
            }
            const matchingPaths = filePaths.filter(path => {
                const matches = matchesPlanningFilePattern(path, ctx.directory);
                log("[tasks-md-creation-guard] path pattern check", { path, directory: ctx.directory, matches });
                return matches;
            });
            log("[tasks-md-creation-guard] matchingPaths", { matchingPaths });
            if (matchingPaths.length === 0) {
                return;
            }
            const authorized = hasSkillAuthorization(input.sessionID);
            log("[tasks-md-creation-guard] authorization final check", { authorized });
            if (authorized) {
                return;
            }
            for (const filePath of matchingPaths) {
                const resolved = resolve(ctx.directory, filePath);
                const exists = existsSync(resolved);
                log("[tasks-md-creation-guard] final block check", { filePath, resolved, exists });
                if (!exists) {
                    output.blocked = true;
                    output.message = ERROR_MESSAGE;
                    log("[tasks-md-creation-guard] !!! BLOCKED !!!");
                    return;
                }
            }
        },
        "tool.execute.after": async (input, output) => {
            const toolLower = input.tool.toLowerCase();
            // Recognize both "skill" and "slashcommand" tools
            if (toolLower !== "skill" && toolLower !== "slashcommand") {
                return;
            }
            // Check both output metadata (for tools that provide it) and input args (for skill name)
            const outputSkillName = (output.metadata?.name ?? output.metadata?.skillName ?? "");
            const inputSkillName = (input.args?.name ?? input.args?.skillName ?? "");
            const skillName = outputSkillName || inputSkillName;
            if (!skillName.toLowerCase().includes("creating-changes")) {
                return;
            }
            if (input.sessionID) {
                skillUsedSessions.add(input.sessionID);
            }
        },
    };
}
