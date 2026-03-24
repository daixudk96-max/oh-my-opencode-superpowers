import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { _resetForTesting, subagentSessions } from "../../features/claude-code-session-state"
import { createBoulderGatingWrapper } from "./boulder-gating-wrapper"
import { createContinuationMaxRetriesWrapper } from "./continuation-max-retries-wrapper"

const tempDirs: string[] = []

function createTempProjectDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "atlas-wrapper-"))
  tempDirs.push(dir)
  return dir
}

function writeBoulderState(directory: string, state: Record<string, unknown>): void {
  const sisyphusDir = join(directory, ".sisyphus")
  mkdirSync(sisyphusDir, { recursive: true })
  writeFileSync(join(sisyphusDir, "boulder.json"), JSON.stringify(state, null, 2), "utf8")
}

afterEach(() => {
  _resetForTesting()
  for (const dir of tempDirs.splice(0)) {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      // best effort cleanup only
    }
  }
})

describe("createBoulderGatingWrapper", () => {
  test("skips idle event when boulder state has no active_plan", async () => {
    //#given
    const directory = createTempProjectDir()
    writeBoulderState(directory, {
      active_plan: "",
      started_at: new Date().toISOString(),
      session_ids: ["ses-1"],
      plan_name: "demo",
    })

    let callCount = 0
    const wrapped = createBoulderGatingWrapper({
      ctx: { directory } as never,
      handler: async () => {
        callCount += 1
      },
    })

    //#when
    await wrapped({ event: { type: "session.idle", properties: { sessionID: "ses-1" } } })

    //#then
    expect(callCount).toBe(0)
  })

  test("passes through when boulder session has active_plan", async () => {
    //#given
    const directory = createTempProjectDir()
    writeBoulderState(directory, {
      active_plan: "changes/demo/tasks.md",
      started_at: new Date().toISOString(),
      session_ids: ["ses-2"],
      plan_name: "demo",
    })

    let callCount = 0
    const wrapped = createBoulderGatingWrapper({
      ctx: { directory } as never,
      handler: async () => {
        callCount += 1
      },
    })

    //#when
    await wrapped({ event: { type: "session.idle", properties: { sessionID: "ses-2" } } })

    //#then
    expect(callCount).toBe(1)
  })

  test("blocks idle event for child session tracked as subagent", async () => {
    //#given
    const directory = createTempProjectDir()
    writeBoulderState(directory, {
      active_plan: "changes/demo/tasks.md",
      started_at: new Date().toISOString(),
      session_ids: ["ses-parent"],
      plan_name: "demo",
    })
    subagentSessions.add("ses-child")

    let callCount = 0
    const wrapped = createBoulderGatingWrapper({
      ctx: { directory } as never,
      handler: async () => {
        callCount += 1
      },
    })

    //#when
    await wrapped({ event: { type: "session.idle", properties: { sessionID: "ses-child" } } })

    //#then
    expect(callCount).toBe(0)
  })
})

describe("createContinuationMaxRetriesWrapper", () => {
  test("blocks idle continuation when prompt failure count reached max", async () => {
    //#given
    let callCount = 0
    const wrapped = createContinuationMaxRetriesWrapper({
      handler: async () => {
        callCount += 1
      },
      getState: () => ({ promptFailureCount: 5 }),
      maxRetries: 5,
    })

    //#when
    await wrapped({ event: { type: "session.idle", properties: { sessionID: "ses-3" } } })

    //#then
    expect(callCount).toBe(0)
  })

  test("passes through idle continuation below max retry threshold", async () => {
    //#given
    let callCount = 0
    const wrapped = createContinuationMaxRetriesWrapper({
      handler: async () => {
        callCount += 1
      },
      getState: () => ({ promptFailureCount: 1 }),
      maxRetries: 5,
    })

    //#when
    await wrapped({ event: { type: "session.idle", properties: { sessionID: "ses-4" } } })

    //#then
    expect(callCount).toBe(1)
  })
})
