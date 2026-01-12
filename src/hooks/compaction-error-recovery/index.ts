import type { PluginInput } from "@opencode-ai/plugin"
import { log } from "../../shared/logger"

/**
 * Compaction Error Recovery Hook
 * 
 * Workaround for compaction failures caused by slow API responses.
 * When compaction fails:
 * 1. Detects the error via session.error event
 * 2. Shows toast notification to user
 * 3. Attempts to retry or send manual continue prompt
 */

interface CompactionErrorState {
  // Track sessions that recently triggered compaction
  compactionInProgress: Map<string, number> // sessionID -> timestamp
  // Track retry attempts
  retryAttempts: Map<string, number> // sessionID -> count
  // Track last error time to prevent spam
  lastErrorTime: Map<string, number> // sessionID -> timestamp
}

const COMPACTION_WINDOW_MS = 60_000 // Consider compaction-related if error within 60s of compaction start
const RETRY_DELAY_MS = 10_000 // Wait 10s before retry
const MAX_RETRY_ATTEMPTS = 2
const ERROR_DEBOUNCE_MS = 5_000 // Don't process same session errors within 5s

export interface CompactionErrorRecoveryOptions {
  retryDelay?: number
  maxRetries?: number
}

export function createCompactionErrorRecoveryHook(
  ctx: PluginInput,
  options?: CompactionErrorRecoveryOptions
) {
  const retryDelay = options?.retryDelay ?? RETRY_DELAY_MS
  const maxRetries = options?.maxRetries ?? MAX_RETRY_ATTEMPTS

  const state: CompactionErrorState = {
    compactionInProgress: new Map(),
    retryAttempts: new Map(),
    lastErrorTime: new Map(),
  }

  const isCompactionRelatedError = (sessionID: string): boolean => {
    const compactionStart = state.compactionInProgress.get(sessionID)
    if (!compactionStart) return false
    
    const elapsed = Date.now() - compactionStart
    return elapsed < COMPACTION_WINDOW_MS
  }

  const shouldProcessError = (sessionID: string): boolean => {
    const lastError = state.lastErrorTime.get(sessionID)
    if (!lastError) return true
    
    return Date.now() - lastError > ERROR_DEBOUNCE_MS
  }

  const handleCompactionError = async (sessionID: string, error: unknown): Promise<void> => {
    const attempts = state.retryAttempts.get(sessionID) ?? 0
    
    log("[compaction-error-recovery] compaction error detected", {
      sessionID,
      attempts,
      error: String(error),
    })

    // Show toast notification
    await ctx.client.tui.showToast({
      body: {
        title: "Compaction Error",
        message: attempts < maxRetries 
          ? `Compaction failed. Retrying in ${retryDelay / 1000}s... (attempt ${attempts + 1}/${maxRetries})`
          : "Compaction failed. Sending continue prompt...",
        variant: "warning",
        duration: 5000,
      },
    }).catch(() => {})

    if (attempts < maxRetries) {
      // Retry compaction after delay
      state.retryAttempts.set(sessionID, attempts + 1)
      
      setTimeout(async () => {
        try {
          log("[compaction-error-recovery] retrying continue prompt", { sessionID })
          
          await ctx.client.session.prompt({
            path: { id: sessionID },
            body: { parts: [{ type: "text", text: "continue" }] },
            query: { directory: ctx.directory },
          })

          await ctx.client.tui.showToast({
            body: {
              title: "Recovery Sent",
              message: "Continue prompt sent. Waiting for response...",
              variant: "success",
              duration: 3000,
            },
          }).catch(() => {})

        } catch (retryError) {
          log("[compaction-error-recovery] retry failed", {
            sessionID,
            error: String(retryError),
          })
        }
      }, retryDelay)

    } else {
      // Max retries exceeded - send graceful fallback
      state.retryAttempts.delete(sessionID)
      state.compactionInProgress.delete(sessionID)

      setTimeout(async () => {
        try {
          log("[compaction-error-recovery] sending fallback continue", { sessionID })
          
          await ctx.client.session.prompt({
            path: { id: sessionID },
            body: { 
              parts: [{ 
                type: "text", 
                text: "The previous compaction may have failed. Please use `todoread` to check current tasks and continue working." 
              }] 
            },
            query: { directory: ctx.directory },
          })

        } catch (fallbackError) {
          log("[compaction-error-recovery] fallback failed", {
            sessionID,
            error: String(fallbackError),
          })

          await ctx.client.tui.showToast({
            body: {
              title: "Recovery Failed",
              message: "Please manually type 'continue' to resume.",
              variant: "error",
              duration: 10000,
            },
          }).catch(() => {})
        }
      }, retryDelay)
    }
  }

  const eventHandler = async ({ event }: { event: { type: string; properties?: unknown } }) => {
    const props = event.properties as Record<string, unknown> | undefined

    // Track when compaction starts (via preemptive-compaction toast or message.updated with summary)
    if (event.type === "message.updated") {
      const info = props?.info as { sessionID?: string; summary?: boolean; role?: string } | undefined
      if (info?.sessionID && info?.role === "assistant" && info?.summary === true) {
        state.compactionInProgress.set(info.sessionID, Date.now())
        log("[compaction-error-recovery] compaction started", { sessionID: info.sessionID })
      }
    }

    // Detect session errors
    if (event.type === "session.error") {
      const sessionID = props?.sessionID as string | undefined
      const error = props?.error

      if (!sessionID) return
      if (!shouldProcessError(sessionID)) return
      if (!isCompactionRelatedError(sessionID)) return

      state.lastErrorTime.set(sessionID, Date.now())
      await handleCompactionError(sessionID, error)
    }

    // Clean up on session delete
    if (event.type === "session.deleted") {
      const sessionInfo = props?.info as { id?: string } | undefined
      if (sessionInfo?.id) {
        state.compactionInProgress.delete(sessionInfo.id)
        state.retryAttempts.delete(sessionInfo.id)
        state.lastErrorTime.delete(sessionInfo.id)
      }
    }

    // Track compaction completion (clear tracking on success)
    if (event.type === "session.compacted") {
      const sessionID = props?.sessionID as string | undefined
      if (sessionID) {
        state.compactionInProgress.delete(sessionID)
        state.retryAttempts.delete(sessionID)
        log("[compaction-error-recovery] compaction completed successfully", { sessionID })
      }
    }
  }

  return {
    event: eventHandler,
  }
}
