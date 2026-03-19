# Proposal: verify-open-code-user-session

## Problem Statement
The `fix-b-class-fail-hooks` work already covers unit and runtime-level checks, but we still lack a reproducible verification that runs through the full Open Code plugin entrypoints in the context of a real-host session. We need to prove that the combination of debugging injector, failure counter, `/reset-failures`, and codebase assessment behave correctly inside an actual Open Code user session before marking the feature as fully verified.

## Proposed Solution
Create a dedicated verification change that scripts a full Open Code interaction: startup the plugin, issue user-like commands (Read/Edit/Bash), trigger delegate_task failures, call `/reset-failures`, and observe the injected `Codebase Assessment (PHASE 1)` plus failure counter messaging. Capture the plugin outputs, log the sequence, and end with a broad `bun test`/`tsc`/`build` suite to prove the environment is clean.

## Success Criteria
- [ ] The end-to-end Open Code session is run via the actual plugin entrypoints, and we capture outputs for debugging injector, failure counter injection, `/reset-failures`, and codebase assessment injection.
- [ ] Broad verification commands finish: `bun test src/hooks/debugging-injector`, `bun test src/hooks/failure-counter/index.test.ts`, `bun test src/hooks/codebase-assessment`, `bun test src/downstream/runtime-hook-executor.test.ts`, `bun run tsc --noEmit`, `bun run build`, and a wide `bun test` suite while staying within the 562 fail baseline.
- [ ] Findings/progress document the factual outputs from the Open Code execution (messages, statuses) to demonstrate the user-facing behavior.

## Risk Assessment
- **Risk:** Running an end-to-end Open Code session may produce flaky outputs if hooks depend on cached state. Mitigation: reset caches and run with a clean worktree, capturing console output to rerun if needed.
- **Risk:** The plugin entrypoints rely on `src/index.ts` wiring; if we misconfigure the lifecycle, the hooks won’t trigger. Mitigation: log each lifecycle event and verify the handler list from `downstreamHooks`.

## Alternatives Considered
- Replaying only the unit tests for each hook. Rejected because they bypass the plugin entrypoints and do not prove integration with the UI lifecycle.
- Building a synthetic harness that updates `UserPromptSubmit` directly from unit tests. Rejected because we want the actual Open Code session that users will run.
