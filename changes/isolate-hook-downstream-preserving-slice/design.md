# Design

## Goal

Create a clean, reviewable execution lane for hook and downstream-preserving work without mixing in unrelated dirty changes.

## Architecture

### Source of truth

Use the current repository as the only authoritative source of code and git history.

### Preserved downstream contract

Carry forward the old umbrella contract exactly:

- protected gate: `bun test src/hooks/atlas src/downstream`
- broader done gates later: `bun test src/hooks src/downstream`, `bun run typecheck`, `bun run build`

### Isolation model

1. Prove provenance and freeze the preserved downstream gate.
2. Build a dirty-tree scope map across hook, downstream-adjacent, and unrelated files.
3. Extract only the files or hunks that belong to the hook or downstream-preserving slice.
4. Re-run the preserved gate on the isolated slice.
5. Only if the isolated slice turns red, plan the smallest possible follow-up repair.

## File Structure

Expected candidate files to classify before any execution:

- `src/hooks/auto-update-checker/**`
- `src/features/builtin-commands/commands.test.ts`
- `src/features/builtin-commands/templates/start-work.ts`
- `src/features/builtin-skills/executing-plans/SKILL.md`
- `src/features/builtin-skills/skills.test.ts`
- `src/plugin-handlers/agent-config-handler.test.ts`
- `src/tools/delegate-task/prompt-builder.ts`
- `src/tools/delegate-task/sync-prompt-sender.test.ts`
- `src/features/builtin-commands/templates/start-work.test.ts`
- `src/plugin-handlers/prometheus-agent-config-builder.test.ts`
- `src/tools/delegate-task/prompt-builder.test.ts`

This list is provisional. The first execution task must classify each path or hunk explicitly.

## Key Decisions

1. Do not treat `.sisyphus/worktrees/fix-hook-runtime-regression-from-baseline/` as an independent merge branch unless new git evidence proves it.
2. Preserve downstream behavior first, then decide whether any hook repair is still needed.
3. Prefer isolation over reimplementation.
4. Prefer hunk-level splitting over dragging unrelated dirty files into the slice.

## Edge Cases

- A file may contain both relevant hook work and unrelated dirty edits; that file becomes split-needed.
- The preserved downstream gate may stay green while a broader hook suite turns red; in that case, the isolated slice is valid but needs a minimal follow-up repair plan.
- If no clean slice can be isolated, only then escalate to a broader from-scratch repair decision.

## Open Questions

- Which currently dirty downstream-adjacent files are truly part of the preserved hook slice versus unrelated repo work.
- Whether the current green focused results depend on any hidden untracked files that must be carried into the slice.
