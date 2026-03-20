# Proposal: Sync Upstream oh-my-openagent (2026-03-20)

## Problem Statement

Fork `oh-my-opencode-superpowers` needs to sync with upstream `code-yeongyu/oh-my-openagent` (branch `upstream/dev`). The fork has ~1400 downstream commits adding hooks, commands, agents, skills, boulder-state, and a runtime-hook-executor architecture. Upstream has evolved with modularization, new agents (`sisyphus-junior`), reliability improvements (circuit breaker, spawn depth limits), plugin disposal, and prompt rewrites. A `git merge upstream/dev --no-commit` produces **46 conflicted files**.

## Proposed Solution

Resolve all 46 conflicts following the **sync-upstream-preserve-downstream** skill methodology:
1. Accept upstream structure as the base (don't block upstream evolution)
2. Supplement back all downstream registrations, types, and wrappers
3. Validate with build + type check + downstream snapshot comparison

## Success Criteria

- [ ] All 46 conflict files resolved (no conflict markers)
- [ ] `tsc --noEmit` passes with 0 errors
- [ ] `bun run build` produces valid output
- [ ] Downstream snapshot verification: all hook exports, command entries, boulder types, schema entries preserved
- [ ] Upstream new features retained: plugin disposal, sisyphus-junior, circuit breaker, todo-description-override
- [ ] Both repos (merge + update) synced to same commit

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Downstream hooks lost during merge | High | Downstream snapshot as safety net; verify counts post-merge |
| Upstream API shape changes break downstream wrappers | High | Manual merge for `src/index.ts` with careful API alignment |
| `bun.lock` conflict causes dependency issues | Medium | Regenerate lockfile after `package.json` merge |
| Path convention divergence (`.sisyphus/` vs `changes/`) | Medium | Keep downstream `changes/` convention consistently |

## Alternatives Considered

1. **Accept upstream wholesale, then re-apply downstream patches** - Too risky, downstream is 1400+ commits
2. **Reject upstream changes** - Blocks upstream evolution, causes future sync pain
3. **Cherry-pick upstream** - Too granular for 589 commits
4. **Current approach (merge + manual conflict resolution)** - Best balance of effort and safety
