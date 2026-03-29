# Findings

## Initial Findings

- Stale continuation is built from session todo state, not directly from `tasks.md`.
- `/start-work` seeds incomplete plan tasks into session todo, which can outlive the authoritative plan state.
- Compaction restore can replay obsolete todo snapshots unless guarded by plan freshness.
- Task 1 helper can stay read-only by composing `readBoulderState(directory)` with `getPlanProgress(active_plan).isComplete` and a `session_ids.includes(sessionID)` membership check.
- `src/features/boulder-state/index.ts` already acts as a barrel-only entrypoint, so exporting the new helper there is the minimal convention-preserving wire-up.
- Task 2 can stay hook-local by accepting only `directory`, `sessionID`, and a `Pick<SessionStateStore, "resetContinuationProgress">` instead of the full store surface.
- The completed-plan guard should perform exactly one side effect: reset continuation progress on the completed-plan skip path, leaving todo fetching and marker writes to later integration tasks.
- `completed-plan-guard.test.ts` can reuse Task 1's temporary `changes/<plan>/tasks.md` fixture pattern and verify the reset side effect with a tiny mock store instead of constructing full session state.
- `compaction-todo-preserver` must gate restore before `Todo.update`; otherwise compaction can replay stale plan-backed rows even after the authoritative Boulder plan is complete.
- The completed-plan compaction branch should only delete the hook's in-memory snapshot for that session; broader todo cleanup is unnecessary and would risk touching manual or unrelated session rows.
- The compaction restore tests can cover snapshot clearing by firing `session.compacted` twice for a completed tracked session and asserting restore never happens.
- Task 3 only needs the completed-plan guard at two fresh-todo decision points: immediately after idle-time todo fetch and immediately after injection-time todo re-fetch.
- Reusing the same guard in both paths keeps `/stop-continuation` semantics unchanged while still blocking stale reinjection after the stop flag clears on the next user message.
- Regression coverage can stay local by creating temporary Boulder plan fixtures inside the existing todo-continuation-enforcer tests rather than introducing broader task-sync fixtures.
- Task 5 replay hardening can stay entirely in existing suites by adding one idle-path regression for completed plans with compaction-only message history, one active incomplete-plan positive regression, and one non-Boulder manual-todo regression.
- The completed-plan compaction-history regression should clear `skipAgents` in the hook test so the assertion depends on the completed-plan guard rather than the existing compaction-agent skip path.
- Session-state stagnation behavior does not need production changes; a focused regression in `session-state.regression.test.ts` is enough to lock the pre-existing unchanged-todo counting path.
- Non-Boulder compaction preservation still restores manual/unrelated todos, so an explicit restore regression in `compaction-todo-preserver/index.test.ts` protects against accidental blanket suppression.
- The repeated `BOULDER CONTINUATION` banner is a separate bug from the stale TODO continuation fix: `src/features/boulder-state/plan-progress-parser.ts` counts every checkbox line with `CHECKED_REGEX` / `UNCHECKED_REGEX`, including nested Acceptance Criteria and QA checklist rows.
- Reproducing `getPlanProgress('changes/fix-stale-todo-continuation-injection/tasks.md')` currently returns `{ total: 26, completed: 9, isComplete: false }`, which matches the bogus `9/26 completed, 17 remaining` continuation banner.
- `src/hooks/atlas/idle-event.ts` uses `getPlanProgress(...)` to decide whether Boulder work is complete, and `src/hooks/atlas/boulder-continuation-injector.ts` renders the same `total` / `remaining` counts into the injected prompt, so restart cannot permanently solve the issue because the file is re-parsed on each idle pass.
- The previous fix path is still healthy: targeted verification passed for `plan-progress-parser.test.ts`, `todo-continuation-enforcer`, `compaction-todo-preserver/index.test.ts`, and `bun run typecheck`.
- A tactical mitigation is now in place: the Boulder continuation prompt explicitly tells the operator to finish relevant nested checklist boxes or move leftover work into a new plan, reducing repeat loops caused by checklist bookkeeping.
