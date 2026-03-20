import type { PluginInput } from "@opencode-ai/plugin"
import { createBoulderGatingWrapper } from "../../downstream/patches/boulder-gating-wrapper"
import { createContinuationMaxRetriesWrapper } from "../../downstream/patches/continuation-max-retries-wrapper"
import { createAtlasEventHandler } from "./event-handler"
import { createToolExecuteAfterHandler } from "./tool-execute-after"
import { createToolExecuteBeforeHandler } from "./tool-execute-before"
import type { AtlasHookOptions, PendingTaskRef, SessionState } from "./types"

export function createAtlasHook(ctx: PluginInput, options?: AtlasHookOptions) {
  const sessions = new Map<string, SessionState>()
  const pendingFilePaths = new Map<string, string>()
  const pendingTaskRefs = new Map<string, PendingTaskRef>()
  const autoCommit = options?.autoCommit ?? true

  function getState(sessionID: string): SessionState {
    let state = sessions.get(sessionID)
    if (!state) {
      state = { promptFailureCount: 0 }
      sessions.set(sessionID, state)
    }
    return state
  }

  const upstreamEventHandler = createAtlasEventHandler({ ctx, options, sessions, getState })
  const boulderGatingHandler = createBoulderGatingWrapper({
    ctx,
    handler: upstreamEventHandler,
  })
  const wrappedEventHandler = createContinuationMaxRetriesWrapper({
    handler: boulderGatingHandler,
    getState,
  })

  return {
    handler: wrappedEventHandler,
    "tool.execute.before": createToolExecuteBeforeHandler({ ctx, pendingFilePaths, pendingTaskRefs }),
    "tool.execute.after": createToolExecuteAfterHandler({ ctx, pendingFilePaths, pendingTaskRefs, autoCommit, getState }),
  }
}
