# Findings

## Requirements

- Prevent Boulder from counting nested markdown checklist rows as remaining executable work.
- Preserve flat-plan compatibility.
- Keep Atlas continuation guidance explicit without causing repeated stale looping.

## Task 1 parser rules

- `getPlanProgress(...)` now counts only actionable top-level markdown checkbox rows that start at column 0.
- Indented nested checklist rows under a top-level task are ignored for aggregate and per-phase completion counts.
- Flat plans still keep their previous counts because their actionable rows are already top-level checkbox bullets.
- Final-wave labels like `F1` to `F4` still count because filtering is based on top-level checkbox structure, not task text.

## Task 2 first-incomplete behavior

- Root cause for Task 2 was parser drift risk: `getFirstIncompleteTask(...)` used its own unchecked-task matcher instead of explicitly reusing the top-level actionable checkbox filter from Task 1.
- `getFirstIncompleteTask(...)` now gates on the same top-level unchecked checkbox pattern used by progress counting, so nested Acceptance Criteria and QA rows are skipped consistently.
- If only nested checklist rows remain under completed top-level tasks, the first incomplete task now resolves to `null`.
- If a later top-level actionable task is still unchecked, nested rows are skipped and that next top-level task name is returned.

## Task 3 Atlas regression behavior

- Atlas idle continuation already consumes `getPlanProgress(...)` through `resolveActiveBoulderSession(...)`, so no Atlas source fix was needed after Tasks 1 and 2.
- The missing coverage was at the Atlas hook layer: we needed proof that a plan with all top-level tasks checked but nested unchecked checklist rows does not re-trigger continuation.
- Atlas completion reminders also inherit `getPlanProgress(...)` through `tool-execute-after.ts`, so the status banner now correctly reports top-level-only progress for that plan shape.
- Regression coverage now proves both behaviors together: no idle continuation prompt and no bogus `remaining` banner when only nested checklist rows are unchecked.

## Task 4 continuation prompt guidance

- Root cause for Task 4 was wording ambiguity, not logic: the reminder mentioned nested checklist cleanup but still used broad “do not stop until all tasks are complete” language that could encourage stale repetition.
- The continuation prompt now tells Atlas operators to either finish relevant nested checklist items for the task being closed or split blocked follow-up work into a new plan before continuing.
- The prompt now explicitly says not to repeat the same stale continuation when the remaining count is only checklist bookkeeping, and instead to document the blocker and create or switch to the right plan.
- Atlas regression coverage now locks the continuation prompt copy so future wording changes do not reintroduce loop-encouraging guidance.
