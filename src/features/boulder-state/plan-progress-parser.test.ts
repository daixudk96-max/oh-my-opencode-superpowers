import { describe, expect, test } from "bun:test"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { getPlanProgress } from "./plan-progress-parser"

const PLAN_ROOT = join(tmpdir(), "plan-progress-parser-test")

function writePlan(filename: string, content: string) {
  const path = join(PLAN_ROOT, filename)
  mkdirSync(PLAN_ROOT, { recursive: true })
  writeFileSync(path, content)
  return path
}

describe("plan-progress-parser", () => {
  test("derives phase completion from checkboxes", () => {
    const planPath = writePlan(
      "checkbox-phase.md",
      `## Phase 1: Setup
- [x] Task A
## Phase 2: Follow-up
- [x] Task B
- [ ] Task C
`,
    )

    const progress = getPlanProgress(planPath)
    expect(progress.total).toBe(3)
    expect(progress.completed).toBe(2)
    expect(progress.isComplete).toBe(false)
    expect(progress.phases).toHaveLength(2)
    expect(progress.phases?.[0].status).toBe("complete")
    expect(progress.phases?.[1].status).toBe("in_progress")
  })

  test("marks phase complete when all checkboxes finish", () => {
    const planPath = writePlan(
      "complete-phases.md",
      `## Phase 1: Plan
- [x] Task A
## Phase 2: Execute
- [x] Task B
`,
    )

    const progress = getPlanProgress(planPath)
    expect(progress.isComplete).toBe(true)
    expect(progress.phases?.every((p) => p.status === "complete")).toBe(true)
  })

  test("falls back to explicit status when no checkboxes present", () => {
    const planPath = writePlan(
      "status-phase.md",
      `## Phase 1: Legacy
**Status:** complete
`,
    )

    const progress = getPlanProgress(planPath)
    expect(progress.isComplete).toBe(true)
    expect(progress.phases?.[0].status).toBe("complete")
  })

  test("marks phase pending when no checkboxes or explicit metadata", () => {
    const planPath = writePlan(
      "unknown-phase.md",
      `## Phase 1: Unknown
`,
    )

    const progress = getPlanProgress(planPath)
    expect(progress.isComplete).toBe(false)
    expect(progress.phases?.[0].status).toBe("pending")
  })
})
