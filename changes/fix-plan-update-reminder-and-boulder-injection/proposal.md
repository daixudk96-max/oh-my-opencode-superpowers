# Proposal: Fix plan-update-reminder & Boulder Injection

## Problem Statement

The `plan-update-reminder` hook has 4 critical defects that make it ineffective in the OpenCode environment:

1. **H1: Missing apply_patch support** — Only monitors `edit` and `write` tools, but OpenCode's inner agent uses `apply_patch` for file modifications. The hook never triggers in OpenCode sessions.

2. **H2: Toast-only notification, no chat injection** — Uses `output.output +=` to append reminders to tool output. The AI agent can (and does) ignore these footnotes. The todo-continuation system uses `ctx.client.session.promptAsync()` to inject real chat messages that force the AI to respond.

3. **H3: No plan content injection** — Unlike todo-continuation which reads and displays incomplete todo items in the injected prompt, boulder never reads or displays the actual tasks.md content. The AI has no visibility into what tasks remain.

4. **H4: Findings only written at task end** — The 2-Action Rule reminder only says "update findings.md" but doesn't inject the current findings.md content. Mid-execution discoveries, decisions, and issues are lost because the AI doesn't know what's already recorded.

## Proposed Solution

Upgrade `plan-update-reminder` to use the same injection patterns as `debugging-injector` (for tool-level injection) and `todo-continuation-enforcer` (for session-level injection):

- **H1**: Add `apply_patch` to monitored tools with patchText path extraction (same pattern as debugging-injector fix)
- **H2**: Switch from `output.output +=` to `output.messages.push()` for tool-level injection (same as debugging-injector)
- **H3**: On 2-Action Rule trigger, read tasks.md and inject current task status into the message
- **H4**: On 2-Action Rule trigger, read findings.md tail and inject it so the AI knows what's already recorded

## Success Criteria

1. `plan-update-reminder` triggers on `apply_patch` tool calls in OpenCode sessions
2. Reminders are injected via `output.messages.push()` not `output.output +=`
3. 2-Action Rule trigger includes tasks.md checkbox summary (X/Y completed)
4. 2-Action Rule trigger includes findings.md tail (last 20 lines) for context
5. All existing tests pass after changes
6. Build succeeds (`bun run build`)

## Risk Assessment

- **Low**: H1 is a proven pattern (identical to debugging-injector fix)
- **Low**: H2 is a well-understood API (`output.messages.push()` used by debugging-injector)
- **Medium**: H3/H4 involve filesystem reads during hook execution — need to handle missing files gracefully
- **Low**: No breaking changes to existing behavior (only additive)

## Alternatives Considered

1. **Full session-level injection like todo-continuation** — Uses `ctx.client.session.promptAsync()`. Too heavy for a per-tool-call reminder; would create excessive chat messages. Reserved for session-idle scenarios.
2. **Keep output.output += but make it stronger** — Doesn't solve the fundamental problem that agents ignore tool output footnotes.
3. **Merge into debugging-injector** — Different concerns (debugging vs planning); keep them separate for maintainability.
