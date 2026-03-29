# Issues

## 2026-03-29 - stale Boulder continuation status after plan completion

- The plan `changes/fix-stale-todo-continuation-injection/tasks.md` has all top-level tasks checked (`1-5`, `F1-F4`).
- The injected Boulder continuation block still reports `9/26 completed, 17 remaining` because it appears to count nested acceptance-criteria and QA checkboxes as unfinished work.
- This is no longer actionable within the current plan because the plan's executable top-level work is complete.
- Follow-up should be handled as a separate bug: Boulder continuation status/reporting should distinguish top-level tasks from nested checklist items.
