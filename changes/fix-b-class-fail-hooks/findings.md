# Findings: fix-b-class-fail-hooks

- Task 2.2 was not just a manifest problem: adding `UserPromptSubmit` to `src/downstream/hooks/failure-counter/manifest.ts` was insufficient until the downstream runtime also accepted that lifecycle in `src/downstream/runtime-hook-executor.ts`, surfaced it through `src/index.ts`, and covered it with `src/downstream/runtime-hook-executor.test.ts`.
- Task 2.3 turned out to be stale plan text rather than a real code bug: `src/hooks/failure-counter/constants.ts` uses `"systematic-debugging"`, and that skill is defined in `src/features/builtin-skills/skills/tdd-and-debugging.ts` and registered in `src/features/builtin-skills/skills.ts`.
- Task 3.1 is a timing fix, not a behavior redesign: `src/hooks/codebase-assessment/index.ts` now marks `injectedSessions` only after the assessment text is successfully pushed to output, which preserves retry behavior when collection or injection fails.
- Final verification succeeded on the plan-scoped surface: targeted hook tests, typecheck, and build all passed, and the broad `bun test` result remained within the documented failure baseline.
