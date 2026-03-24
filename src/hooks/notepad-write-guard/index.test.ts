import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import type { PluginInput } from "@opencode-ai/plugin"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { createNotepadWriteGuardHook } from "./index"
import { HOOK_NAME, BLOCKED_MESSAGE } from "./constants"

describe(HOOK_NAME, () => {
  let testDir = ""

  beforeEach(() => {
    testDir = join(tmpdir(), `notepad-write-guard-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  function createMockPluginInput(): PluginInput {
    return {
      client: {} as PluginInput["client"],
      project: {} as PluginInput["project"],
      directory: testDir,
      worktree: testDir,
      serverUrl: new URL("http://localhost"),
      $: {} as PluginInput["$"],
    } as PluginInput
  }

  function createOutput(filePath?: string): {
    args?: Record<string, unknown>
    blocked?: boolean
    message?: string
  } {
    return filePath ? { args: { filePath } } : { args: {} }
  }

  function ensureFile(filePath: string): void {
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, "existing")
  }

  test("should block Write on existing findings.md", async () => {
    const hook = createNotepadWriteGuardHook(createMockPluginInput())
    const input = { tool: "Write" }
    const filePath = join(testDir, "exists", "findings.md")
    ensureFile(filePath)
    const output = createOutput(filePath)

    await hook["tool.execute.before"](input, output)

    expect(output.blocked).toBe(true)
    expect(output.message).toBe(BLOCKED_MESSAGE)
  })

  test("should block Write on existing progress.md", async () => {
    const hook = createNotepadWriteGuardHook(createMockPluginInput())
    const input = { tool: "Write" }
    const filePath = join(testDir, "exists", "progress.md")
    ensureFile(filePath)
    const output = createOutput(filePath)

    await hook["tool.execute.before"](input, output)

    expect(output.blocked).toBe(true)
    expect(output.message).toBe(BLOCKED_MESSAGE)
  })

  test("should allow Write on non-existent findings.md (first-time creation)", async () => {
    const hook = createNotepadWriteGuardHook(createMockPluginInput())
    const input = { tool: "Write" }
    const filePath = join(testDir, "new", "findings.md")
    const output = createOutput(filePath)

    await hook["tool.execute.before"](input, output)

    expect(output.blocked).toBeUndefined()
    expect(output.message).toBeUndefined()
  })

  test("should not affect Write on other files", async () => {
    const hook = createNotepadWriteGuardHook(createMockPluginInput())
    const input = { tool: "Write" }
    const filePath = join(testDir, "exists", "other.md")
    ensureFile(filePath)
    const output = createOutput(filePath)

    await hook["tool.execute.before"](input, output)

    expect(output.blocked).toBeUndefined()
  })

  test("should not affect other tools", async () => {
    const hook = createNotepadWriteGuardHook(createMockPluginInput())
    const input = { tool: "Read" }
    const filePath = join(testDir, "exists", "findings.md")
    ensureFile(filePath)
    const output = createOutput(filePath)

    await hook["tool.execute.before"](input, output)

    expect(output.blocked).toBeUndefined()
  })

  test("should handle missing filePath gracefully", async () => {
    const hook = createNotepadWriteGuardHook(createMockPluginInput())
    const input = { tool: "Write" }
    const output = createOutput()

    await hook["tool.execute.before"](input, output)

    expect(output.blocked).toBeUndefined()
  })
})
