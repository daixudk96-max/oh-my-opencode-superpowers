import { describe, expect, test } from "bun:test"
import { createCommitSizeCheckerWrapper } from "./commit-size-checker-wrapper"

describe("createCommitSizeCheckerWrapper", () => {
  test("adds warning message for git commit command", () => {
    //#given
    const checker = createCommitSizeCheckerWrapper()
    const output: { args: { command: string }; message?: string } = {
      args: { command: "git commit -m 'test'" },
    }

    //#when
    checker["tool.execute.before"]?.({ tool: "bash" }, output)

    //#then
    expect(output.message).toBeDefined()
    expect(output.message).toContain("超过建议阈值")
  })

  test("does not add warning for non-commit command", () => {
    //#given
    const checker = createCommitSizeCheckerWrapper()
    const output: { args: { command: string }; message?: string } = {
      args: { command: "git status" },
    }

    //#when
    checker["tool.execute.before"]?.({ tool: "bash" }, output)

    //#then
    expect(output.message).toBeUndefined()
  })
})
