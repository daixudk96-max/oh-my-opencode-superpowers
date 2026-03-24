import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { clearBoulderState, readBoulderState, writeBoulderState } from "../../features/boulder-state"
import type { BoulderState } from "../../features/boulder-state"

const { createAtlasHook } = await import("./index")

describe("atlas hook idle-event completion guard", () => {
  const SESSION_ID = "atlas-complete-session"
  let testDirectory = ""
  let promptCalls: unknown[] = []

  beforeEach(() => {
    testDirectory = join(tmpdir(), `atlas-idle-completion-${randomUUID()}`)
    if (!existsSync(testDirectory)) {
      mkdirSync(testDirectory, { recursive: true })
    }
    promptCalls = []
    clearBoulderState(testDirectory)
  })

  afterEach(() => {
    clearBoulderState(testDirectory)
    if (existsSync(testDirectory)) {
      rmSync(testDirectory, { recursive: true, force: true })
    }
  })

  function createHook() {
    return createAtlasHook({
      directory: testDirectory,
      client: {
        session: {
          get: async () => ({ data: { parentID: undefined } }),
          messages: async () => ({ data: [] }),
          prompt: async (input: unknown) => {
            promptCalls.push(input)
            return { data: {} }
          },
          promptAsync: async (input: unknown) => {
            promptCalls.push(input)
            return { data: {} }
          },
        },
      },
    } as unknown as Parameters<typeof createAtlasHook>[0])
  }

  function writeBoulderStateForPlan(planName: string, content: string) {
    const planPath = join(testDirectory, `${planName}.md`)
    writeFileSync(planPath, content)
    const state: BoulderState = {
      active_plan: planPath,
      started_at: new Date().toISOString(),
      session_ids: [SESSION_ID],
      plan_name: planName,
    }
    writeBoulderState(testDirectory, state)
  }

  it("skips continuation when plan is complete via checkbox-driven phases", async () => {
    writeBoulderStateForPlan(
      "complete-plan",
      `## Phase 1: Setup
- [x] Task A
## Phase 2: Follow-up
- [x] Task B
`,
    )

    const hook = createHook()
    await hook.handler({ event: { type: "session.idle", properties: { sessionID: SESSION_ID } } })

    expect(promptCalls.length).toBe(0)
    expect(readBoulderState(testDirectory)?.session_ids.includes(SESSION_ID)).toBe(true)
  })

  it("still injects when plan has unchecked work", async () => {
    writeBoulderStateForPlan(
      "incomplete-plan",
      `## Phase 1: Setup
- [ ] Task A
- [x] Task B
`,
    )

    const hook = createHook()
    await hook.handler({ event: { type: "session.idle", properties: { sessionID: SESSION_ID } } })

    expect(promptCalls.length).toBeGreaterThan(0)
  })
})
