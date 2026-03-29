import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { writeBoulderState } from "../../features/boulder-state/storage"
import type { BoulderState } from "../../features/boulder-state/types"
import { OMO_INTERNAL_INITIATOR_MARKER } from "../../shared/internal-initiator-marker"
import { injectContinuation } from "./continuation-injection"

describe("injectContinuation", () => {
  const testDir = join(tmpdir(), `continuation-injection-${Date.now()}`)

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  function writePlan(name: string, content: string): string {
    const planDir = join(testDir, "changes", name)
    mkdirSync(planDir, { recursive: true })
    const planPath = join(planDir, "tasks.md")
    writeFileSync(planPath, content)
    return planPath
  }

  function writeState(state: BoulderState): void {
    writeBoulderState(testDir, state)
  }

  test("inherits tools from resolved message info when reinjecting", async () => {
    // given
    let capturedTools: Record<string, boolean> | undefined
    let capturedText: string | undefined
    const ctx = {
      directory: "/tmp/test",
      client: {
        session: {
          todo: async () => ({ data: [{ id: "1", content: "todo", status: "pending", priority: "high" }] }),
          promptAsync: async (input: {
            body: {
              tools?: Record<string, boolean>
              parts?: Array<{ type: string; text: string }>
            }
          }) => {
            capturedTools = input.body.tools
            capturedText = input.body.parts?.[0]?.text
            return {}
          },
        },
      },
    }
    const sessionStateStore = {
      getExistingState: () => ({ inFlight: false, lastInjectedAt: 0, consecutiveFailures: 0 }),
    }

    // when
    await injectContinuation({
      ctx: ctx as never,
      sessionID: "ses_continuation_tools",
      resolvedInfo: {
        agent: "Hephaestus",
        model: { providerID: "openai", modelID: "gpt-5.3-codex" },
        tools: { question: "deny", bash: "allow" },
      },
      sessionStateStore: sessionStateStore as never,
    })

    // then
    expect(capturedTools).toEqual({ question: false, bash: true })
    expect(capturedText).toContain(OMO_INTERNAL_INITIATOR_MARKER)
  })

  test("skips stale prompt injection for a completed active plan", async () => {
    let promptCallCount = 0
    let resetCallCount = 0
    const sessionID = "ses-completed-injection"
    const planPath = writePlan(
      "completed-injection",
      `# Plan
- [x] 1. Done
`,
    )

    writeState({
      active_plan: planPath,
      started_at: "2026-03-29T00:00:00.000Z",
      session_ids: [sessionID],
      plan_name: "completed-injection",
    })

    const ctx = {
      directory: testDir,
      client: {
        session: {
          todo: async () => ({ data: [{ id: "1", content: "stale todo", status: "pending", priority: "high" }] }),
          promptAsync: async () => {
            promptCallCount += 1
            return {}
          },
        },
      },
    }

    await injectContinuation({
      ctx: ctx as never,
      sessionID,
      resolvedInfo: {
        agent: "Sisyphus",
        model: { providerID: "openai", modelID: "gpt-5.4" },
      },
      sessionStateStore: {
        getExistingState: () => ({ inFlight: false, lastInjectedAt: 0, consecutiveFailures: 0 }),
        resetContinuationProgress: () => {
          resetCallCount += 1
        },
      } as never,
    })

    expect(promptCallCount).toBe(0)
    expect(resetCallCount).toBe(1)
  })

  test("keeps injecting normally for an incomplete active plan", async () => {
    let capturedText: string | undefined
    let resetCallCount = 0
    const sessionID = "ses-incomplete-injection"
    const planPath = writePlan(
      "incomplete-injection",
      `# Plan
- [ ] 1. Remaining
`,
    )

    writeState({
      active_plan: planPath,
      started_at: "2026-03-29T00:00:00.000Z",
      session_ids: [sessionID],
      plan_name: "incomplete-injection",
    })

    const ctx = {
      directory: testDir,
      client: {
        session: {
          todo: async () => ({ data: [{ id: "1", content: "stale todo", status: "pending", priority: "high" }] }),
          promptAsync: async (input: { body: { parts?: Array<{ type: string; text: string }> } }) => {
            capturedText = input.body.parts?.[0]?.text
            return {}
          },
        },
      },
    }

    await injectContinuation({
      ctx: ctx as never,
      sessionID,
      resolvedInfo: {
        agent: "Sisyphus",
        model: { providerID: "openai", modelID: "gpt-5.4" },
      },
      sessionStateStore: {
        getExistingState: () => ({ inFlight: false, lastInjectedAt: 0, consecutiveFailures: 0 }),
        resetContinuationProgress: () => {
          resetCallCount += 1
        },
      } as never,
    })

    expect(capturedText).toContain("[Status: 0/1 completed, 1 remaining]")
    expect(resetCallCount).toBe(0)
  })
})
