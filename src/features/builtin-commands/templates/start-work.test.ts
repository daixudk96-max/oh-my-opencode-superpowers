import { describe, expect, test } from "bun:test"
import { START_WORK_TEMPLATE } from "./start-work"

describe("START_WORK_TEMPLATE", () => {
	test("start-work defines done criteria and verification before reporting", () => {
		expect(START_WORK_TEMPLATE).toContain("define what done looks like before you start the work")
		expect(START_WORK_TEMPLATE).toContain("Before you report a task as done, verify the actual changes with the relevant checks")
		expect(START_WORK_TEMPLATE).toContain("use direct plain language")
	})

	test("start-work keeps plan selection and worktree guidance", () => {
		expect(START_WORK_TEMPLATE).toContain("List available plan files from `changes/`")
		expect(START_WORK_TEMPLATE).toContain("git worktree add <absolute-path> <branch-or-HEAD>")
		expect(START_WORK_TEMPLATE).toContain("`sequential` → use `skill(\"executing-plans\")`")
		expect(START_WORK_TEMPLATE).toContain("`parallel` or `wave` → use `skill(\"wave-parallel-execution\")`")
	})
})
