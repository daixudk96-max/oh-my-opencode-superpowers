import type { PluginInput } from "@opencode-ai/plugin"
import { createPrometheusMdOnlyHook as createPrometheusMdOnlyHookUpstream } from "./hook"

export * from "./constants"

type ToolExecuteBeforeInput = { tool: string; sessionID: string; callID: string }
type ToolExecuteBeforeOutput = { args: Record<string, unknown>; message?: string }

export function createPrometheusMdOnlyHook(ctx: PluginInput) {
  const upstreamHook = createPrometheusMdOnlyHookUpstream(ctx)
  const upstreamToolExecuteBefore = upstreamHook["tool.execute.before"]

  return {
    ...upstreamHook,
    "tool.execute.before": async (
      input: ToolExecuteBeforeInput,
      output: ToolExecuteBeforeOutput,
    ): Promise<void> => {
      if (input.tool === "delegate_task") {
        return upstreamToolExecuteBefore({ ...input, tool: "task" }, output)
      }

      return upstreamToolExecuteBefore(input, output)
    },
  }
}
