# Progress

## 2026-03-29

- Created new change plan for Boulder status-counting and continuation-guidance follow-up.
- Captured root cause: `getPlanProgress(...)` counts nested checklist rows and Atlas surfaces those bogus counts.
- Added task-level QA scenarios after Momus flagged the first draft as too vague.
- Momus review passed on the updated plan, so the new change is ready for implementation.
- Task 1 complete: narrowed `getPlanProgress(...)` counting to top-level actionable checkbox rows in `src/features/boulder-state/plan-progress-parser.ts`.
- Added parser regressions for flat plans, nested unchecked checklist rows under completed top-level tasks, and final-wave `F1-F4` tasks.
- Verification: `lsp_diagnostics` clean for `plan-progress-parser.ts` and `plan-progress-parser.test.ts`.
- Verification: `rtk test bun test src/features/boulder-state/plan-progress-parser.test.ts` passed (7 tests, 0 failures).
- Task 2 complete: updated `getFirstIncompleteTask(...)` to reuse the top-level actionable unchecked-task filter in `src/features/boulder-state/plan-progress-parser.ts`.
- Added first-incomplete regressions for flat plans, nested unchecked checklist rows under completed top-level tasks, and skipping nested rows to the next actionable top-level task.
- Verification: `lsp_diagnostics` with `severity:"warning"` returned clean for `plan-progress-parser.ts` and `plan-progress-parser.test.ts`.
- Verification: `rtk test bun test src/features/boulder-state/plan-progress-parser.test.ts` passed (10 tests, 0 failures).
- Task 3 complete: added Atlas regressions proving nested unchecked checklist rows do not re-trigger continuation once top-level tasks are complete.
- Added Atlas banner regression proving transformed orchestrator output reports top-level-only progress (`1/1 done`, `0 remaining`) for the nested-checklist-complete plan shape.
- Verification: `lsp_diagnostics` with `severity:"warning"` returned clean for `src/hooks/atlas/idle-event-completion.test.ts` and `src/hooks/atlas/index.test.ts`.
- Verification: `rtk test bun test src/hooks/atlas` passed (93 tests, 0 failures).
- Task 4 complete: refined Atlas continuation reminder wording in `src/hooks/atlas/system-reminder-templates.ts` to explicitly cover nested checklist completion vs splitting blocked follow-up work into a new plan.
- Added reminder regression assertions in `src/hooks/atlas/index.test.ts` so stale-loop-avoidance wording stays protected.
- Verification: `lsp_diagnostics` with `severity:"warning"` returned clean for `src/hooks/atlas/system-reminder-templates.ts` and `src/hooks/atlas/index.test.ts`.
- Verification: `rtk test bun test src/hooks/atlas` passed (93 tests, 0 failures, 165 expectations).
- Final verification complete: `bun test src/features/boulder-state/plan-progress-parser.test.ts`, `bun test src/hooks/atlas`, and `bun run typecheck` all passed.
