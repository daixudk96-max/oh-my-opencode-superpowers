import { createCommitSizeChecker } from "../../hooks/pre-tool-use/commit-size-checker"
import type { CommitSizeChecker } from "../../hooks/pre-tool-use/commit-size-checker"

type ToolExecuteBeforeInput = { tool?: string }
type ToolExecuteBeforeOutput = {
  args?: { command?: string }
  blocked?: boolean
  message?: string
}

const DEFAULT_WRAPPER_FILE_SAMPLE = ["file-1", "file-2", "file-3", "file-4"]

/**
 * Pattern C wrapper: preserve upstream checker behavior and add warning emission.
 */
export function createCommitSizeCheckerWrapper(): CommitSizeChecker {
  const checker = createCommitSizeChecker()

  return {
    ...checker,
    "tool.execute.before": (input: ToolExecuteBeforeInput, output: ToolExecuteBeforeOutput): void => {
      checker["tool.execute.before"]?.(input, output)

      if (input.tool !== "bash") return
      const command = output.args?.command
      if (!command || !checker.isCommitCommand(command)) return

      const result = checker.check({ files: DEFAULT_WRAPPER_FILE_SAMPLE })
      if (!result.shouldWarn || !result.message) return

      const prefix = output.message && output.message.length > 0 ? "\n\n" : ""
      output.message = `${output.message ?? ""}${prefix}${result.message}`
    },
  }
}
