# Fix stale TODO continuation injection

## TL;DR
> **Summary**: Prevent `todo-continuation-enforcer` from re-injecting stale plan-backed TODO prompts after the authoritative plan is already complete.
> **Deliverables**:
> - Active-plan completion helper shared from Boulder state
> - Completed-plan continuation guard for `todo-continuation-enforcer`
> - Completed-plan restore guard for `compaction-todo-preserver`
> - Regression coverage for idle, compaction, and next-user-message replay paths
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 3 -> Task 5

## Context
### Original Request
- User confirmed the old hook umbrella plan is already complete and asked for systematic debugging first, then a new execution plan for the stale TODO continuation bug.

### Interview Summary
- The old plan `fix-hooks-and-downstream-from-baseline` is complete and must stay closed.
- The repeated `[SYSTEM DIRECTIVE: OH-MY-OPENCODE - TODO CONTINUATION]` block is stale state, not real unfinished hook work.
- The bug to fix is: session TODO state still reports old incomplete items, so `todo-continuation-enforcer` keeps injecting continuation even after the authoritative plan is complete.
- This fix must be isolated in a new change and must not reopen the completed hook umbrella plan.

### Metis Review (gaps addressed)
- Preserve manual/unrelated todos; do not blanket-delete unmatched rows.
- Cover the next-user-message replay path because `stop-continuation` suppression clears on chat activity.
- Cover compaction restore because stale snapshots can recreate the stale source even after plan completion.
- Keep Atlas/Boulder parsing narrow: use it only as a freshness check for plan-backed sessions, not as a replacement continuation source.

## Work Objectives
### Core Objective
Stop stale TODO continuation injection for sessions whose active Boulder plan is already complete, while preserving normal continuation behavior for genuinely active todos and leaving unrelated manual todos untouched.

### Deliverables
- `src/features/boulder-state/session-plan-completion.ts`
- `src/features/boulder-state/session-plan-completion.test.ts`
- `src/hooks/todo-continuation-enforcer/completed-plan-guard.ts`
- `src/hooks/todo-continuation-enforcer/completed-plan-guard.test.ts`
- updates to `src/hooks/todo-continuation-enforcer/idle-event.ts`
- updates to `src/hooks/todo-continuation-enforcer/continuation-injection.ts`
- updates to `src/hooks/todo-continuation-enforcer/todo-continuation-enforcer.test.ts`
- updates to `src/hooks/todo-continuation-enforcer/continuation-injection.test.ts`
- updates to `src/hooks/compaction-todo-preserver/hook.ts`
- updates to `src/hooks/compaction-todo-preserver/index.test.ts`

### Definition of Done (verifiable conditions with commands)
- `bun test src/features/boulder-state/session-plan-completion.test.ts`
- `bun test src/hooks/todo-continuation-enforcer/completed-plan-guard.test.ts`
- `bun test src/hooks/todo-continuation-enforcer`
- `bun test src/hooks/compaction-todo-preserver/index.test.ts`
- `bun run typecheck`
- No stale continuation prompt is injected in tests when:
  - the session is tracked by Boulder,
  - the active plan is complete,
  - session TODOs still contain old incomplete rows.

### Must Have
- Root-cause fix in the continuation read path, not just markdown bookkeeping.
- A shared helper that determines whether a session belongs to a completed active Boulder plan.
- A hook-local guard that blocks stale continuation both before countdown and immediately before prompt injection.
- A compaction restore guard that refuses to replay stale snapshots for completed active plans.
- Regression coverage for:
  - completed active plan + stale session todos
  - incomplete active plan + valid continuation
  - compaction restore after plan completion
  - next user message after `stop-continuation` clear

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Must NOT reopen `changes/fix-hooks-and-downstream-from-baseline/tasks.md`.
- Must NOT redesign `todo-continuation-enforcer` around `tasks.md` parsing as its primary source of truth.
- Must NOT change global hook ordering in `src/plugin/event.ts` unless a newly added failing test proves ordering is the root cause.
- Must NOT widen into unrelated hook cluster repairs.
- Must NOT edit `src/tools/task/todo-sync.ts` in this change unless a new failing regression proves the task-system sync path participates in the stale reproduction.
- Must NOT delete manual/id-less todos just because a Boulder plan completed.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: TDD with Bun test suites and targeted regressions.
- QA policy: Every implementation task includes exact Bun commands and expected binary outcomes.
- Evidence: `changes/fix-stale-todo-continuation-injection/evidence/task-{N}-{slug}.txt`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. Extract shared dependencies first.

Wave 1: shared freshness helper
- Task 1: session-plan completion helper

Wave 2: completed-plan guards
- Task 2: hook-local completed-plan guard helper
- Task 4: compaction restore guard

Wave 3: hook integration and regression matrix
- Task 3: todo-continuation-enforcer integration
- Task 5: non-regression matrix for replay paths

### Dependency Matrix (full, all tasks)
- Task 1 -> blocks Tasks 2, 3, 4, 5
- Task 2 -> blocked by Task 1; blocks Task 3 and Task 5
- Task 3 -> blocked by Tasks 1 and 2; blocks Task 5
- Task 4 -> blocked by Task 1; blocks Task 5
- Task 5 -> blocked by Tasks 2, 3, and 4
- Final Verification Wave -> blocked by Tasks 1-5

### Agent Dispatch Summary (wave -> task count -> categories)
- Wave 1 -> 1 task -> `unspecified-high`
- Wave 2 -> 2 tasks -> `unspecified-high`
- Wave 3 -> 2 tasks -> `unspecified-high`
- Final Verification -> 4 review tasks -> `oracle`, `unspecified-high`, `unspecified-high`, `deep`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add a reusable active-plan completion helper for Boulder-tracked sessions

  **What to do**:
  - Create `src/features/boulder-state/session-plan-completion.ts`.
  - Export a pure helper that returns `true` only when ALL of these are true:
    - `readBoulderState(directory)` exists,
    - `active_plan` is a non-empty string,
    - `sessionID` is included in `session_ids`,
    - `getPlanProgress(active_plan).isComplete === true`.
  - Add `src/features/boulder-state/session-plan-completion.test.ts` covering:
    - no boulder state -> false
    - foreign session -> false
    - incomplete active plan -> false
    - completed active plan for tracked session -> true
  - Keep this helper read-only: no marker writes, no session todo writes, no implicit cleanup.

  **Must NOT do**:
  - Do NOT mutate boulder state or continuation markers here.
  - Do NOT parse todo lists here.
  - Do NOT fold this logic into `plan-progress-parser.ts`; keep it as a separate focused module.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: cross-feature TypeScript logic with tests
  - Skills: `[]` - no extra skill required
  - Omitted: `['git-master']` - no git action in this task

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 4, 5 | Blocked By: none

  **References**:
  - Pattern: `src/features/boulder-state/plan-progress-parser.ts:64-115` - authoritative plan completion logic already exists here
  - Pattern: `src/hooks/start-work/start-work-hook.ts:99-123` - active plan selection already relies on `getPlanProgress(...)`
  - Pattern: `src/hooks/start-work/start-work-hook.ts:151-170` - tracked Boulder sessions are stored in `session_ids`
  - Pattern: `src/features/boulder-state/prometheus-plan-discovery.ts:8-55` - current changes/* plan naming and path conventions

  **Acceptance Criteria**:
  - [x] `session-plan-completion.ts` exists and is the only new Boulder-state helper added for this change
  - [x] `session-plan-completion.test.ts` covers all four truth-table cases above
  - [x] `bun test src/features/boulder-state/session-plan-completion.test.ts` exits `0`

  **QA Scenarios**:
  ```
  Scenario: Completed tracked session returns true
    Tool: Bash
    Steps: Run `bun test src/features/boulder-state/session-plan-completion.test.ts`
    Expected: The completed-plan tracked-session case passes and the suite exits 0
    Evidence: changes/fix-stale-todo-continuation-injection/evidence/task-1-session-plan-completion.txt

  Scenario: Incomplete or foreign session returns false
    Tool: Bash
    Steps: Run `bun test src/features/boulder-state/session-plan-completion.test.ts`
    Expected: The incomplete-plan and foreign-session cases pass and the suite exits 0
    Evidence: changes/fix-stale-todo-continuation-injection/evidence/task-1-session-plan-completion-edge.txt
  ```

  **Commit**: NO | Message: `fix(todo): add completed-plan session guard helper` | Files: `src/features/boulder-state/session-plan-completion.ts`, `src/features/boulder-state/session-plan-completion.test.ts`

- [x] 2. Add a hook-local completed-plan guard for stale continuation decisions

  **What to do**:
  - Create `src/hooks/todo-continuation-enforcer/completed-plan-guard.ts`.
  - The guard must wrap Task 1's helper and expose a narrow hook-facing decision API for `todo-continuation-enforcer`.
  - The guard must:
    - accept `directory`, `sessionID`, and `sessionStateStore`,
    - return a boolean indicating whether stale continuation must be skipped for a completed active plan,
    - call `sessionStateStore.resetContinuationProgress(sessionID)` before returning `true`, so stale progress state does not keep re-arming countdown logic.
  - Add `src/hooks/todo-continuation-enforcer/completed-plan-guard.test.ts` for:
    - completed active plan -> skip + progress reset
    - incomplete plan -> no skip + no reset
  - Use this module instead of adding inline Boulder checks directly into `idle-event.ts` or `continuation-injection.ts`.

  **Must NOT do**:
  - Do NOT write or clear continuation markers here.
  - Do NOT fetch `ctx.client.session.todo(...)` here.
  - Do NOT grow `idle-event.ts` or `continuation-injection.ts` past the 200 LOC architecture threshold.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: hook-level state handling with focused tests
  - Skills: `[]` - no extra skill required
  - Omitted: `['git-master']` - no git action in this task

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 3, 5 | Blocked By: 1

  **References**:
  - Pattern: `src/hooks/todo-continuation-enforcer/session-state.ts:194-207` - existing reset API for continuation progress
  - Pattern: `src/hooks/todo-continuation-enforcer/handler.ts:48-60` - hook entrypoints already pass `sessionStateStore`
  - Pattern: `src/hooks/stop-continuation-guard/hook.ts:98-107` - stop suppression clears on new user message, so state reset must be local and deterministic

  **Acceptance Criteria**:
  - [x] `completed-plan-guard.ts` exists and is the only new hook-local helper added for this behavior
  - [x] `completed-plan-guard.test.ts` verifies progress reset only on completed active plans
  - [x] `bun test src/hooks/todo-continuation-enforcer/completed-plan-guard.test.ts` exits `0`

  **QA Scenarios**:
  ```
  Scenario: Completed active plan resets continuation progress
    Tool: Bash
    Steps: Run `bun test src/hooks/todo-continuation-enforcer/completed-plan-guard.test.ts`
    Expected: The completed-plan case records a reset call and the suite exits 0
    Evidence: changes/fix-stale-todo-continuation-injection/evidence/task-2-completed-plan-guard.txt

  Scenario: Incomplete active plan does not suppress normal flow
    Tool: Bash
    Steps: Run `bun test src/hooks/todo-continuation-enforcer/completed-plan-guard.test.ts`
    Expected: The incomplete-plan case does not reset progress and the suite exits 0
    Evidence: changes/fix-stale-todo-continuation-injection/evidence/task-2-completed-plan-guard-edge.txt
  ```

  **Commit**: NO | Message: `fix(todo): isolate completed-plan continuation guard` | Files: `src/hooks/todo-continuation-enforcer/completed-plan-guard.ts`, `src/hooks/todo-continuation-enforcer/completed-plan-guard.test.ts`

- [x] 3. Apply the completed-plan guard to both idle-time and pre-injection continuation checks

  **What to do**:
  - Update `src/hooks/todo-continuation-enforcer/idle-event.ts` to call Task 2's guard immediately after todo fetch and before countdown scheduling.
  - Update `src/hooks/todo-continuation-enforcer/continuation-injection.ts` to re-check the same guard immediately after re-fetching todos and before building the `[Status: x/y completed, z remaining]` prompt.
  - Add regression coverage in:
    - `src/hooks/todo-continuation-enforcer/todo-continuation-enforcer.test.ts`
    - `src/hooks/todo-continuation-enforcer/continuation-injection.test.ts`
  - Required regression cases:
    - stale incomplete session todos + completed active Boulder plan -> no countdown and no prompt injection
    - same stale session todos + incomplete active Boulder plan -> prompt still injects normally
    - next user message after `stop-continuation` clear -> completed active plan still blocks stale reinjection

  **Must NOT do**:
  - Do NOT make `todo-continuation-enforcer` parse `tasks.md` directly.
  - Do NOT delete or rewrite session todo rows in this task.
  - Do NOT change skip-agent or background-task semantics unrelated to the new guard.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: main bug path across idle and delayed prompt injection
  - Skills: `[]` - no extra skill required
  - Omitted: `['git-master']` - no git action in this task

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 5 | Blocked By: 1, 2

  **References**:
  - Pattern: `src/hooks/todo-continuation-enforcer/idle-event.ts:88-110` - current early exits for empty or completed todo lists
  - Pattern: `src/hooks/todo-continuation-enforcer/idle-event.ts:170-189` - current countdown entrypoint and stop guard position
  - Pattern: `src/hooks/todo-continuation-enforcer/continuation-injection.ts:78-145` - current stale prompt is built directly from session todos here
  - Test: `src/hooks/todo-continuation-enforcer/todo-continuation-enforcer.test.ts:252-299` - existing active/incomplete vs all-complete continuation behavior
  - Test: `src/hooks/todo-continuation-enforcer/todo-continuation-enforcer.test.ts:1689-1752` - existing stop-continuation timing behavior
  - Test: `src/hooks/todo-continuation-enforcer/continuation-injection.test.ts:7-49` - existing direct injection test harness

  **Acceptance Criteria**:
  - [x] A completed active Boulder plan prevents stale countdown and stale prompt injection in both `idle-event.ts` and `continuation-injection.ts`
  - [x] An incomplete active Boulder plan still injects normally
  - [x] The `stop-continuation` replay case is covered and passes
  - [x] `bun test src/hooks/todo-continuation-enforcer` exits `0`

  **QA Scenarios**:
  ```
  Scenario: Completed active plan blocks stale continuation prompt
    Tool: Bash
    Steps: Run `bun test src/hooks/todo-continuation-enforcer`
    Expected: The new completed-plan regression cases pass and no stale continuation prompt is injected
    Evidence: changes/fix-stale-todo-continuation-injection/evidence/task-3-todo-continuation-guard.txt

  Scenario: Active incomplete plan still injects
    Tool: Bash
    Steps: Run `bun test src/hooks/todo-continuation-enforcer`
    Expected: Existing incomplete-plan injection tests remain green and the suite exits 0
    Evidence: changes/fix-stale-todo-continuation-injection/evidence/task-3-todo-continuation-guard-edge.txt
  ```

  **Commit**: NO | Message: `fix(todo): block stale continuation for completed plans` | Files: `src/hooks/todo-continuation-enforcer/idle-event.ts`, `src/hooks/todo-continuation-enforcer/continuation-injection.ts`, related tests

- [x] 4. Prevent compaction from restoring stale plan-backed todo snapshots after plan completion

  **What to do**:
  - Update `src/hooks/compaction-todo-preserver/hook.ts` to consult Task 1's helper before calling `Todo.update`.
  - If the session belongs to a completed active Boulder plan, delete the in-memory snapshot and skip restore.
  - Preserve current behavior when:
    - current todos already exist
    - there is no tracked active plan
    - the tracked active plan is still incomplete
  - Expand `src/hooks/compaction-todo-preserver/index.test.ts` with:
    - completed active plan -> snapshot not restored
    - incomplete active plan -> snapshot still restored

  **Must NOT do**:
  - Do NOT restore stale snapshot rows for completed plans and then rely on a later hook to suppress them.
  - Do NOT write new marker files in this hook.
  - Do NOT broaden this hook to clean unrelated session todo rows.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: compaction race fix with narrow hook changes
  - Skills: `[]` - no extra skill required
  - Omitted: `['git-master']` - no git action in this task

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 5 | Blocked By: 1

  **References**:
  - Pattern: `src/hooks/compaction-todo-preserver/hook.ts:57-64` - snapshot capture behavior
  - Pattern: `src/hooks/compaction-todo-preserver/hook.ts:70-103` - current unconditional restore when current todos are empty
  - Test: `src/hooks/compaction-todo-preserver/index.test.ts:49-67` - existing restore-on-missing coverage
  - Test: `src/hooks/compaction-todo-preserver/index.test.ts:69-84` - existing skip-when-present coverage
  - Pattern: `src/hooks/start-work/start-work-hook.ts:151-170` - tracked session membership for active Boulder work

  **Acceptance Criteria**:
  - [x] Completed active Boulder plans do not restore stale todo snapshots after compaction
  - [x] Incomplete or untracked plans preserve the current restore behavior
  - [x] `bun test src/hooks/compaction-todo-preserver/index.test.ts` exits `0`

  **QA Scenarios**:
  ```
  Scenario: Completed active plan skips restore
    Tool: Bash
    Steps: Run `bun test src/hooks/compaction-todo-preserver/index.test.ts`
    Expected: The completed-plan restore-skip case passes and no stale snapshot is restored
    Evidence: changes/fix-stale-todo-continuation-injection/evidence/task-4-compaction-restore-guard.txt

  Scenario: Incomplete active plan still restores missing todos
    Tool: Bash
    Steps: Run `bun test src/hooks/compaction-todo-preserver/index.test.ts`
    Expected: The existing restore-on-missing behavior remains green for incomplete/untracked plans
    Evidence: changes/fix-stale-todo-continuation-injection/evidence/task-4-compaction-restore-guard-edge.txt
  ```

  **Commit**: NO | Message: `fix(todo): skip stale compaction restore for completed plans` | Files: `src/hooks/compaction-todo-preserver/hook.ts`, `src/hooks/compaction-todo-preserver/index.test.ts`

- [x] 5. Lock the replay paths down with a non-regression matrix

  **What to do**:
  - Extend the existing `todo-continuation-enforcer` and session-state regression suites so this bug stays fixed across all replay paths.
  - Add/keep explicit coverage for:
    - completed active plan + stale session todos + next user message -> still no reinjection
    - completed active plan + compaction-only recent message history -> still no reinjection
    - active incomplete plan + valid todos -> still injects normally
    - manual/unrelated todos in non-Boulder sessions -> unchanged behavior
    - `session-state` stagnation tracking remains unchanged when the completed-plan guard is not active
  - Use existing regression-style naming and keep the old stagnation and stop tests green.

  **Must NOT do**:
  - Do NOT add flaky timer expectations without fake-timer control.
  - Do NOT weaken existing stagnation, pending-question, or stop-continuation assertions.
  - Do NOT introduce a new global suppression that disables continuation for all sessions.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: regression-heavy hook suite hardening
  - Skills: `[]` - no extra skill required
  - Omitted: `['git-master']` - no git action in this task

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: F1, F2, F3, F4 | Blocked By: 2, 3, 4

  **References**:
  - Test: `src/hooks/todo-continuation-enforcer/session-state.regression.test.ts:19-102` - current stagnation regressions must remain intact
  - Test: `src/hooks/todo-continuation-enforcer/todo-continuation-enforcer.test.ts:1524-1752` - compaction-agent and stop-continuation edge coverage already exists here
  - Pattern: `src/features/builtin-commands/templates/start-work.ts:97-105` - active plans seed incomplete tasks into session todo via `todowrite`
  - Pattern: `src/hooks/stop-continuation-guard/hook.ts:75-107` - stop suppression clears on the next user message

  **Acceptance Criteria**:
  - [x] Replay-path regressions are encoded in existing hook test suites, not hidden in ad hoc scripts
  - [x] `bun test src/hooks/todo-continuation-enforcer` exits `0`
  - [x] `bun test src/hooks/compaction-todo-preserver/index.test.ts` exits `0`
  - [x] `bun run typecheck` exits `0`

  **QA Scenarios**:
  ```
  Scenario: Replay-path regressions stay green
    Tool: Bash
    Steps: Run `bun test src/hooks/todo-continuation-enforcer && bun test src/hooks/compaction-todo-preserver/index.test.ts`
    Expected: Completed-plan replay cases stay blocked, active incomplete-plan cases still inject, and both suites exit 0
    Evidence: changes/fix-stale-todo-continuation-injection/evidence/task-5-replay-matrix.txt

  Scenario: Type safety remains intact
    Tool: Bash
    Steps: Run `bun run typecheck`
    Expected: TypeScript exits 0 with no new diagnostics from the new helper modules or hook guards
    Evidence: changes/fix-stale-todo-continuation-injection/evidence/task-5-replay-matrix-typecheck.txt
  ```

  **Commit**: NO | Message: `test(todo): lock stale continuation replay paths` | Files: `src/hooks/todo-continuation-enforcer/*.test.ts`, `src/hooks/compaction-todo-preserver/index.test.ts`, any supporting helper tests

## Final Verification Wave (MANDATORY - after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> Do NOT auto-proceed after verification. Wait for the user's explicit approval before marking work complete.
> Never mark F1-F4 as checked before getting the user's okay. Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.

- [x] F1. Plan Compliance Audit - oracle
  - Verify the implementation only addresses stale completed-plan continuation and compaction replay.
  - Confirm `todo-sync.ts` and unrelated hook clusters were not widened without new evidence.

- [x] F2. Code Quality Review - unspecified-high
  - Review helper boundaries, file size compliance, and race-window handling across idle/injection/compaction.
  - Confirm no broad todo deletion path was introduced.

- [x] F3. Agent-Executed Runtime QA - unspecified-high
  - Run:
    - `bun test src/features/boulder-state/session-plan-completion.test.ts`
    - `bun test src/hooks/todo-continuation-enforcer`
    - `bun test src/hooks/compaction-todo-preserver/index.test.ts`
    - `bun run typecheck`

- [x] F4. Scope Fidelity Check - deep
  - Confirm the diff is limited to the stale continuation fix path and does not reopen the old hook umbrella plan.

## Commit Strategy
- Do not commit automatically.
- If the user later requests a commit, prefer one shipping commit:
  - `fix(todo): suppress stale continuation after plan completion`
- Split into two commits only if the helper extraction is materially separable:
  1. `refactor(todo): add completed-plan continuation helpers`
  2. `fix(todo): block stale continuation and compaction replay`

## Success Criteria
- The stale `[Status: 2/20 completed, 18 remaining]` block cannot reappear for a session whose active Boulder plan is already complete.
- The fix survives idle re-entry, compaction restore, and the next user message after stop suppression clears.
- Active incomplete-plan sessions still inject continuation normally.
- Manual/unrelated todos in non-Boulder sessions are not deleted or globally suppressed.
- Targeted tests and typecheck pass.
