/**
 * Contract Lock Preparer Hook
 *
 * PreToolUse hook that detects when tasks.md has Contract Lock fields
 * (Applies: YES) but no contracts/ directory exists. Injects a reminder
 * to run the contract-lock-writer skill before implementation.
 *
 * Only fires once per session to avoid spamming.
 */

import type { PluginInput } from "@opencode-ai/plugin"
import { readFileSync, existsSync, readdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { readBoulderState } from "../../features/boulder-state"
import { log } from "../../shared/logger"

const HOOK_NAME = "contract-lock-preparer"

/** Track whether we've already reminded in this session */
const remindedSessions = new Set<string>()

/** Pattern to detect Contract Lock: Applies: YES in tasks.md */
const CONTRACT_LOCK_YES_PATTERN = /Contract Lock:[\s\S]*?Applies:\s*YES/i

/**
 * Check if a directory has .contract.ts files
 */
function hasContractFiles(dirPath: string): boolean {
  try {
    if (!existsSync(dirPath)) {
      return false
    }
    const files = readdirSync(dirPath)
    return files.some((f) => f.endsWith(".contract.ts") || f.endsWith(".contract.tsx"))
  } catch {
    return false
  }
}

export function createContractLockPreparerHook(ctx: PluginInput) {
  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: {
        args: Record<string, unknown>
        message?: string
        messages?: Array<{ role: string; content: string }>
      }
    ): Promise<void> => {
      const sessionId = input.sessionID ?? "unknown"

      // Only remind once per session
      if (remindedSessions.has(sessionId)) {
        return
      }

      // Only trigger on edit/write tools (implementation operations)
      const toolName = input.tool?.toLowerCase()
      if (!toolName || (toolName !== "edit" && toolName !== "write")) {
        return
      }

      // Check boulder state for active plan
      const boulderState = readBoulderState(ctx.directory)
      if (!boulderState?.active_plan) {
        return
      }

      // Read tasks.md
      const tasksPath = resolve(ctx.directory, boulderState.active_plan)
      let tasksContent: string
      try {
        if (!existsSync(tasksPath)) {
          return
        }
        tasksContent = readFileSync(tasksPath, "utf-8")
      } catch {
        return
      }

      // Check if tasks.md has Contract Lock: YES fields
      if (!CONTRACT_LOCK_YES_PATTERN.test(tasksContent)) {
        return
      }

      // Check if contracts/ directory exists with .contract.ts files
      const changeDirPath = dirname(tasksPath)
      const contractsDir = resolve(changeDirPath, "contracts")

      if (hasContractFiles(contractsDir)) {
        // Contracts exist, no reminder needed
        return
      }

      // Mark as reminded for this session
      remindedSessions.add(sessionId)

      log(`[${HOOK_NAME}] Missing contracts detected`, {
        plan: boulderState.plan_name,
        contractsDir,
      })

      // Inject reminder message
      const reminder = [
        `[CONTRACT LOCK REMINDER]`,
        ``,
        `tasks.md has Contract Lock fields (Applies: YES) but no contracts/ directory was found.`,
        ``,
        `Before implementing code tasks, generate contract tests first:`,
        `1. Run the contract-lock-writer skill to generate .contract.ts files`,
        `2. Verify the contract tests fail (red phase — no implementation yet)`,
        `3. Then proceed with implementation`,
        ``,
        `Expected location: ${contractsDir}/`,
        ``,
        `[/CONTRACT LOCK REMINDER]`,
      ].join("\n")

      if (!output.messages) {
        output.messages = []
      }
      output.messages.push({ role: "system", content: reminder })
    },
  }
}
