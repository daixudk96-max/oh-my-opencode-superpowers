import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, spyOn, test } from "bun:test"
import { createCommitSizeCheckerWrapper } from "./commit-size-checker-wrapper"

describe("createCommitSizeCheckerWrapper", () => {
  test("adds warning message for git commit command", () => {
    //#given
    const checker = createCommitSizeCheckerWrapper()
    const stagedFilesSpy = spyOn(checker, "getStagedFiles").mockReturnValue(["a.ts", "b.ts", "c.ts", "d.ts"])
    const output: { args: { command: string }; blocked?: boolean; message?: string } = {
      args: { command: "git commit -m 'test'" },
    }

    try {
      //#when
      checker["tool.execute.before"]?.({ tool: "bash" }, output)

      //#then
      expect(output.message).toBeDefined()
      expect(output.message).toContain("超过建议阈值")
      expect(output.blocked).toBe(true)
    } finally {
      stagedFilesSpy.mockRestore()
    }
  })

  test("does not add warning for non-commit command", () => {
    //#given
    const checker = createCommitSizeCheckerWrapper()
    const output: { args: { command: string }; blocked?: boolean; message?: string } = {
      args: { command: "git status" },
    }

    //#when
    checker["tool.execute.before"]?.({ tool: "bash" }, output)

    //#then
    expect(output.message).toBeUndefined()
    expect(output.blocked).toBeUndefined()
  })

  test("does not crash in non-git directory", () => {
    //#given
    const checker = createCommitSizeCheckerWrapper()
    const nonGitDir = mkdtempSync(join(tmpdir(), "omo-commit-size-wrapper-"))
    const output: { args: { command: string; cwd: string }; blocked?: boolean; message?: string } = {
      args: { command: "git commit -m 'test'", cwd: nonGitDir },
    }

    try {
      //#when
      expect(() => checker["tool.execute.before"]?.({ tool: "bash" }, output)).not.toThrow()

      //#then
      expect(output.message).toBeUndefined()
      expect(output.blocked).toBeUndefined()
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true })
    }
  })
})
