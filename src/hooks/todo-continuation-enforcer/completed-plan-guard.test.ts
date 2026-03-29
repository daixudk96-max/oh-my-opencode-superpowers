import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { writeBoulderState } from "../../features/boulder-state/storage"
import type { BoulderState } from "../../features/boulder-state/types"

import { shouldSkipStaleContinuationForCompletedPlan } from "./completed-plan-guard"

describe("completed-plan-guard", () => {
  const testDir = join(tmpdir(), `completed-plan-guard-${Date.now()}`)

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

  test("given a completed active plan, resets progress and skips stale continuation", () => {
    const resetCalls: string[] = []
    const sessionID = "ses-completed"
    const planPath = writePlan(
      "completed-plan",
      `# Plan
- [x] 1. Done
`,
    )

    writeState({
      active_plan: planPath,
      started_at: "2026-03-29T00:00:00.000Z",
      session_ids: [sessionID],
      plan_name: "completed-plan",
    })

    const shouldSkip = shouldSkipStaleContinuationForCompletedPlan(testDir, sessionID, {
      resetContinuationProgress: (receivedSessionID) => {
        resetCalls.push(receivedSessionID)
      },
    })

    expect(shouldSkip).toBe(true)
    expect(resetCalls).toEqual([sessionID])
  })

  test("given an incomplete active plan, does not reset progress or skip continuation", () => {
    const resetCalls: string[] = []
    const sessionID = "ses-incomplete"
    const planPath = writePlan(
      "incomplete-plan",
      `# Plan
- [ ] 1. Remaining task
`,
    )

    writeState({
      active_plan: planPath,
      started_at: "2026-03-29T00:00:00.000Z",
      session_ids: [sessionID],
      plan_name: "incomplete-plan",
    })

    const shouldSkip = shouldSkipStaleContinuationForCompletedPlan(testDir, sessionID, {
      resetContinuationProgress: (receivedSessionID) => {
        resetCalls.push(receivedSessionID)
      },
    })

    expect(shouldSkip).toBe(false)
    expect(resetCalls).toEqual([])
  })
})
