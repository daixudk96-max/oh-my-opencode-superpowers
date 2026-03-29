import { describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	getFirstIncompleteTask,
	getPlanProgress,
} from "./plan-progress-parser";

const PLAN_ROOT = join(tmpdir(), "plan-progress-parser-test");

function writePlan(filename: string, content: string) {
	const path = join(PLAN_ROOT, filename);
	mkdirSync(PLAN_ROOT, { recursive: true });
	writeFileSync(path, content);
	return path;
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
		);

		const progress = getPlanProgress(planPath);
		expect(progress.total).toBe(3);
		expect(progress.completed).toBe(2);
		expect(progress.isComplete).toBe(false);
		expect(progress.phases).toHaveLength(2);
		expect(progress.phases?.[0].status).toBe("complete");
		expect(progress.phases?.[1].status).toBe("in_progress");
	});

	test("marks phase complete when all checkboxes finish", () => {
		const planPath = writePlan(
			"complete-phases.md",
			`## Phase 1: Plan
- [x] Task A
## Phase 2: Execute
- [x] Task B
`,
		);

		const progress = getPlanProgress(planPath);
		expect(progress.isComplete).toBe(true);
		expect(progress.phases?.every((p) => p.status === "complete")).toBe(true);
	});

	test("keeps flat top-level plans counting normally", () => {
		const planPath = writePlan(
			"flat-top-level.md",
			`- [x] Task A
- [ ] Task B
- [x] Task C
`,
		);

		const progress = getPlanProgress(planPath);
		expect(progress.total).toBe(3);
		expect(progress.completed).toBe(2);
		expect(progress.isComplete).toBe(false);
	});

	test("ignores nested checklist rows when top-level work is complete", () => {
		const planPath = writePlan(
			"nested-checklists.md",
			`## Phase 1: Build
- [x] Ship parser fix
  - [ ] Acceptance: add docs
  - [ ] QA: rerun stale fixture
`,
		);

		const progress = getPlanProgress(planPath);
		expect(progress.total).toBe(1);
		expect(progress.completed).toBe(1);
		expect(progress.isComplete).toBe(true);
		expect(progress.phases?.[0].status).toBe("complete");
	});

	test("counts final-wave F-tasks as actionable top-level work", () => {
		const planPath = writePlan(
			"final-wave.md",
			`- [x] F1. Reproduce bug
- [x] F2. Update parser
- [ ] F3. Verify counts
- [ ] F4. Record results
`,
		);

		const progress = getPlanProgress(planPath);
		expect(progress.total).toBe(4);
		expect(progress.completed).toBe(2);
		expect(progress.isComplete).toBe(false);
	});

	test("keeps first incomplete task behavior for flat plans", () => {
		const planPath = writePlan(
			"flat-first-incomplete.md",
			`- [x] Task A
- [ ] Task B
- [ ] Task C
`,
		);

		expect(getFirstIncompleteTask(planPath)).toBe("Task B");
	});

	test("returns null when only nested checklist rows remain unchecked", () => {
		const planPath = writePlan(
			"nested-first-incomplete-null.md",
			`## Phase 1: Build
- [x] Ship parser fix
  - [ ] Acceptance: add docs
  - [ ] QA: rerun stale fixture
`,
		);

		expect(getFirstIncompleteTask(planPath)).toBeNull();
	});

	test("skips nested checklist rows and returns next top-level task", () => {
		const planPath = writePlan(
			"nested-first-incomplete-next.md",
			`## Phase 1: Build
- [x] Ship parser fix
  - [ ] Acceptance: add docs
  - [ ] QA: rerun stale fixture
- [ ] 2. Verify counts
`,
		);

		expect(getFirstIncompleteTask(planPath)).toBe("Verify counts");
	});

	test("falls back to explicit status when no checkboxes present", () => {
		const planPath = writePlan(
			"status-phase.md",
			`## Phase 1: Legacy
**Status:** complete
`,
		);

		const progress = getPlanProgress(planPath);
		expect(progress.isComplete).toBe(true);
		expect(progress.phases?.[0].status).toBe("complete");
	});

	test("marks phase pending when no checkboxes or explicit metadata", () => {
		const planPath = writePlan(
			"unknown-phase.md",
			`## Phase 1: Unknown
`,
		);

		const progress = getPlanProgress(planPath);
		expect(progress.isComplete).toBe(false);
		expect(progress.phases?.[0].status).toBe("pending");
	});
});
