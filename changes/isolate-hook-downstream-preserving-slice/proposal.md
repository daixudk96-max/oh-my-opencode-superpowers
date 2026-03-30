# Proposal: Isolate hook downstream preserving slice

## Problem Statement

The previously referenced hook repair path under `.sisyphus/worktrees/fix-hook-runtime-regression-from-baseline/` is not an independently mergeable git worktree anymore. Git evidence resolves that path back to the same repository root and the same `HEAD` as the current dirty repo.

At the same time, the old umbrella work explicitly preserved downstream behavior with the gate `bun test src/hooks/atlas src/downstream`, while the current repo contains a mix of hook or downstream related edits and unrelated dirty changes. Before any further repair or merge work, we need a clean, auditable slice that preserves the downstream contract.

## Proposed Solution

Plan and execute a provenance-first isolation workflow:

- treat the current repo as the only authoritative source of code
- freeze the downstream-preserving gate from the old umbrella plan
- classify every current dirty file or hunk as include, exclude, or split-needed
- isolate only the hook or downstream-preserving slice into a clean execution lane
- run the preserved gates on that isolated slice before deciding whether any new repair is still needed

## Success Criteria

1. We prove with git evidence that the old path is not a separate merge target.
2. We isolate a clean hook or downstream-preserving slice from the current dirty repo.
3. The isolated slice keeps `bun test src/hooks/atlas src/downstream` green.
4. The isolated slice either:
   - already passes the broader hook or downstream gates, or
   - exposes a minimal bounded repair delta for later execution.
5. The plan records exact file scope, acceptance commands, and an atomic commit strategy.

## Risks

- Mixed dirty files may require hunk-level splitting rather than file-level inclusion.
- Some current green results may depend on adjacent edits that are not obviously in scope.
- Treating the old `.sisyphus/worktrees/...` path as a merge source would create false provenance and a risky merge story.

## Alternatives Considered

- Merge the old hook worktree directly: rejected because current git evidence does not show an independent worktree or divergent `HEAD`.
- Re-run hook repairs from scratch: rejected as a first move because we already have preserved downstream constraints and current green evidence to reuse.
