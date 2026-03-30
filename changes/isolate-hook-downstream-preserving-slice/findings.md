# Findings

## Requirements

- Preserve downstream behavior as a hard gate while reconciling hook repairs.
- Do not assume `.sisyphus/worktrees/fix-hook-runtime-regression-from-baseline/` is still a separate mergeable git worktree.
- Plan first, then repair or merge only from a clean isolated slice.

## Initial Evidence

- `git worktree list --porcelain` currently shows only `E:/github/oh-my-opencode-merge [dev]`.
- Running git commands from `.sisyphus/worktrees/fix-hook-runtime-regression-from-baseline` resolves back to `E:/github/oh-my-opencode-merge` and `.git`, not a separate worktree git dir.
- The old umbrella proposal and tasks explicitly preserved downstream via `bun test src/hooks/atlas src/downstream`.
- The current repo already has green hook or downstream verification in the preserved scope, but it also contains unrelated dirty changes.

## Task 1 - Provenance and preserved downstream gate

### Provenance proof

- Repo root `git worktree list --porcelain` output was effectively `E:/github/oh-my-opencode-merge 77d78156 [dev]`, so only one registered worktree exists.
- From `.sisyphus/worktrees/fix-hook-runtime-regression-from-baseline`, `git rev-parse --show-toplevel` returned `E:/github/oh-my-opencode-merge`.
- From the same path, `git rev-parse --git-dir` returned `E:/github/oh-my-opencode-merge/.git`.
- From the same path, `git rev-parse HEAD` returned `77d78156ca22b9d995ad12e52c46aea213177455`, matching the current repo head.
- Conclusion: `.sisyphus/worktrees/fix-hook-runtime-regression-from-baseline` is not a separate merge source anymore; it resolves back to the current repo and current HEAD.

### Preserved downstream anchor gate

- Command: `bun test src/hooks/atlas src/downstream`
- Result: `112 pass`, `0 fail`, `215 expect() calls`, completed in `3.67s`.
- Freeze this command as the non-negotiable downstream-preserving anchor gate for all later slice isolation work.

## Task 2 - Dirty-tree scope map

### Include

- `src/agents/prometheus-prompt.test.ts`: include. Added assertions that Prometheus prompt variants report planning status in plain language and avoid execution-only completion language; this supports the plan-first workflow that the preserved slice is carrying forward.
- `src/agents/prometheus/behavioral-summary.ts`: include. The diff rewrites Prometheus handoff and cleanup guidance, which is part of the planning contract for this route.
- `src/agents/prometheus/gemini.ts`: include. Added planner reporting-standard text for Gemini-backed Prometheus.
- `src/agents/prometheus/gpt.ts`: include. Added planner reporting-standard text for GPT-backed Prometheus.
- `src/agents/sisyphus.ts`: include. Added execution reporting standard text that tells the executor to define done criteria and verify before claiming completion; this matches the downstream-preserving execution discipline requested for this line of work.
- `src/agents/sisyphus-prompt.test.ts`: include. Verifies the new Sisyphus execution reporting block and keeps orchestration guardrails intact.
- `src/features/builtin-commands/commands.test.ts`: include. Verifies the `start-work` command now carries execution-reporting guidance and does not leak it into unrelated commands.
- `src/features/builtin-commands/templates/start-work.ts`: include. Adds direct execution reporting and verification rules to the `start-work` template, which is a primary entry point for this preserved workflow.
- `src/features/builtin-commands/templates/start-work.test.ts`: include. Verifies the new `start-work` reporting guidance and preserved worktree or execution-mode semantics.
- `src/features/builtin-skills/executing-plans/SKILL.md`: include. Adds the same reporting and completion checklist to the execution skill used after planning.
- `src/features/builtin-skills/skills.test.ts`: include. Verifies the execution guidance is present only in the intended builtin skill.
- `src/plugin-handlers/agent-config-handler.test.ts`: include. Verifies Prometheus prompt selection now follows the resolved model before appending override text, which protects the planner side of this workflow.
- `src/plugin-handlers/prometheus-agent-config-builder.test.ts`: include. Adds direct coverage for the same model-resolved Prometheus prompt contract.
- `src/tools/delegate-task/prompt-builder.ts`: include. Extends planner-subset prompt appending to the plan family, which keeps planner reporting guidance aligned across delegated planning flows.
- `src/tools/delegate-task/prompt-builder.test.ts`: include. Verifies plan-family prompt appending behavior and ensures executor-only text does not leak into Prometheus planning prompts.
- `src/tools/delegate-task/sync-prompt-sender.test.ts`: include. Tightens sync prompt transport coverage around the built prompt and tool restrictions, which protects delegated execution behavior for this route.
- `changes/isolate-hook-downstream-preserving-slice/`: include. This is the active plan, findings, and progress notepad for the current isolation work and must travel with the slice review story.

### Exclude

- `.opencode/oh-my-opencode.jsonc`: exclude. Local project config deletion, not part of hook or downstream-preserving product behavior.
- `.test-worktree-manager`: exclude. Subproject pointer movement with no evidence tying it to the preserved slice.
- `src/hooks/auto-update-checker/cache.test.ts`: exclude. Test isolation work for update-checker cache handling, unrelated to the downstream-preserving route.
- `src/hooks/auto-update-checker/checker/sync-package-json.test.ts`: exclude. Update-checker package sync coverage, not part of the target slice.
- `src/hooks/auto-update-checker/checker/sync-package-json.ts`: exclude. Update-checker ENOENT handling, unrelated runtime surface.
- `src/hooks/auto-update-checker/hook/workspace-resolution.test.ts`: exclude. Large test rewrite for update-checker workspace resolution, outside preserved hook or downstream scope.
- `.opencode/.lock-328c627aa123ec1f.tmp`: exclude. Temporary lock artifact.
- `.opencode/merge-analysis/`: exclude. Helpful analysis artifact for planning, but not source code or test behavior that should ship in the isolated slice.
- `.opencode/oh-my-opencode1.jsonc`: exclude. Extra local config file, not part of the product slice.
- `changes/debug-toast-and-boulder-chat/`: exclude. Separate plan directory for another issue.
- `changes/fix-full-suite-stability/`: exclude. Separate plan directory for another issue.
- `changes/restore-bounder-and-skill-suggestions/`: exclude. Separate plan directory for another issue.
- `changes/update-specialized-prompt-reporting-instructions/`: exclude. Separate plan directory outside the active isolation slice.
- `changes/verify-creating-changes-real-trigger/`: exclude. Separate verification plan.
- `changes/verify-downstream-acceptance-20260320/`: exclude. Historical verification plan, not current slice content.
- `changes/verify-observer-real-behavior/`: exclude. Separate verification plan.
- `continuous-learning/`: exclude. Untracked knowledge or notes area, not product code for this slice.
- `debug-test-scratch.txt`: exclude. Scratch artifact.
- `githubanomalyco-opencode/`: exclude. External repository copy, not part of this repo's isolated slice.
- `openai-cookbook/`: exclude. External repository copy, not part of this repo's isolated slice.
- `opencode-db-info.txt`: exclude. Scratch output file.
- `opencode-db-info2.txt`: exclude. Scratch output file.
- `reproduce_bug.ts`: exclude. Standalone reproduction scratch file with no evidence it belongs in the preserved slice.
- `scripts/`: exclude. Contains `verify-observer-harness.sh`, which is unrelated to the current hook or downstream-preserving scope.
- `tmp/`: exclude. Temporary workspace artifacts.
- `vendor/`: exclude. Vendor content not required for the isolated slice.

### Split-needed

- None identified from the currently inspected diffs. The reviewed candidate files each resolved cleanly to either the planning or execution guidance cluster above, or to unrelated local or analysis artifacts.

## Task 3 - Isolated execution lane

### Isolation method

- Chosen mechanism: clean git worktree on branch `isolate-hook-downstream-preserving-slice-lane` at `E:/github/oh-my-opencode-merge/.sisyphus/worktrees/isolate-hook-downstream-preserving-slice-lane`.
- Tracked included files were ported from the dirty repo via `git diff -- <tracked paths> | git -C <isolated-worktree> apply` logic, and untracked include files plus the active plan directory were copied into the isolated lane.
- The first apply used `git apply --index`, which staged 12 tracked files in the isolated worktree.
- That staging state triggered `src/downstream/patches/commit-size-checker-wrapper.test.ts`, because the wrapper warns on large staged commit sets.
- After `git reset HEAD -- .` in the isolated worktree, the staged-file false positive disappeared while file content stayed intact.

### Resulting file list

- `src/agents/prometheus-prompt.test.ts`
- `src/agents/prometheus/behavioral-summary.ts`
- `src/agents/prometheus/gemini.ts`
- `src/agents/prometheus/gpt.ts`
- `src/agents/sisyphus.ts`
- `src/agents/sisyphus-prompt.test.ts`
- `src/features/builtin-commands/commands.test.ts`
- `src/features/builtin-commands/templates/start-work.ts`
- `src/features/builtin-commands/templates/start-work.test.ts`
- `src/features/builtin-skills/executing-plans/SKILL.md`
- `src/features/builtin-skills/skills.test.ts`
- `src/plugin-handlers/agent-config-handler.test.ts`
- `src/plugin-handlers/prometheus-agent-config-builder.test.ts`
- `src/tools/delegate-task/prompt-builder.ts`
- `src/tools/delegate-task/prompt-builder.test.ts`
- `src/tools/delegate-task/sync-prompt-sender.test.ts`
- `changes/isolate-hook-downstream-preserving-slice/`

### Preserved gate on isolated slice

- Final command: `bun test src/hooks/atlas src/downstream`
- Final result in isolated lane: `112 pass`, `0 fail`, `215 expect() calls`, completed in `3.14s`.
- Conclusion: the isolated slice keeps the preserved downstream gate green once the lane is materialized without staged-file commit-check noise.

## Task 4 - Broader gate judgment

### Broader gates on isolated slice

- `bun test src/hooks src/downstream` -> `1669 pass`, `0 fail`, `3028 expect() calls`, completed in `78.69s`.
- `bun run typecheck` -> passed (`tsc --noEmit` exited 0).
- `bun run build` -> passed, including `generate-registry`, bundle steps, declaration emit, and schema generation.

### Side effects and judgment

- The broader test run removed several tracked auto-update-checker cache fixture files inside the isolated worktree, but those deletions were test side effects, not slice content.
- Restored side-effect paths with `git restore` for:
  - `src/hooks/auto-update-checker/__test-cache__/opencode/bun.lock`
  - `src/hooks/auto-update-checker/__test-cache__/opencode/package.json`
  - `src/hooks/auto-update-checker/checker/__test-sync-cache__/package.json`
  - `src/hooks/auto-update-checker/hook/__test-workspace-resolution__/cache/package.json`
  - `src/hooks/auto-update-checker/hook/__test-workspace-resolution__/config/package.json`
- Merge-readiness judgment: the isolated slice is merge-ready as-is. No additional hook repair is required on this slice, and no bounded follow-up repair task list is needed.

## Task 5 - Landing strategy

### Atomic commit sequence

1. Planning-prompt alignment commit
   - `src/agents/prometheus-prompt.test.ts`
   - `src/agents/prometheus/behavioral-summary.ts`
   - `src/agents/prometheus/gemini.ts`
   - `src/agents/prometheus/gpt.ts`
   - `src/plugin-handlers/agent-config-handler.test.ts`
   - `src/plugin-handlers/prometheus-agent-config-builder.test.ts`
   - `src/tools/delegate-task/prompt-builder.ts`
   - `src/tools/delegate-task/prompt-builder.test.ts`
   - `src/tools/delegate-task/sync-prompt-sender.test.ts`

2. Execution-reporting discipline commit
   - `src/agents/sisyphus.ts`
   - `src/agents/sisyphus-prompt.test.ts`
   - `src/features/builtin-commands/commands.test.ts`
   - `src/features/builtin-commands/templates/start-work.ts`
   - `src/features/builtin-commands/templates/start-work.test.ts`
   - `src/features/builtin-skills/executing-plans/SKILL.md`
   - `src/features/builtin-skills/skills.test.ts`

3. Audit-plan commit
   - `changes/isolate-hook-downstream-preserving-slice/`

### Recommended final move

- Preferred move: commit the isolated slice on branch `isolate-hook-downstream-preserving-slice-lane`, then land it from that isolated branch.
- If the eventual destination branch is still aligned with `77d78156ca22b9d995ad12e52c46aea213177455`, a normal branch merge or PR from the isolated branch is acceptable because the worktree already excludes unrelated dirt.
- If the destination branch diverges while this review waits, cherry-pick the atomic commits from `isolate-hook-downstream-preserving-slice-lane` onto the destination branch.
- Patch-port is the fallback only if branch history becomes awkward or if the destination must stay branch-clean without merging the isolation branch metadata.

### Explicit prohibition

- Do not merge the full current dirty repo.
- Do not use the original dirty worktree as the landing source.
- Only the isolated branch or cherry-picked commits from it are safe, because the original repo still contains excluded config churn, analysis artifacts, scratch files, external directories, and unrelated change plans.
