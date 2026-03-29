# Draft: Fix stale TODO continuation injection

## Requirements (confirmed)
- stale TODO continuation injection keeps appearing after the authoritative hook-fix plan is already complete
- the active umbrella hook-fix plan remains closed and must not be reopened for this bug
- this issue should be handled as a new independent plan
- root cause investigation must happen before any fix work
- the execution plan should target the stale continuation bug itself, not the old hook cluster list

## Technical Decisions
- create a separate change for the stale continuation bug instead of reopening `fix-hooks-and-downstream-from-baseline`
- treat `changes/fix-hooks-and-downstream-from-baseline/tasks.md` as source of truth for the completed hook work
- investigate and fix the session todo continuation path before considering any boulder or merge workflow changes
- use the session todo store as the primary debugging surface; do not couple the fix to `tasks.md` parsing unless evidence proves that is required
- default scope: root-cause fix plus regression coverage, without adding a temporary boulder-specific suppression layer unless investigation proves it is necessary
- use the existing Boulder active-plan state only as a narrow freshness check for plan-backed stale todos, not as the primary continuation source
- keep `src/tools/task/todo-sync.ts` out of the initial implementation scope unless a failing regression proves the task-system sync path participates in the bug

## Research Findings
- `src/hooks/todo-continuation-enforcer/continuation-injection.ts`: builds the stale `[Status: x/y completed, z remaining]` block from `ctx.client.session.todo(...)`
- `src/hooks/todo-continuation-enforcer/idle-event.ts`: triggers continuation on idle whenever the session todo store still has incomplete items
- `src/features/builtin-commands/templates/start-work.ts:97-105`: `/start-work` seeds incomplete plan tasks into session todo via `todowrite`, so a completed plan can still leave stale session todo rows if they are not later reconciled
- `src/hooks/start-work/start-work-hook.ts:99-123,151-170,197-230`: Boulder state tracks the active plan and already knows when a tracked plan is complete via `getPlanProgress(...)`
- `src/hooks/compaction-todo-preserver/hook.ts`: can restore old todo snapshots after compaction and may replay outdated items
- `src/hooks/compaction-todo-preserver/index.test.ts:49-67`: current compaction restore coverage only checks "missing todos" recovery, not whether the snapshot is obsolete relative to the latest authoritative task state
- `src/hooks/stop-continuation-guard/hook.ts:75-107`: stop suppression is cleared on the next user message, so stale todos can re-trigger continuation if no freshness guard exists
- `src/features/boulder-state/plan-progress-parser.ts`: parses `tasks.md` for the Atlas/Boulder path and is available as a narrow freshness check for plan-backed stale todos
- `src/tools/task/todo-sync.ts` and `src/tools/task/todo-sync.test.ts` show a separate task-system sync path, but current production references do not make it the primary scope for this bug

## Open Questions
- none blocking; proceed with root-cause fix plus regression coverage as the default plan scope

## Scope Boundaries
- INCLUDE: stale session todo continuation injection, completed-plan freshness checks, compaction todo restore behavior, regression coverage for completed-plan sessions
- EXCLUDE: reopening the completed hook umbrella plan, unrelated hook cluster repairs, widening into `todo-sync` without new failing evidence, git merge/PR actions
