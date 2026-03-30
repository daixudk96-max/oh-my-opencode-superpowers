import { describe, expect, test } from "bun:test"
import { resolve } from "node:path"

import { classifyPlannerPath, isAllowedFile, isPlanFile } from "./path-policy"

describe("prometheus path policy", () => {
  const workspaceRoot = resolve("planner-path-policy-root")

  test("allows root changes markdown files and detects plan files", () => {
    const planPath = resolve(workspaceRoot, "changes/feature/tasks.md")
    const draftPath = resolve(workspaceRoot, "Changes/feature/proposal.md")
    const notesPath = resolve(workspaceRoot, "changes/feature/notes.md")

    expect(classifyPlannerPath(planPath, workspaceRoot)).toBe("plan")
    expect(classifyPlannerPath(draftPath, workspaceRoot)).toBe("draft")
    expect(classifyPlannerPath(notesPath, workspaceRoot)).toBe("changes-md")
    expect(isAllowedFile(planPath, workspaceRoot)).toBe(true)
    expect(isPlanFile(planPath, workspaceRoot)).toBe(true)
  })

  test("allows root docs markdown files only", () => {
    const docsPath = resolve(workspaceRoot, "docs/guide/overview.md")
    const nestedLookalike = resolve(workspaceRoot, "src/docs/overview.md")

    expect(classifyPlannerPath(docsPath, workspaceRoot)).toBe("docs-md")
    expect(isAllowedFile(docsPath, workspaceRoot)).toBe(true)
    expect(classifyPlannerPath(nestedLookalike, workspaceRoot)).toBe("forbidden")
  })

  test("allows only the exact boulder state and run-continuation json files", () => {
    const boulderPath = resolve(workspaceRoot, ".sisyphus/boulder.json")
    const continuationPath = resolve(workspaceRoot, ".sisyphus/run-continuation/ses_123.json")
    const boulderVerifyPath = resolve(workspaceRoot, ".sisyphus/boulder.json.verify")
    const otherSisyphusPath = resolve(workspaceRoot, ".sisyphus/plans/plan.md")

    expect(classifyPlannerPath(boulderPath, workspaceRoot)).toBe("boulder-state")
    expect(classifyPlannerPath(continuationPath, workspaceRoot)).toBe("run-continuation")
    expect(classifyPlannerPath(boulderVerifyPath, workspaceRoot)).toBe("forbidden")
    expect(classifyPlannerPath(otherSisyphusPath, workspaceRoot)).toBe("forbidden")
  })

  test("rejects nested changes lookalikes and traversal attempts", () => {
    const nestedChangesPath = resolve(workspaceRoot, "src/changes/feature/tasks.md")
    const outsidePath = resolve(workspaceRoot, "../docs/outside.md")

    expect(classifyPlannerPath(nestedChangesPath, workspaceRoot)).toBe("forbidden")
    expect(classifyPlannerPath(outsidePath, workspaceRoot)).toBe("forbidden")
    expect(isAllowedFile(outsidePath, workspaceRoot)).toBe(false)
  })
})
