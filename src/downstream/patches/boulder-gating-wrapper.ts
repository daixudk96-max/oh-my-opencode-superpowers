import type { PluginInput } from "@opencode-ai/plugin"
import { readBoulderState } from "../../features/boulder-state"
import { subagentSessions } from "../../features/claude-code-session-state"
import { HOOK_NAME } from "../../hooks/atlas/hook-name"
import { log } from "../../shared/logger"

type AtlasEventArg = { event: { type: string; properties?: unknown } }
type AtlasEventHandler = (arg: AtlasEventArg) => Promise<void>

function extractSessionID(props: unknown): string | undefined {
  if (!props || typeof props !== "object") return undefined
  const candidate = (props as { sessionID?: unknown }).sessionID
  return typeof candidate === "string" ? candidate : undefined
}

/**
 * Pattern C wrapper: keep upstream atlas event handler intact,
 * add an early boulder gate before invoking upstream logic.
 */
export function createBoulderGatingWrapper(input: {
  ctx: PluginInput
  handler: AtlasEventHandler
}): AtlasEventHandler {
  const { ctx, handler } = input

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

    if (subagentSessions.has(sessionID)) {
      log(`[${HOOK_NAME}] [downstream:boulder-gating] Skipped: child session is tracked as subagent`, {
        sessionID,
      })
      return
    }

    const boulderState = readBoulderState(ctx.directory)
    const inBoulderSession = boulderState?.session_ids?.includes(sessionID) ?? false
    const hasActivePlan = typeof boulderState?.active_plan === "string" && boulderState.active_plan.length > 0

    if (!inBoulderSession || !hasActivePlan) {
      log(`[${HOOK_NAME}] [downstream:boulder-gating] Skipped: missing active boulder plan/session gate`, {
        sessionID,
        inBoulderSession,
        hasActivePlan,
      })
      return
    }

    await handler(arg)
  }
}
