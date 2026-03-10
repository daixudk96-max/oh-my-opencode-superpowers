// TDD-EXEMPT: reason="Restoring original state after debugging"
import type { PluginInput } from "@opencode-ai/plugin"
import { existsSync } from "node:fs"
import { isAbsolute, relative, resolve } from "node:path"
import { getMainSessionID, subagentSessions } from "../../features/claude-code-session-state"
import { log } from "../../shared"
import { BASH_FILE_CREATION_PATTERNS, ERROR_MESSAGE, INTERCEPTED_TOOLS, PLANNING_FILE_PATTERNS } from "./constants"


export * from "./constants"

type ToolArgs = Record<string, unknown> | undefined

const PLANNING_FILE_REGEXES = PLANNING_FILE_PATTERNS.map(toPatternRegex)

function toPatternRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&")
  const withWildcard = escaped.replace(/\*/g, "[^/]+")
  return new RegExp(`^${withWildcard}$`, "i")
}

function normalizeRelativePath(filePath: string, workspaceRoot: string): string | null {
  const resolved = resolve(workspaceRoot, filePath)
  const rel = relative(workspaceRoot, resolved)
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return null
  }
  return rel.replace(/\\/g, "/")
}

function matchesPlanningFilePattern(filePath: string, workspaceRoot: string): boolean {
  const rel = normalizeRelativePath(filePath, workspaceRoot)
  if (!rel) {
    return false
  }
  return PLANNING_FILE_REGEXES.some(regex => regex.test(rel))
}

function extractFilePathsFromBashCommand(command: string): string[] {
  const paths: string[] = []
  for (const pattern of BASH_FILE_CREATION_PATTERNS) {
    const match = command.match(pattern)
    const pathMatch = match?.[1]
    if (pathMatch) {
      paths.push(pathMatch)
    }
  }
  return paths
}

function getFilePaths(args: ToolArgs, toolName: string): string[] {
  if (!args) {
    return []
  }

  const paths: string[] = []
  
  // Handle Bash tool - extract file paths from command
  if (toolName.toLowerCase() === "bash") {
    const command = args.command as string | undefined
    if (command) {
      paths.push(...extractFilePathsFromBashCommand(command))
    }
    return paths
  }

  // Handle Write/Edit tools
  const directPath = args.filePath ?? args.file_path ?? args.path ?? args.file
  if (typeof directPath === "string") {
    paths.push(directPath)
  }

  const edits = args.edits as Array<Record<string, unknown>> | undefined
  if (Array.isArray(edits)) {
    for (const edit of edits) {
      const editPath = edit.filePath ?? edit.file_path ?? edit.path
      if (typeof editPath === "string") {
        paths.push(editPath)
      }
    }
  }

  return paths
}

// TDD-EXEMPT: reason="DEBUGGING: adding extreme logs to tasks-md-creation-guard"
export function createTasksMdCreationGuardHook(ctx: PluginInput) {
  const skillUsedSessions = new Set<string>()

  function hasSkillAuthorization(sessionID?: string): boolean {
    if (!sessionID) return false;
    const authorized = skillUsedSessions.has(sessionID);
    
    log("[tasks-md-creation-guard] hasSkillAuthorization", {
      sessionID,
      authorized,
      skillUsedSessions: Array.from(skillUsedSessions),
    });

    if (authorized) return true;

    const mainSessionID = getMainSessionID();
    if (!mainSessionID) return false;

    const isMainSession = sessionID === mainSessionID;
    const isSubagentSession = subagentSessions.has(sessionID);
    
    const mainAuthorized = skillUsedSessions.has(mainSessionID);
    log("[tasks-md-creation-guard] checking main session", {
      mainSessionID,
      isMainSession,
      isSubagentSession,
      mainAuthorized,
    });

    if (mainAuthorized) return true;

    for (const subagentSession of subagentSessions) {
      if (skillUsedSessions.has(subagentSession)) {
        log("[tasks-md-creation-guard] subagent authorized", { subagentSession });
        return true;
      }
    }

    return false;
  }

  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID?: string },
      output: { args?: Record<string, unknown>; blocked?: boolean; message?: string }
    ): Promise<void> => {
      const toolName = input.tool
      const toolLower = toolName.toLowerCase()

      log("[tasks-md-creation-guard] before hook ENTRY", { toolName, sessionID: input.sessionID });

      // TDD-EXEMPT: reason="Pre-authorize session if it's invoking creating-changes skill"
      if (toolLower === "skill" || toolLower === "slashcommand") {
        const skillName = (output.args?.name ?? output.args?.skillName ?? "") as string
        log("[tasks-md-creation-guard] skill tool detected", { skillName });
        if (skillName.toLowerCase().includes("creating-changes")) {
          if (input.sessionID) {
            skillUsedSessions.add(input.sessionID)
            log("[tasks-md-creation-guard] Authorized session via skill before hook", { sessionID: input.sessionID })
          }
        }
      }

      const isIntercepted = INTERCEPTED_TOOLS.some(
        tool => tool.toLowerCase() === toolName.toLowerCase()
      )
      
      log("[tasks-md-creation-guard] interception check", { isIntercepted });
      if (!isIntercepted) {
        return
      }

      const filePaths = getFilePaths(output.args, toolName)
      log("[tasks-md-creation-guard] extracted filePaths", { filePaths });
      if (filePaths.length === 0) {
        return
      }

      const matchingPaths = filePaths.filter(path => {
        const matches = matchesPlanningFilePattern(path, ctx.directory);
        log("[tasks-md-creation-guard] path pattern check", { path, directory: ctx.directory, matches });
        return matches;
      })
      
      log("[tasks-md-creation-guard] matchingPaths", { matchingPaths });
      if (matchingPaths.length === 0) {
        return
      }

      const authorized = hasSkillAuthorization(input.sessionID);
      log("[tasks-md-creation-guard] authorization final check", { authorized });
      if (authorized) {
        return
      }

      for (const filePath of matchingPaths) {
        const resolved = resolve(ctx.directory, filePath)
        const exists = existsSync(resolved);
        log("[tasks-md-creation-guard] final block check", { filePath, resolved, exists });
        if (!exists) {
          output.blocked = true
          output.message = ERROR_MESSAGE
          log("[tasks-md-creation-guard] !!! BLOCKED !!!");
          return
        }
      }
    },

    "tool.execute.after": async (
      input: { tool: string; sessionID?: string; args?: Record<string, unknown> },
      output: { metadata?: Record<string, unknown> }
    ): Promise<void> => {
      const toolLower = input.tool.toLowerCase()
      // Recognize both "skill" and "slashcommand" tools
      if (toolLower !== "skill" && toolLower !== "slashcommand") {
        return
      }

      // Check both output metadata (for tools that provide it) and input args (for skill name)
      const outputSkillName = (output.metadata?.name ?? output.metadata?.skillName ?? "") as string
      const inputSkillName = (input.args?.name ?? input.args?.skillName ?? "") as string
      const skillName = outputSkillName || inputSkillName

      if (!skillName.toLowerCase().includes("creating-changes")) {
        return
      }

      if (input.sessionID) {
        skillUsedSessions.add(input.sessionID)
      }
    },
  }
}
