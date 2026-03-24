import { afterEach, describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { writeBoulderState, BoulderState } from "../../features/boulder-state"
import { getContinuationState } from "./continuation-state"

const tempDirs: string[] = []

function createTempDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "omo-run-cont-state-"))
  tempDirs.push(directory)
  return directory
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const directory = tempDirs.pop()
    if (directory) {
      rmSync(directory, { recursive: true, force: true })
    }
  }
})

function writePlan(directory: string, name: string, content: string): string {
  const path = join(directory, `${name}.md`)
  writeFileSync(path, content)
  return path
}

describe("getContinuationState boulder flag", () => {
  const sessionID = "run-boulder-session"

  function seedBoulder(directory: string, planPath: string) {
    const state: BoulderState = {
      active_plan: planPath,
      started_at: new Date().toISOString(),
      session_ids: [sessionID],
      plan_name: "test-plan",
    }
    writeBoulderState(directory, state)
  }

  it("reports no active boulder when all tasks in phases are checked", () => {
    const directory = createTempDir()
    const planPath = writePlan(
      directory,
      "complete-plan",
      `## Phase 1: Setup
- [x] First Task
## Phase 2: Finalize
- [x] Second Task
`,
    )
    seedBoulder(directory, planPath)

    const state = getContinuationState(directory, sessionID)
    expect(state.hasActiveBoulder).toBe(false)
  })

  it("reports active boulder when phase work remains", () => {
    const directory = createTempDir()
    const planPath = writePlan(
      directory,
      "incomplete-plan",
      `## Phase 1: Setup
- [x] First Task
- [ ] Second Task
`,
    )
    seedBoulder(directory, planPath)

    const state = getContinuationState(directory, sessionID)
    expect(state.hasActiveBoulder).toBe(true)
  })
})
