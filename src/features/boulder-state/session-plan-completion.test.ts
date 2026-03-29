import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { hasCompletedActivePlanForSession } from "./session-plan-completion"
import { writeBoulderState } from "./storage"
import type { BoulderState } from "./types"

describe("session-plan-completion", () => {
  const testDir = join(tmpdir(), `session-plan-completion-${Date.now()}`)

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

  test("returns false when no boulder state exists", () => {
    expect(hasCompletedActivePlanForSession(testDir, "ses-1")).toBe(false)
  })

  test("returns false for a foreign session", () => {
    const planPath = writePlan(
      "foreign-session",
      `# Plan
- [x] 1. Done
`,
    )

    writeState({
      active_plan: planPath,
      started_at: "2026-03-29T00:00:00.000Z",
      session_ids: ["ses-owner"],
      plan_name: "foreign-session",
    })

    expect(hasCompletedActivePlanForSession(testDir, "ses-foreign")).toBe(false)
  })

  test("returns false for an incomplete active plan", () => {
    const planPath = writePlan(
      "incomplete-plan",
      `# Plan
- [ ] 1. Remaining task
`,
    )

    writeState({
      active_plan: planPath,
      started_at: "2026-03-29T00:00:00.000Z",
      session_ids: ["ses-1"],
      plan_name: "incomplete-plan",
    })

    expect(hasCompletedActivePlanForSession(testDir, "ses-1")).toBe(false)
  })

  test("returns true for a tracked session with a completed active plan", () => {
    const planPath = writePlan(
      "completed-plan",
      `# Plan
- [x] 1. Done
`,
    )

    writeState({
      active_plan: planPath,
      started_at: "2026-03-29T00:00:00.000Z",
      session_ids: ["ses-1", "ses-2"],
      plan_name: "completed-plan",
    })

    expect(hasCompletedActivePlanForSession(testDir, "ses-2")).toBe(true)
  })
})
