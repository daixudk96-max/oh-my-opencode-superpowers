import { describe, expect, test } from "bun:test"
import { START_WORK_TEMPLATE } from "./start-work"

describe("START_WORK_TEMPLATE", () => {
	test("includes execution-oriented reporting guidance", () => {
		expect(START_WORK_TEMPLATE).toContain(
			"Use direct language in execution updates.",
		)
		expect(START_WORK_TEMPLATE).toContain(
			"Define done in concrete terms before you report completion.",
		)
		expect(START_WORK_TEMPLATE).toContain(
			"Verify the relevant files, tests, or outputs before you say work is done.",
		)
	})

	test("preserves worktree and execution mode semantics", () => {
		expect(START_WORK_TEMPLATE).toContain(
			"If omitted: auto-select by remaining task count (`>5` = Wave-Parallel, otherwise Sequential)",
		)
		expect(START_WORK_TEMPLATE).toContain(
			"Always set worktree_path in boulder.json before executing any tasks",
		)
		expect(START_WORK_TEMPLATE).toContain(
			"Preserve the selected execution mode: `sequential` uses `skill(\"executing-plans\")`; `parallel` and `wave` use `skill(\"wave-parallel-execution\")`",
		)
	})
})
