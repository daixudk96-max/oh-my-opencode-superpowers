import { HOOK_NAME } from "../../hooks/atlas/hook-name"
import type { SessionState } from "../../hooks/atlas/types"
import { log } from "../../shared/logger"

type AtlasEventArg = { event: { type: string; properties?: unknown } }
type AtlasEventHandler = (arg: AtlasEventArg) => Promise<void>

function extractSessionID(props: unknown): string | undefined {
  if (!props || typeof props !== "object") return undefined
  const candidate = (props as { sessionID?: unknown }).sessionID
  return typeof candidate === "string" ? candidate : undefined
}

/**
 * Pattern C wrapper: cap continuation retries without modifying upstream atlas logic.
 */
export function createContinuationMaxRetriesWrapper(input: {
  handler: AtlasEventHandler
  getState: (sessionID: string) => SessionState
  maxRetries?: number
}): AtlasEventHandler {
  const { handler, getState, maxRetries = 5 } = input

  return async (arg: AtlasEventArg): Promise<void> => {
    if (arg.event.type !== "session.idle") {
      await handler(arg)
      return
    }

    const sessionID = extractSessionID(arg.event.properties)
    if (!sessionID) {
      await handler(arg)
      return
    }

    const state = getState(sessionID)
    if (state.promptFailureCount >= maxRetries) {
      log(`[${HOOK_NAME}] [downstream:continuation-max-retries] Skipped: max retries reached`, {
        sessionID,
        promptFailureCount: state.promptFailureCount,
        maxRetries,
      })
      return
    }

    await handler(arg)
  }
}
