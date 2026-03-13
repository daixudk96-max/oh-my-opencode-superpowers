import { existsSync, statSync } from "node:fs"
import type { PluginInput } from "@opencode-ai/plugin"
import {
  appendSessionId,
  clearBoulderState,
  createBoulderState,
  findPrometheusPlans,
  getBoulderFilePath,
  getPlanName,
  getPlanProgress,
  readBoulderState,
  writeBoulderState,
} from "../../features/boulder-state"
import { updateSessionAgent } from "../../features/claude-code-session-state"
import { log } from "../../shared/logger"
import { parseUserRequest } from "./parse-user-request"
import { detectWorktreePath } from "./worktree-detector"

type StartWorkExecutionMode = "sequential" | "parallel"

export const HOOK_NAME = "start-work" as const

interface StartWorkHookInput {
  sessionID: string
  messageID?: string
}

interface StartWorkHookOutput {
  parts: Array<{ type: string; text?: string }>
}

function findPlanByName(plans: string[], requestedName: string): string | null {
  const lowerName = requestedName.toLowerCase()
  const exactMatch = plans.find((p) => getPlanName(p).toLowerCase() === lowerName)
  if (exactMatch) return exactMatch
  const partialMatch = plans.find((p) => getPlanName(p).toLowerCase().includes(lowerName))
  return partialMatch || null
}

const MODEL_DECIDES_WORKTREE_BLOCK = `
## Worktree Setup Required

No worktree specified. Before starting work, you MUST choose or create one:

1. \`git worktree list --porcelain\` — list existing worktrees
2. Create if needed: \`git worktree add <absolute-path> <branch-or-HEAD>\`
3. Update \`.sisyphus/boulder.json\` — add \`"worktree_path": "<absolute-path>"\`
4. Work exclusively inside that worktree directory`

function resolveWorktreeContext(
  explicitWorktreePath: string | null,
): { worktreePath: string | undefined; block: string } {
  if (explicitWorktreePath === null) {
    return { worktreePath: undefined, block: MODEL_DECIDES_WORKTREE_BLOCK }
  }

  const validatedPath = detectWorktreePath(explicitWorktreePath)
  if (validatedPath) {
    return { worktreePath: validatedPath, block: `\n**Worktree**: ${validatedPath}` }
  }

  return {
    worktreePath: undefined,
    block: `\n**Worktree** (needs setup): \`git worktree add ${explicitWorktreePath} <branch>\`, then add \`"worktree_path"\` to boulder.json`,
  }
}

function selectExecutionMode(options: {
  explicitExecutionMode: StartWorkExecutionMode | null
  existingExecutionMode?: StartWorkExecutionMode
  remainingTasks: number
}): StartWorkExecutionMode {
  if (options.explicitExecutionMode) {
    return options.explicitExecutionMode
  }

  if (options.existingExecutionMode) {
    return options.existingExecutionMode
  }

  return options.remainingTasks > 5 ? "parallel" : "sequential"
}

function buildExecutionModeBlock(mode: StartWorkExecutionMode): string {
  if (mode === "parallel") {
    return "\n**Execution Mode**: Wave-Parallel (`skill(\"wave-parallel-execution\")`)"
  }

  return "\n**Execution Mode**: Sequential (`skill(\"executing-plans\")`)"
}

function buildExecutionModeConfirmation(mode: StartWorkExecutionMode): string {
  return `Execution mode: ${mode}`
}

export function createStartWorkHook(ctx: PluginInput) {
  return {
    "chat.message": async (input: StartWorkHookInput, output: StartWorkHookOutput): Promise<void> => {
      const parts = output.parts
      const promptText =
        parts
          ?.filter((p) => p.type === "text" && p.text)
          .map((p) => p.text)
          .join("\n")
          .trim() || ""

      if (!promptText.includes("<session-context>")) return

      log(`[${HOOK_NAME}] Processing start-work command`, { sessionID: input.sessionID })
      updateSessionAgent(input.sessionID, "atlas")

      const existingState = readBoulderState(ctx.directory)
      const sessionId = input.sessionID
      const timestamp = new Date().toISOString()

      const {
        planName: explicitPlanName,
        explicitWorktreePath,
        explicitExecutionMode,
      } = parseUserRequest(promptText)
      const { worktreePath, block: worktreeBlock } = resolveWorktreeContext(explicitWorktreePath)

      let contextInfo = ""
      const canPersistExistingState = existsSync(getBoulderFilePath(ctx.directory))

      if (explicitPlanName) {
        log(`[${HOOK_NAME}] Explicit plan name requested: ${explicitPlanName}`, { sessionID: input.sessionID })

        const allPlans = findPrometheusPlans(ctx.directory)
        const matchedPlan = findPlanByName(allPlans, explicitPlanName)

        if (matchedPlan) {
          const progress = getPlanProgress(matchedPlan)

          if (progress.isComplete) {
            contextInfo = `
## Plan Already Complete

The requested plan "${getPlanName(matchedPlan)}" has been completed.
All ${progress.total} tasks are done. Create a new plan with: /plan "your task"`
          } else {
            if (existingState) clearBoulderState(ctx.directory)
            const remainingTasks = Math.max(progress.total - progress.completed, 0)
            const selectedMode = selectExecutionMode({
              explicitExecutionMode,
              remainingTasks,
            })
            const executionModeBlock = buildExecutionModeBlock(selectedMode)
            const executionModeConfirmation = buildExecutionModeConfirmation(selectedMode)

            const newState = {
              ...createBoulderState(matchedPlan, sessionId, "atlas", worktreePath),
              execution_mode: selectedMode,
            }
            writeBoulderState(ctx.directory, newState)

            contextInfo = `
## Auto-Selected Plan

**Plan**: ${getPlanName(matchedPlan)}
**Path**: ${matchedPlan}
**Progress**: ${progress.completed}/${progress.total} tasks
**Session ID**: ${sessionId}
**Started**: ${timestamp}
${worktreeBlock}
${executionModeBlock}
${executionModeConfirmation}

boulder.json has been created. Read the plan and begin execution.`
          }
        } else {
          const incompletePlans = allPlans.filter((p) => !getPlanProgress(p).isComplete)
          if (incompletePlans.length > 0) {
            const planList = incompletePlans
              .map((p, i) => {
                const prog = getPlanProgress(p)
                return `${i + 1}. [${getPlanName(p)}] - Progress: ${prog.completed}/${prog.total}`
              })
              .join("\n")

            contextInfo = `
## Plan Not Found

Could not find a plan matching "${explicitPlanName}".

Available incomplete plans:
${planList}

Ask the user which plan to work on.`
          } else {
            contextInfo = `
## Plan Not Found

Could not find a plan matching "${explicitPlanName}".
No incomplete plans available. Create a new plan with: /plan "your task"`
          }
        }
      } else if (existingState) {
        const progress = getPlanProgress(existingState.active_plan)

        if (!progress.isComplete) {
          const remainingTasks = Math.max(progress.total - progress.completed, 0)
          const selectedMode = selectExecutionMode({
            explicitExecutionMode,
            existingExecutionMode: existingState.execution_mode,
            remainingTasks,
          })
          const effectiveWorktree = worktreePath ?? existingState.worktree_path
          const executionModeBlock = buildExecutionModeBlock(selectedMode)
          const executionModeConfirmation = buildExecutionModeConfirmation(selectedMode)

          if (canPersistExistingState && worktreePath !== undefined) {
            const updatedSessions = existingState.session_ids.includes(sessionId)
              ? existingState.session_ids
              : [...existingState.session_ids, sessionId]
            writeBoulderState(ctx.directory, {
              ...existingState,
              worktree_path: worktreePath,
              execution_mode: selectedMode,
              session_ids: updatedSessions,
            })
          } else if (canPersistExistingState) {
            const updatedState = appendSessionId(ctx.directory, sessionId)
            if (updatedState && updatedState.execution_mode !== selectedMode) {
              writeBoulderState(ctx.directory, {
                ...updatedState,
                execution_mode: selectedMode,
              })
            }
          }

          const worktreeDisplay = effectiveWorktree ? `\n**Worktree**: ${effectiveWorktree}` : worktreeBlock

          contextInfo = `
## Active Work Session Found

**Status**: RESUMING existing work
**Plan**: ${existingState.plan_name}
**Path**: ${existingState.active_plan}
**Progress**: ${progress.completed}/${progress.total} tasks completed
**Sessions**: ${existingState.session_ids.length + 1} (current session appended)
**Started**: ${existingState.started_at}
${worktreeDisplay}
${executionModeBlock}
${executionModeConfirmation}

The current session (${sessionId}) has been added to session_ids.
Read the plan file and continue from the first unchecked task.`
        } else {
          contextInfo = `
## Previous Work Complete

The previous plan (${existingState.plan_name}) has been completed.
Looking for new plans...`
        }
      }

      if (
        (!existingState && !explicitPlanName) ||
        (existingState && !explicitPlanName && getPlanProgress(existingState.active_plan).isComplete)
      ) {
        const plans = findPrometheusPlans(ctx.directory)
        const incompletePlans = plans.filter((p) => !getPlanProgress(p).isComplete)

        if (plans.length === 0) {
          contextInfo += `
## No Plans Found

No Prometheus plan files found at .sisyphus/plans/
Use Prometheus to create a work plan first: /plan "your task"`
        } else if (incompletePlans.length === 0) {
          contextInfo += `

## All Plans Complete

All ${plans.length} plan(s) are complete. Create a new plan with: /plan "your task"`
        } else if (incompletePlans.length === 1) {
          const planPath = incompletePlans[0]
          const progress = getPlanProgress(planPath)
          const remainingTasks = Math.max(progress.total - progress.completed, 0)
          const selectedMode = selectExecutionMode({
            explicitExecutionMode,
            remainingTasks,
          })
          const executionModeBlock = buildExecutionModeBlock(selectedMode)
          const executionModeConfirmation = buildExecutionModeConfirmation(selectedMode)

          const newState = {
            ...createBoulderState(planPath, sessionId, "atlas", worktreePath),
            execution_mode: selectedMode,
          }
          writeBoulderState(ctx.directory, newState)

          contextInfo += `

## Auto-Selected Plan

**Plan**: ${getPlanName(planPath)}
**Path**: ${planPath}
**Progress**: ${progress.completed}/${progress.total} tasks
**Session ID**: ${sessionId}
**Started**: ${timestamp}
${worktreeBlock}
${executionModeBlock}
${executionModeConfirmation}

boulder.json has been created. Read the plan and begin execution.`
        } else {
          const planList = incompletePlans
            .map((p, i) => {
              const progress = getPlanProgress(p)
              const modified = new Date(statSync(p).mtimeMs).toISOString()
              return `${i + 1}. [${getPlanName(p)}] - Modified: ${modified} - Progress: ${progress.completed}/${progress.total}`
            })
            .join("\n")

          contextInfo += `

<system-reminder>
## Multiple Plans Found

Current Time: ${timestamp}
Session ID: ${sessionId}

${planList}

Ask the user which plan to work on. Present the options above and wait for their response.
${worktreeBlock}
</system-reminder>`
        }
      }

      const idx = output.parts.findIndex((p) => p.type === "text" && p.text)
      if (idx >= 0 && output.parts[idx].text) {
        output.parts[idx].text = output.parts[idx].text
          .replace(/\$SESSION_ID/g, sessionId)
          .replace(/\$TIMESTAMP/g, timestamp)

        output.parts[idx].text += `\n\n---\n${contextInfo}`
      }

      log(`[${HOOK_NAME}] Context injected`, {
        sessionID: input.sessionID,
        hasExistingState: !!existingState,
        worktreePath,
      })
    },
  }
}
