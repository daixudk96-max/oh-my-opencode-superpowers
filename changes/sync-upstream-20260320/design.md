# Design: Sync Upstream oh-my-openagent (2026-03-20)

## Goal

Merge `upstream/dev` into fork's `dev` branch, resolving 46 conflicts while preserving all downstream functionality.

## Architecture

### Conflict Classification (6 patterns)

| Pattern | Description | Files | Strategy |
|---------|------------|:-----:|----------|
| **A** | Upstream modularization (monolith → barrel + impl file) | 5 | Accept upstream barrel; verify impl file has downstream changes |
| **B** | Core registry (both sides modify registration points) | 10 | Accept upstream structure, supplement downstream entries |
| **C** | Minor divergence (imports, paths, formatting) | 8 | Case-by-case, mostly accept-upstream |
| **D** | Test files | 7 | Accept upstream tests, preserve downstream-only test coverage |
| **E** | CLI/command/prompt behavior | 4 | Manual merge, keep downstream mode/path support |
| **F** | Config/infra/schema/dependencies | 12 | Manual merge, combine both sides |

### Resolution Ordering (easy → hard)

```
Phase 1: accept-upstream (7 files) — safe, no downstream loss
Phase 2: Pattern F config/infra (6 files) — additive merges
Phase 3: Pattern C minor (5 files) — quick case-by-case
Phase 4: Pattern D tests (7 files) — test-only, lower risk
Phase 5: Pattern A modularization (5 files) — check impl files
Phase 6: Pattern E cli/commands (4 files) — moderate complexity
Phase 7: Pattern B core registry (10 files) — highest risk, last
Phase 8: bun.lock + package.json (2 files) — regenerate after all source resolved
Phase 9: Verification — build, type check, snapshot comparison
```

## Key Decisions

1. **Path convention**: Keep downstream `changes/` paths, do NOT adopt upstream `.sisyphus/` paths
2. **Hook registration**: Downstream uses `bootstrapDownstreamHooks()`, NOT `isHookEnabledLoose()`
3. **Compaction injector API**: Upstream changed to `capture()/inject()` object API — downstream wrappers must adapt
4. **Plugin disposal**: Accept upstream `createPluginDispose` addition
5. **Agent types**: Union must include both downstream (`prometheus`, `observer`) and upstream (`sisyphus-junior`)
6. **`bun.lock`**: Do NOT manually merge — regenerate via `bun install` after `package.json` is resolved

## File-by-File Resolution Map

### Phase 1: Accept Upstream (7 files)

| File | Rationale |
|------|-----------|
| `src/agents/builtin-agents/resolve-file-uri.test.ts` | Upstream test is more robust |
| `src/agents/oracle.ts` | Formatting-only difference |
| `src/hooks/auto-slash-command/executor.ts` | Upstream centralized command discovery |
| `src/hooks/auto-slash-command/hook.ts` | Upstream TTL cleanup + agent-aware execution |
| `src/hooks/start-work/start-work-hook.ts` | Upstream worktree warning is better |
| `src/shared/index.ts` | HEAD has test artifact; upstream has real export |
| `src/shared/logger.ts` | Upstream buffered logger is functionally better |

### Phase 2: Config/Infra — Pattern F (6 files)

| File | Action |
|------|--------|
| `.gitignore` | Merge both: keep downstream `.worktrees/` etc + add upstream `.omx/` |
| `package.json` | Keep downstream AI SDK deps + accept upstream version/script bumps; do NOT accept repo rename |
| `src/config/schema/hooks.ts` | Keep all downstream hook names + add upstream `todo-description-override` |
| `src/features/boulder-state/types.ts` | Keep downstream types + add upstream `task_sessions`, `TaskSessionState`, `TopLevelTaskRef` |
| `src/features/boulder-state/storage.ts` | Keep downstream functions + add upstream `task_sessions` support, reserved-key protection |
| `src/features/boulder-state/index.ts` | Keep downstream exports (`worktree-manager`, `retry-tracker`) + add upstream `top-level-task` |

### Phase 3: Minor Divergence — Pattern C (5 files)

| File | Action |
|------|--------|
| `src/hooks/atlas/atlas-hook.ts` | Keep downstream boulder-gating/continuation wrappers + add upstream PendingTaskRef tracking |
| `src/hooks/atlas/system-reminder-templates.ts` | Keep downstream `changes/` paths + accept upstream wording improvements |
| `src/hooks/atlas/verification-reminders.ts` | Keep downstream `changes/` paths + accept upstream reusable reminder builders |
| `src/hooks/ralph-loop/completion-promise-detector.ts` | Keep HEAD false-positive filtering + add upstream temporal scoping |
| `src/shared/model-requirements.ts` | Accept upstream model refresh + keep downstream `observer` requirement |

### Phase 4: Tests — Pattern D (7 files)

| File | Action |
|------|--------|
| `src/config/schema.test.ts` | Merge both: keep downstream plan-hook tests + add upstream rejection test |
| `src/hooks/compaction-context-injector/index.test.ts` | Accept upstream new API tests; preserve downstream assertions if still valid |
| `src/hooks/ralph-loop/index.test.ts` | Update to match merged detector behavior |
| `src/shared/model-availability.test.ts` | Keep downstream config-dir isolation + accept upstream mock improvements |
| `src/shared/model-requirements.test.ts` | Keep downstream `observer` test + accept upstream `sisyphus-junior` tests |
| `src/tools/delegate-task/tools.test.ts` | Keep downstream category tests + accept upstream `run_in_background` tests |
| `src/agents/builtin-agents/resolve-file-uri.test.ts` | (Already in Phase 1) |

### Phase 5: Modularization — Pattern A (5 files)

| File | Action |
|------|--------|
| `src/agents/atlas/default.ts` | Accept upstream prompt + preserve downstream `changes/` paths |
| `src/agents/atlas/gemini.ts` | Accept upstream prompt + preserve downstream paths |
| `src/agents/atlas/gpt.ts` | Accept upstream GPT-5.4 prompt + preserve downstream paths |
| `src/agents/sisyphus.ts` | Accept upstream modular imports + preserve downstream orchestration guidance |
| `src/hooks/start-work/index.ts` | Keep downstream compatibility wrapper + add upstream helper exports |

### Phase 6: CLI/Commands — Pattern E (4 files)

| File | Action |
|------|--------|
| `src/features/builtin-commands/commands.ts` | Accept upstream `ULW_LOOP_TEMPLATE` fix + keep all downstream commands |
| `src/features/builtin-commands/templates/start-work.ts` | Keep downstream `--mode` support + accept upstream task breakdown/completion workflow |
| `src/tools/delegate-task/constants.ts` | Accept upstream prompt strengthening + keep downstream category helpers |
| `src/agents/momus.ts` | Accept upstream prompt split + preserve downstream `changes/` paths |

### Phase 7: Core Registry — Pattern B (10 files)

| File | Action |
|------|--------|
| `src/index.ts` | **MOST CRITICAL** — Accept upstream disposal/API + keep all downstream wrappers + adapt compaction injector API |
| `src/hooks/index.ts` | Merge both export sets (upstream new + all downstream) |
| `src/agents/builtin-agents.ts` | Keep downstream auto-discovery + add upstream `sisyphus-junior` + `isFirstRunNoCache` |
| `src/agents/builtin-agents/general-agents.ts` | Keep downstream generic typing + add upstream fallback model logic |
| `src/agents/types.ts` | Union: `prometheus`, `observer`, `sisyphus-junior` |
| `src/plugin-handlers/agent-config-handler.ts` | Keep downstream config pipeline + add upstream protection/junior inheritance |
| `src/plugin/hooks/create-tool-guard-hooks.ts` | Keep `tasks-md-creation-guard` + add `todo-description-override` |
| `src/plugin/skill-context.ts` | Keep downstream merge order + add upstream provider gating |
| `src/plugin/tool-execute-after.ts` | Keep downstream hook chain + wrap with upstream ULW verification/corruption protection |
| `src/plugin/tool-registry.ts` | Keep downstream tool creators + add upstream schema normalization |

### Phase 8: Dependencies (2 files)

| File | Action |
|------|--------|
| `package.json` | (Resolved in Phase 2) |
| `bun.lock` | Regenerate: `bun install` after package.json is final |

### Phase 9: Verification

1. `tsc --noEmit` — 0 errors
2. `bun run build` — succeeds
3. Compare downstream snapshot counts vs post-merge counts
4. `git add` all resolved files + `git commit`
5. Sync update repo to match merge repo

## Edge Cases

- `src/hooks/planning-flow/` does NOT exist — correct path is `src/hooks/planning-flow-guide/`
- Downstream `src/index.ts` uses `bootstrapDownstreamHooks`, NOT `isHookEnabledLoose` (0 occurrences)
- Upstream compaction injector API changed: `function(sessionID)` → `{ capture(sessionID), inject(sessionID) }` — downstream wrapper in `experimental.session.compacting` must adapt

## Open Questions

- Should downstream accept upstream's repo rename (`oh-my-opencode` → `oh-my-openagent`) in package.json? **Recommended: No** — keep fork identity
- Should we run `bun test` as part of verification? **Recommended: Yes** if time allows
