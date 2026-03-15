// TDD-EXEMPT: reason="Path migration to changes/"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { basename, dirname, join } from "node:path"
import type { PluginInput } from "@opencode-ai/plugin"
import { createStartWorkHook as createStartWorkHookUpstream } from "./start-work-hook"
import { PROMETHEUS_PLANS_DIR, LEGACY_PROMETHEUS_PLANS_DIR } from "../../features/boulder-state" // TDD-EXEMPT: path migration fix

const ARGUMENT_PLACEHOLDER = "$ARGUMENTS"
const USER_MESSAGE_PLACEHOLDER = "$" + "{user_message}"
const PRIMARY_PLANS_DIR = "changes"
const TASKS_FILE = "tasks.md"

export type { ParsedUserRequest } from "./parse-user-request"
export { parseUserRequest } from "./parse-user-request"
export { HOOK_NAME } from "./start-work-hook"
export { detectWorktreePath } from "./worktree-detector"

interface StartWorkHookInput {
  sessionID: string
  messageID?: string
}

interface StartWorkHookOutput {
  message?: unknown
  parts: Array<{ type: string; text?: string }>
}

function sanitizeArgumentPlaceholders(text: string): string {
  return text
    .replaceAll(ARGUMENT_PLACEHOLDER, "")
    .replaceAll(USER_MESSAGE_PLACEHOLDER, "")
}

function sanitizeTextParts(output: StartWorkHookOutput): void {
  output.parts = output.parts.map((part) => {
    if (part.type !== "text" || !part.text) {
      return part
    }

    return {
      ...part,
      text: sanitizeArgumentPlaceholders(part.text),
    }
  })
}

function readMessagePathDirectory(message: unknown): { cwd?: string; root?: string } {
  if (!message || typeof message !== "object") {
    return {}
  }

  const maybePath = (message as { path?: unknown }).path
  if (!maybePath || typeof maybePath !== "object") {
    return {}
  }

  const cwd = (maybePath as { cwd?: unknown }).cwd
  const root = (maybePath as { root?: unknown }).root

  return {
    cwd: typeof cwd === "string" ? cwd : undefined,
    root: typeof root === "string" ? root : undefined,
  }
}

function resolveWorkingDirectory(defaultDirectory: string, output: StartWorkHookOutput): string {
  const { cwd, root } = readMessagePathDirectory(output.message)
  if (cwd && existsSync(cwd)) {
    return cwd
  }

  if (root && existsSync(root)) {
    return root
  }

  return defaultDirectory
}

function listLegacyPlanTasks(directory: string): string[] {
  const legacyPlansDir = join(directory, PRIMARY_PLANS_DIR) // TDD-EXEMPT: path migration fix
  if (!existsSync(legacyPlansDir)) {
    return []
  }

  try {
    return readdirSync(legacyPlansDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(legacyPlansDir, entry.name, TASKS_FILE))
      .filter((planPath) => existsSync(planPath))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  } catch {
    return []
  }
}

function hasPrometheusPlans(directory: string): boolean {
  const plansDir = join(directory, LEGACY_PROMETHEUS_PLANS_DIR) // TDD-EXEMPT: path migration fix
  if (!existsSync(plansDir)) {
    return false
  }

  try {
    return readdirSync(plansDir).some((fileName) => fileName.endsWith(".md"))
  } catch {
    return false
  }
}

function ensureLegacyPlanMirror(directory: string): void {
  if (hasPrometheusPlans(directory)) {
    return
  }

  const legacyPlanTasks = listLegacyPlanTasks(directory)
  if (legacyPlanTasks.length === 0) {
    return
  }

  try {
    const plansDir = join(directory, LEGACY_PROMETHEUS_PLANS_DIR) // TDD-EXEMPT: path migration fix
    if (!existsSync(plansDir)) {
      mkdirSync(plansDir, { recursive: true })
    }

    for (const legacyPlanPath of legacyPlanTasks) {
      const planName = basename(dirname(legacyPlanPath))
      const mirroredPlanPath = join(plansDir, `${planName}.md`)
      const planContent = readFileSync(legacyPlanPath, "utf-8")
      writeFileSync(mirroredPlanPath, planContent, "utf-8")
    }
  } catch {
    return
  }
}

export function createStartWorkHook(ctx: PluginInput) {
  return {
    "chat.message": async (input: StartWorkHookInput, output: StartWorkHookOutput): Promise<void> => {
      sanitizeTextParts(output)

      const workingDirectory = resolveWorkingDirectory(ctx.directory, output)
      ensureLegacyPlanMirror(workingDirectory)

      const upstreamHook = createStartWorkHookUpstream({
        ...ctx,
        directory: workingDirectory,
      })

      await upstreamHook["chat.message"](input, output)
      sanitizeTextParts(output)
    },
  }
}
