import type { PluginInput } from "@opencode-ai/plugin"
import { createInteractiveBashSessionHook as createInteractiveBashSessionHookUpstream } from "./hook"

export function createInteractiveBashSessionHook(ctx: PluginInput) {
  if (process.platform === "win32") {
    return {
      "tool.execute.after": async () => {},
      event: async () => {},
    }
  }

  return createInteractiveBashSessionHookUpstream(ctx)
}

export { createInteractiveBashSessionTracker } from "./interactive-bash-session-tracker"
export { parseTmuxCommand } from "./tmux-command-parser"
