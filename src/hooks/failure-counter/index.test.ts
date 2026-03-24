import { describe, expect, it } from "bun:test"
import { createFailureCounterHook } from "."

type ToolBeforeInput = { tool: string; sessionID: string; callID: string }
type ToolBeforeOutput = {
  args: Record<string, unknown>
  blocked?: boolean
  message?: string
  messages?: Array<{ role: string; content: string }>
}
type ToolAfterOutput = {
  output?: string
  messages?: Array<{ role: string; content: string }>
}
type UserPromptSubmitOutput = {
  blocked?: boolean
  message?: string
  messages?: Array<{ role: string; content: string }>
}

describe("createFailureCounterHook", () => {
  it("#given three failures #when reset command is submitted #then the session is unblocked", async () => {
    const hook = createFailureCounterHook({ cwd: process.cwd() })
    const beforeHandler = hook["tool.execute.before"]
    const afterHandler = hook["tool.execute.after"]
    const userPromptSubmitHandler = hook.UserPromptSubmit

    const input: ToolBeforeInput = {
      tool: "delegate_task",
      sessionID: "session-1",
      callID: "call-1",
    }

    for (let index = 0; index < 3; index += 1) {
      await afterHandler(input, {
        output: "Error: task failed",
      } satisfies ToolAfterOutput)
    }

    const blockedOutput: ToolBeforeOutput = { args: {} }
    await beforeHandler(input, blockedOutput)

    expect(blockedOutput.blocked).toBe(true)

    const resetOutput: UserPromptSubmitOutput = {}
    await userPromptSubmitHandler(
      { sessionID: "session-1", prompt: "/reset-failures" },
      resetOutput,
    )

    expect(resetOutput.blocked).toBe(true)
    expect(resetOutput.message).toBe("失败计数器已重置。")
    expect(resetOutput.messages?.[0]?.content).toContain("失败计数器已重置")

    const unblockedOutput: ToolBeforeOutput = { args: {} }
    await beforeHandler(input, unblockedOutput)

    expect(unblockedOutput.blocked).toBeUndefined()
    expect(unblockedOutput.message).toBeUndefined()
  })
})
