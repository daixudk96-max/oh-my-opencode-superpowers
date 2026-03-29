# Fix Boulder continuation status counting

## TODOs

- [x] 1. Narrow Boulder progress parsing to actionable top-level tasks only
  - Update `src/features/boulder-state/plan-progress-parser.ts` so `getPlanProgress(...)` ignores nested Acceptance Criteria and QA checklist rows when counting completion.
  - Add tests in `src/features/boulder-state/plan-progress-parser.test.ts` for:
    - flat top-level plans still counting normally
    - completed top-level plan with nested unchecked checklist rows reporting complete
    - plans with final-wave tasks like `F1-F4` still counting correctly
  - 结果记录: append parser rules and edge cases to `findings.md`; append verification status to `progress.md`.
  - QA Scenarios:
    - Tool: Bash
    - Steps: Run `bun test src/features/boulder-state/plan-progress-parser.test.ts`
    - Expected: Nested-checklist fixture reports complete when all top-level tasks are checked, while flat-plan fixtures keep their current counts.

- [x] 2. Align first-incomplete-task resolution with the new actionable-task filter
  - Update `getFirstIncompleteTask(...)` in `src/features/boulder-state/plan-progress-parser.ts` to skip nested checklist rows.
  - Add tests covering nested unchecked checklist items under completed top-level tasks.
  - 结果记录: append first-incomplete-task behavior notes to `findings.md`; append verification status to `progress.md`.
  - QA Scenarios:
    - Tool: Bash
    - Steps: Run `bun test src/features/boulder-state/plan-progress-parser.test.ts`
    - Expected: First incomplete task resolves to the next actionable top-level task or `null`, never to nested Acceptance Criteria / QA rows.

- [x] 3. Add Atlas regression coverage for nested-checklist completed plans
  - Extend Atlas continuation tests to prove a plan with all top-level tasks checked but nested unchecked checklist rows does not trigger Boulder continuation.
  - Verify the injected status banner no longer reports bogus remaining counts for that plan shape.
  - 结果记录: append Atlas behavior findings to `findings.md`; append verification status to `progress.md`.
  - QA Scenarios:
    - Tool: Bash
    - Steps: Run `bun test src/hooks/atlas`
    - Expected: Atlas skips continuation for completed top-level plans with nested unchecked rows, and no bogus `remaining` banner is injected.

- [x] 4. Keep Boulder continuation operator guidance explicit but non-looping
  - Refine `src/hooks/atlas/system-reminder-templates.ts` and any directly related tests so the reminder tells operators to complete relevant checklist items or split blocker work into a new plan, without encouraging infinite repeat loops.
  - 结果记录: append prompt guidance decisions to `findings.md`; append verification status to `progress.md`.
  - QA Scenarios:
    - Tool: Bash
    - Steps: Run `bun test src/hooks/atlas` and inspect the prompt-template assertions that cover Boulder continuation copy.
    - Expected: The reminder explicitly covers nested checklist handling and avoids wording that would encourage endless stale repetition.

- [x] F1. Verification
  - Run targeted parser, Atlas, and typecheck validation.
  - Record outcomes in `progress.md`.
  - QA Scenarios:
    - Tool: Bash
    - Steps: Run `bun test src/features/boulder-state/plan-progress-parser.test.ts && bun test src/hooks/atlas && bun run typecheck`
    - Expected: All targeted suites pass and TypeScript exits with code 0.

## Verification Commands

- `bun test src/features/boulder-state/plan-progress-parser.test.ts`
- `bun test src/hooks/atlas`
- `bun run typecheck`
