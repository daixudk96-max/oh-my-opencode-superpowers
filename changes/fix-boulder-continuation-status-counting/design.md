# Design

## Goal

Make Boulder continuation status reflect actionable plan progress instead of raw markdown checkbox counts, while preserving compatibility with existing flat plans.

## Architecture

1. Refine `src/features/boulder-state/plan-progress-parser.ts` so task counting distinguishes top-level executable task rows from nested checklist items.
2. Update `getFirstIncompleteTask(...)` to use the same actionable-task filter.
3. Add Atlas regressions proving completed plans with nested unchecked checklist items do not continue looping.
4. Keep a prompt-level reminder in `src/hooks/atlas/system-reminder-templates.ts` so operators understand checklist expectations when a plan intentionally uses nested rows.

## File Structure

- `src/features/boulder-state/plan-progress-parser.ts`
- `src/features/boulder-state/plan-progress-parser.test.ts`
- `src/hooks/atlas/idle-event.ts` if parser integration needs adaptation
- `src/hooks/atlas/*.test.ts` existing or new focused regression file(s)
- `src/hooks/atlas/system-reminder-templates.ts`

## Key Decisions

- Treat numbered top-level todo items and final-wave items as actionable tasks.
- Ignore nested Acceptance Criteria and QA checklist rows for Boulder completion math.
- Keep the parser fix centralized so Atlas and any other Boulder consumer share the corrected behavior.

## Edge Cases

- Flat plans with only top-level checklist rows must continue to count correctly.
- Legacy phase-only plans with no actionable checkboxes must preserve current fallback behavior.
- Final-wave review tasks like `F1-F4` still count as actionable top-level tasks.

## Open Questions

- Whether any downstream consumer relies on nested checklist counts for reporting; verify via grep during implementation.
