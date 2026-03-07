import type { PluginInput } from "@opencode-ai/plugin"
import { log } from "../../shared/logger"
import { clearCompactionInProgress, isCompactionInProgress, markCompactionInProgress } from "../compaction-state"
import { parseAnthropicTokenLimitError as parseTokenLimitError } from "./parser"
import {
  createAnthropicContextWindowLimitRecoveryHook as createRecoveryHook,
  type AnthropicContextWindowLimitRecoveryOptions,
} from "./recovery-hook"

interface HookEvent {
  type: string
  properties?: unknown
}

const SHARED_COMPACTION_GUARD_TIMEOUT_MS = 60_000
const pendingGuardClearBySession = new Map<string, ReturnType<typeof setTimeout>>()
const ownedSharedCompactionSessions = new Set<string>()

function clearPendingGuardTimeout(sessionID: string): void {
  const timeoutID = pendingGuardClearBySession.get(sessionID)
  if (timeoutID !== undefined) {
    clearTimeout(timeoutID)
    pendingGuardClearBySession.delete(sessionID)
  }
}

function clearSharedCompactionGuard(sessionID: string): void {
  clearPendingGuardTimeout(sessionID)
  ownedSharedCompactionSessions.delete(sessionID)
  clearCompactionInProgress(sessionID)
}

function scheduleSharedCompactionGuardClear(sessionID: string): void {
  clearPendingGuardTimeout(sessionID)
  const timeoutID = setTimeout(() => {
    clearSharedCompactionGuard(sessionID)
  }, SHARED_COMPACTION_GUARD_TIMEOUT_MS)
  pendingGuardClearBySession.set(sessionID, timeoutID)
}

function getSessionID(event: HookEvent): string | undefined {
  const props = event.properties as Record<string, unknown> | undefined
  if (event.type === "session.deleted") {
    const info = props?.info as { id?: string } | undefined
    return info?.id
  }

  if (event.type === "message.updated") {
    const info = props?.info as Record<string, unknown> | undefined
    return info?.sessionID as string | undefined
  }

  return props?.sessionID as string | undefined
}

function isTokenLimitSessionError(event: HookEvent): boolean {
  if (event.type !== "session.error") {
    return false
  }

  const props = event.properties as Record<string, unknown> | undefined
  return parseTokenLimitError(props?.error) !== null
}

export function createAnthropicContextWindowLimitRecoveryHook(
  ctx: PluginInput,
  options?: AnthropicContextWindowLimitRecoveryOptions,
) {
  const baseHook = createRecoveryHook(ctx, options)

  return {
    event: async ({ event }: { event: HookEvent }) => {
      const sessionID = getSessionID(event)

      if (event.type === "session.deleted" && sessionID) {
        clearSharedCompactionGuard(sessionID)
      }

      if (event.type === "session.error" && sessionID && isTokenLimitSessionError(event)) {
        if (isCompactionInProgress(sessionID)) {
          log("[auto-compact] skipped: shared compaction already in progress", { sessionID })
          return
        }

        markCompactionInProgress(sessionID)
        ownedSharedCompactionSessions.add(sessionID)
        scheduleSharedCompactionGuardClear(sessionID)

        try {
          return await baseHook.event({ event })
        } catch (error) {
          clearSharedCompactionGuard(sessionID)
          throw error
        }
      }

      if (event.type === "session.idle" && sessionID) {
        const sharedCompactionInProgress = isCompactionInProgress(sessionID)
        const ownedByThisHook = ownedSharedCompactionSessions.has(sessionID)

        if (sharedCompactionInProgress && !ownedByThisHook) {
          log("[auto-compact] session.idle skipped: shared compaction already in progress", { sessionID })
          return
        }

        if (!sharedCompactionInProgress) {
          markCompactionInProgress(sessionID)
          ownedSharedCompactionSessions.add(sessionID)
          scheduleSharedCompactionGuardClear(sessionID)
        }

        try {
          return await baseHook.event({ event })
        } finally {
          if (ownedSharedCompactionSessions.has(sessionID)) {
            clearSharedCompactionGuard(sessionID)
          }
        }
      }

      return baseHook.event({ event })
    },
  }
}

export type { AnthropicContextWindowLimitRecoveryOptions } from "./recovery-hook"
export type { AutoCompactState, ParsedTokenLimitError, TruncateState } from "./types"
export { parseAnthropicTokenLimitError } from "./parser"
export { executeCompact, getLastAssistant } from "./executor"
export * from "./state"
export * from "./message-builder"
export * from "./recovery-strategy"
