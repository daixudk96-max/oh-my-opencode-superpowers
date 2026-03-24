import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import type { PluginInput } from "@opencode-ai/plugin"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { createObservationWriteGuardHook } from "./index"
import { BLOCKED_MESSAGE, HOOK_NAME, PROTECTED_PATH } from "./constants"

describe(HOOK_NAME, () => {
  let testDir = ""

  beforeEach(() => {
    testDir = join(tmpdir(), `observation-write-guard-${Date.now()}`)
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

  function observationPath(fileName: string): string {
    return join(testDir, ...PROTECTED_PATH.split("/"), fileName).replace(
      /\\/g,
      "/",
    )
  }

  function ensureFile(filePath: string): void {
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, "existing")
  }

  test("should not intercept non-Write tools", async () => {
    const hook = createObservationWriteGuardHook(createMockPluginInput())
    const input = { tool: "Read" }
    const output = createOutput(observationPath("existing-observation.md"))

    await hook["tool.execute.before"](input, output)

    expect(output.blocked).toBeUndefined()
  })

  test("should not intercept Edit tool", async () => {
    const hook = createObservationWriteGuardHook(createMockPluginInput())
    const input = { tool: "Edit" }
    const output = createOutput(observationPath("existing-observation.md"))

    await hook["tool.execute.before"](input, output)

    expect(output.blocked).toBeUndefined()
  })

  test("should not intercept Write to other paths", async () => {
    const hook = createObservationWriteGuardHook(createMockPluginInput())
    const input = { tool: "Write" }
    const output = createOutput(join(testDir, "src", "some-file.ts"))

    await hook["tool.execute.before"](input, output)

    expect(output.blocked).toBeUndefined()
  })

  test("should not intercept Write to similar but different paths", async () => {
    const hook = createObservationWriteGuardHook(createMockPluginInput())
    const input = { tool: "Write" }
    const output = createOutput(join(testDir, "observations", "some-file.md"))

    await hook["tool.execute.before"](input, output)

    expect(output.blocked).toBeUndefined()
  })

  test("should allow Write to observations/ when file does not exist (first-time creation)", async () => {
    const hook = createObservationWriteGuardHook(createMockPluginInput())
    const input = { tool: "Write" }
    const output = createOutput(observationPath("new-observation.md"))

    await hook["tool.execute.before"](input, output)

    expect(output.blocked).toBeUndefined()
    expect(output.message).toBeUndefined()
  })

  test("should block Write to observations/ when file already exists", async () => {
    const hook = createObservationWriteGuardHook(createMockPluginInput())
    const input = { tool: "Write" }
    const filePath = observationPath("existing-observation.md")
    ensureFile(filePath)
    const output = createOutput(filePath)

    await hook["tool.execute.before"](input, output)

    expect(output.blocked).toBe(true)
    expect(output.message).toBe(BLOCKED_MESSAGE)
  })

  test("should block Write with lowercase tool name", async () => {
    const hook = createObservationWriteGuardHook(createMockPluginInput())
    const input = { tool: "write" }
    const filePath = observationPath("existing-observation.md")
    ensureFile(filePath)
    const output = createOutput(filePath)

    await hook["tool.execute.before"](input, output)

    expect(output.blocked).toBe(true)
    expect(output.message).toBe(BLOCKED_MESSAGE)
  })

  test("should handle missing filePath gracefully", async () => {
    const hook = createObservationWriteGuardHook(createMockPluginInput())
    const input = { tool: "Write" }
    const output = createOutput()

    await hook["tool.execute.before"](input, output)

    expect(output.blocked).toBeUndefined()
  })

  test("should handle missing args gracefully", async () => {
    const hook = createObservationWriteGuardHook(createMockPluginInput())
    const input = { tool: "Write" }
    const output: { blocked?: boolean; message?: string } = {}

    await hook["tool.execute.before"](input, output)

    expect(output.blocked).toBeUndefined()
  })
})
