# Design: verify-open-code-user-session

## Goal
Demonstrate a real Open Code session where the plugin entrypoints route through the existing lifecycle (tool.execute.before + after, UserPromptSubmit) so that the debugging injector, failure counter, and codebase assessment hooks execute under normal conditions.

## Architecture
1. Launch the Open Code plugin via `plugin.createPlugin()` or the entry exported from `src/index.ts`. Use the same initialization logic that a real user would trigger (including hook registration and downstream lifecycle wiring).
2. Simulate the following user commands sequentially:
   - `Read` (non-substantive, should be skipped by codebase assessment)
   - `Edit` (first substantive command, should trigger codebase assessment injection)
   - `tool.execute.after` with `delegate_task` failure output repeated to trigger failure counter thresholds.
   - `/reset-failures` via `UserPromptSubmit` to confirm the hook resets state.
   - Another `delegate_task` failure plus a success output to show counters reset.
3. While running, capture log output and the messages array emitted by each lifecycle handler to prove the debugging injector / failure counter messages appear exactly once and reference the expected skills.
4. After the interaction, run the verification commands from `fix-b-class-fail-hooks` to show the workspace is still green.

## Tech Stack
- JavaScript/TypeScript (existing `oh-my-opencode-merge` stack)
- Bun (for running tests/builds)
- Plugin entrypoints from `src/index.ts`

## File Structure Impact
- No code changes required; this verification is purely procedural. We’ll document the steps and results in the planned `tasks.md`, `findings.md`, and `progress.md`.

## Key Decisions
1. Use the real plugin entrypoints exported from `src/index.ts` to maximize fidelity to production user sessions.
2. Run the same `bun test`/`bun run tsc`/`bun run build` commands already documented in `fix-b-class-fail-hooks` to keep the verification consistent.
3. Record actual message content (e.g., `FAILURE COUNTER - AUTO-INJECTED`, `Codebase Assessment (PHASE 1)`) in `progress.md` so reviewers can see the behavior happened.

## Edge Cases
- The plugin might cache the codebase assessment; rerunning sequential commands should re-use cached result but still log that it was reused. Document this behavior if observed.
- Failure counter message throttling: ensure we wait long enough or reset state before triggering again to avoid suppressed injections.

## Open Questions
- Should we capture stdout in a file for future reference, or is recording the relevant message strings in `findings.md` sufficient?
- Do we need to rerun `bun test` multiple times (e.g., once after the interaction, once after the tests) to show reproducibility?
