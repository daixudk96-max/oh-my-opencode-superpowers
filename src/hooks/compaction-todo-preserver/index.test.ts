import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
} from "bun:test";

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { PluginInput } from "@opencode-ai/plugin";
import { createOpencodeClient, type Todo } from "@opencode-ai/sdk";

import { createCompactionTodoPreserverHook } from "./index";
import {
	type BoulderState,
	writeBoulderState,
} from "../../features/boulder-state";

const updateMock = mock(async () => {});

mock.module("opencode/session/todo", () => ({
	Todo: {
		update: updateMock,
	},
}));

afterAll(() => {
	mock.module("opencode/session/todo", () => ({
		Todo: {
			update: async () => {},
		},
	}));
});

function createMockContext(
	todoResponses: Array<Todo>[],
	directory: string,
): PluginInput {
	let callIndex = 0;

	const client = createOpencodeClient({ directory });
	type SessionTodoOptions = Parameters<typeof client.session.todo>[0];
	const request = new Request("http://localhost");
	const response = new Response();
	client.session.todo = mock((_: SessionTodoOptions) => {
		const current =
			todoResponses[Math.min(callIndex, todoResponses.length - 1)] ?? [];
		callIndex += 1;
		return Promise.resolve({
			data: current,
			error: undefined,
			request,
			response,
		});
	}) as typeof client.session.todo;

	return {
		client,
		project: {
			id: "test-project",
			worktree: directory,
			time: { created: Date.now() },
		},
		directory,
		worktree: directory,
		serverUrl: new URL("http://localhost"),
		$: Bun.$,
	};
}

describe("compaction-todo-preserver", () => {
	const testDir = join(tmpdir(), `compaction-todo-preserver-${Date.now()}`);

	beforeEach(() => {
		if (!existsSync(testDir)) {
			mkdirSync(testDir, { recursive: true });
		}
	});

	afterEach(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
	});

	function writePlan(name: string, content: string): string {
		const planDir = join(testDir, "changes", name);
		mkdirSync(planDir, { recursive: true });
		const planPath = join(planDir, "tasks.md");
		writeFileSync(planPath, content);
		return planPath;
	}

	function writeState(state: BoulderState): void {
		writeBoulderState(testDir, state);
	}

	it("restores todos after compaction when missing", async () => {
		//#given
		updateMock.mockClear();
		const sessionID = "session-compaction-missing";
		const todos: Todo[] = [
			{ id: "1", content: "Task 1", status: "pending", priority: "high" },
			{ id: "2", content: "Task 2", status: "in_progress", priority: "medium" },
		];
		const ctx = createMockContext([todos, []], testDir);
		const hook = createCompactionTodoPreserverHook(ctx);

		//#when
		await hook.capture(sessionID);
		await hook.event({
			event: { type: "session.compacted", properties: { sessionID } },
		});

		//#then
		expect(updateMock).toHaveBeenCalledTimes(1);
		expect(updateMock).toHaveBeenCalledWith({ sessionID, todos });
	});

	it("restores manual todos for non-Boulder sessions after compaction", async () => {
		//#given
		updateMock.mockClear();
		const sessionID = "session-compaction-manual-todos";
		const todos: Todo[] = [
			{ id: "manual-1", content: "Manual follow-up", status: "pending", priority: "high" },
		];
		const ctx = createMockContext([todos, []], testDir);
		const hook = createCompactionTodoPreserverHook(ctx);

		//#when
		await hook.capture(sessionID);
		await hook.event({
			event: { type: "session.compacted", properties: { sessionID } },
		});

		//#then
		expect(updateMock).toHaveBeenCalledTimes(1);
		expect(updateMock).toHaveBeenCalledWith({ sessionID, todos });
	});

	it("skips restore when todos already present", async () => {
		//#given
		updateMock.mockClear();
		const sessionID = "session-compaction-present";
		const todos: Todo[] = [
			{ id: "1", content: "Task 1", status: "pending", priority: "high" },
		];
		const ctx = createMockContext([todos, todos], testDir);
		const hook = createCompactionTodoPreserverHook(ctx);

		//#when
		await hook.capture(sessionID);
		await hook.event({
			event: { type: "session.compacted", properties: { sessionID } },
		});

		//#then
		expect(updateMock).not.toHaveBeenCalled();
	});

	it("skips restore and clears snapshot for a completed active plan", async () => {
		//#given
		updateMock.mockClear();
		const sessionID = "session-completed-plan";
		const todos: Todo[] = [
			{ id: "1", content: "Task 1", status: "pending", priority: "high" },
		];
		const planPath = writePlan(
			"completed-plan",
			`# Plan
- [x] 1. Done
`,
		);

		writeState({
			active_plan: planPath,
			started_at: "2026-03-29T00:00:00.000Z",
			session_ids: [sessionID],
			plan_name: "completed-plan",
		});

		const ctx = createMockContext([todos, []], testDir);
		const hook = createCompactionTodoPreserverHook(ctx);

		//#when
		await hook.capture(sessionID);
		await hook.event({
			event: { type: "session.compacted", properties: { sessionID } },
		});
		await hook.event({
			event: { type: "session.compacted", properties: { sessionID } },
		});

		//#then
		expect(updateMock).not.toHaveBeenCalled();
	});

	it("restores todos for an incomplete active plan", async () => {
		//#given
		updateMock.mockClear();
		const sessionID = "session-incomplete-plan";
		const todos: Todo[] = [
			{ id: "1", content: "Task 1", status: "pending", priority: "high" },
		];
		const planPath = writePlan(
			"incomplete-plan",
			`# Plan
- [ ] 1. Remaining task
`,
		);

		writeState({
			active_plan: planPath,
			started_at: "2026-03-29T00:00:00.000Z",
			session_ids: [sessionID],
			plan_name: "incomplete-plan",
		});

		const ctx = createMockContext([todos, []], testDir);
		const hook = createCompactionTodoPreserverHook(ctx);

		//#when
		await hook.capture(sessionID);
		await hook.event({
			event: { type: "session.compacted", properties: { sessionID } },
		});

		//#then
		expect(updateMock).toHaveBeenCalledTimes(1);
		expect(updateMock).toHaveBeenCalledWith({ sessionID, todos });
	});
});
