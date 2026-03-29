# Design

## Goal

Prevent stale plan-backed TODO continuation prompts from reappearing after the authoritative Boulder-tracked plan is already complete.

## Approach

- Add a focused Boulder-state helper that answers whether a tracked session belongs to a completed active plan.
- Add a hook-local completed-plan guard that reuses the helper and resets continuation progress when stale continuation should be suppressed.
- Apply the guard in both idle-time and pre-injection paths so stale prompts are blocked before countdown scheduling and before final prompt construction.
- Apply the same freshness check in compaction restore so stale snapshots are not replayed after plan completion.

## File Focus

- `src/features/boulder-state/session-plan-completion.ts`
- `src/hooks/todo-continuation-enforcer/completed-plan-guard.ts`
- `src/hooks/todo-continuation-enforcer/idle-event.ts`
- `src/hooks/todo-continuation-enforcer/continuation-injection.ts`
- `src/hooks/compaction-todo-preserver/hook.ts`

## Guardrails

- Preserve manual or unrelated todos in non-Boulder sessions.
- Do not reopen the old hook umbrella plan.
- Do not widen into `todo-sync.ts` unless a new failing regression proves it is involved.
