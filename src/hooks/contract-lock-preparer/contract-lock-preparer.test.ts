/**
 * Contract Lock Preparer Hook Tests
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

// We test the hook by importing the factory and simulating tool.execute.before calls
import { createContractLockPreparerHook } from "./index"

/** Helper to create a temp project with boulder state and tasks.md */
function createTestProject(options: {
  tasksContent?: string
  contractFiles?: string[]
  noBoulder?: boolean
  noTasks?: boolean
}) {
  const tempDir = join(tmpdir(), `contract-lock-preparer-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const changeName = "test-change"
  const changeDir = join(tempDir, "changes", changeName)
  const sisyphusDir = join(tempDir, ".sisyphus")

  mkdirSync(changeDir, { recursive: true })

  if (!options.noBoulder) {
    mkdirSync(sisyphusDir, { recursive: true })
    writeFileSync(
      join(sisyphusDir, "boulder.json"),
      JSON.stringify({
        active_plan: `changes/${changeName}/tasks.md`,
        plan_name: changeName,
      })
    )
  }

  if (!options.noTasks && options.tasksContent) {
    writeFileSync(join(changeDir, "tasks.md"), options.tasksContent)
  }

  if (options.contractFiles && options.contractFiles.length > 0) {
    const contractsDir = join(changeDir, "contracts")
    mkdirSync(contractsDir, { recursive: true })
    for (const f of options.contractFiles) {
      writeFileSync(join(contractsDir, f), "// contract test placeholder")
    }
  }

  return { tempDir, changeDir, changeName }
}

describe("Contract Lock Preparer Hook", () => {
  const projects: string[] = []

  afterEach(() => {
    for (const dir of projects) {
      try {
        rmSync(dir, { recursive: true, force: true })
      } catch {
        // ignore cleanup errors
      }
    }
    projects.length = 0
  })

  test("should detect missing contracts when tasks.md has Contract Lock YES", async () => {
    // #given - tasks.md with Contract Lock: Applies: YES and no contracts/
    const { tempDir } = createTestProject({
      tasksContent: `# Tasks: test
### Task 1.1: Something
**Contract Lock:**
- Applies: YES — contracts/foo.contract.ts locks interface
`,
    })
    projects.push(tempDir)

    const hook = createContractLockPreparerHook({ directory: tempDir } as never)
    const input = { tool: "edit", sessionID: `test-${Date.now()}`, callID: "1" }
    const output: {
      args: Record<string, unknown>
      messages?: Array<{ role: string; content: string }>
    } = { args: { filePath: "src/foo.ts" } }

    // #when
    await hook["tool.execute.before"](input, output)

    // #then
    expect(output.messages).toBeDefined()
    expect(output.messages!.length).toBe(1)
    expect(output.messages![0].content).toContain("CONTRACT LOCK REMINDER")
    expect(output.messages![0].content).toContain("contract-lock-writer")
  })

  test("should no-op when tasks.md has no Contract Lock fields", async () => {
    // #given - tasks.md without Contract Lock fields
    const { tempDir } = createTestProject({
      tasksContent: `# Tasks: test
### Task 1.1: Something
**Description:** Just a task with no contract lock
`,
    })
    projects.push(tempDir)

    const hook = createContractLockPreparerHook({ directory: tempDir } as never)
    const input = { tool: "edit", sessionID: `test-${Date.now()}`, callID: "2" }
    const output: {
      args: Record<string, unknown>
      messages?: Array<{ role: string; content: string }>
    } = { args: { filePath: "src/foo.ts" } }

    // #when
    await hook["tool.execute.before"](input, output)

    // #then - no messages injected
    expect(output.messages).toBeUndefined()
  })

  test("should no-op when contracts/ directory has .contract.ts files", async () => {
    // #given - tasks.md with Contract Lock YES and contracts/ exists
    const { tempDir } = createTestProject({
      tasksContent: `# Tasks: test
### Task 1.1: Something
**Contract Lock:**
- Applies: YES — contracts/foo.contract.ts locks interface
`,
      contractFiles: ["foo.contract.ts"],
    })
    projects.push(tempDir)

    const hook = createContractLockPreparerHook({ directory: tempDir } as never)
    const input = { tool: "edit", sessionID: `test-${Date.now()}`, callID: "3" }
    const output: {
      args: Record<string, unknown>
      messages?: Array<{ role: string; content: string }>
    } = { args: { filePath: "src/foo.ts" } }

    // #when
    await hook["tool.execute.before"](input, output)

    // #then - no messages injected
    expect(output.messages).toBeUndefined()
  })

  test("should no-op when no boulder.json exists", async () => {
    // #given - no boulder.json
    const { tempDir } = createTestProject({
      tasksContent: `# Tasks: test
**Contract Lock:**
- Applies: YES
`,
      noBoulder: true,
    })
    projects.push(tempDir)

    const hook = createContractLockPreparerHook({ directory: tempDir } as never)
    const input = { tool: "edit", sessionID: `test-${Date.now()}`, callID: "4" }
    const output: {
      args: Record<string, unknown>
      messages?: Array<{ role: string; content: string }>
    } = { args: { filePath: "src/foo.ts" } }

    // #when
    await hook["tool.execute.before"](input, output)

    // #then - no messages injected
    expect(output.messages).toBeUndefined()
  })

  test("should only remind once per session", async () => {
    // #given - missing contracts
    const { tempDir } = createTestProject({
      tasksContent: `# Tasks: test
**Contract Lock:**
- Applies: YES — locks something
`,
    })
    projects.push(tempDir)

    const sessionId = `test-once-${Date.now()}`
    const hook = createContractLockPreparerHook({ directory: tempDir } as never)

    // First call
    const output1: {
      args: Record<string, unknown>
      messages?: Array<{ role: string; content: string }>
    } = { args: { filePath: "src/foo.ts" } }
    await hook["tool.execute.before"]({ tool: "edit", sessionID: sessionId, callID: "5" }, output1)

    // Second call
    const output2: {
      args: Record<string, unknown>
      messages?: Array<{ role: string; content: string }>
    } = { args: { filePath: "src/bar.ts" } }
    await hook["tool.execute.before"]({ tool: "edit", sessionID: sessionId, callID: "6" }, output2)

    // #then - first call has reminder, second does not
    expect(output1.messages).toBeDefined()
    expect(output1.messages!.length).toBe(1)
    expect(output2.messages).toBeUndefined()
  })

  test("should not trigger on non-edit/write tools", async () => {
    // #given - missing contracts but tool is 'read'
    const { tempDir } = createTestProject({
      tasksContent: `# Tasks: test
**Contract Lock:**
- Applies: YES
`,
    })
    projects.push(tempDir)

    const hook = createContractLockPreparerHook({ directory: tempDir } as never)
    const input = { tool: "read", sessionID: `test-${Date.now()}`, callID: "7" }
    const output: {
      args: Record<string, unknown>
      messages?: Array<{ role: string; content: string }>
    } = { args: { filePath: "src/foo.ts" } }

    // #when
    await hook["tool.execute.before"](input, output)

    // #then
    expect(output.messages).toBeUndefined()
  })
})
