# Fix Boulder continuation status counting

## Problem Statement

Boulder currently treats every markdown checkbox in a plan as executable work. That includes nested Acceptance Criteria and QA checklist rows, which makes completed plans look incomplete and keeps the Boulder continuation banner repeating with bogus counts like `9/26 completed, 17 remaining`.

## Proposed Solution

Tighten Boulder plan parsing so progress and first-incomplete-task selection operate on actionable top-level tasks rather than every nested checkbox. Keep a separate, narrow prompt improvement in Atlas so operators are told to finish or intentionally close nested checklist items instead of looping forever on stale bookkeeping.

## Success Criteria

- Completed plans with nested unchecked Acceptance Criteria or QA boxes are treated as complete by Boulder continuation.
- Atlas stops re-injecting continuation for plans whose top-level tasks are all done.
- Preferred task selection does not point at nested checklist rows.
- Regression tests cover nested-checklist plans and preserve existing behavior for simple flat plans.

## Risks

- Over-filtering could ignore legitimate top-level work in older plan formats.
- Parser changes could affect current Boulder consumers beyond Atlas if not regression-tested.

## Alternatives Considered

- Mark every nested box manually forever: only a workaround, not a fix.
- Teach operators via prompt only: reduces confusion but does not stop the stale banner.
