# Progress

## 2026-03-29

- Investigated the supposed separate hook worktree and confirmed the current planning target is isolation from the current repo, not merging an independent worktree.
- Re-read the old umbrella proposal, tasks, findings, and progress to preserve the downstream contract.
- Created a new plan focused on provenance-first slice isolation before any further repair or merge work.
- Task 1 provenance proof is now recorded: `git worktree list --porcelain` shows only the current repo worktree, and rev-parse from `.sisyphus/worktrees/fix-hook-runtime-regression-from-baseline` resolves to the current repo, `.git`, and HEAD `77d78156ca22b9d995ad12e52c46aea213177455`.
- Froze `bun test src/hooks/atlas src/downstream` as the preserved downstream anchor gate after a green run: `112 pass`, `0 fail`, `215 expect() calls`, `3.67s`.
- Task 2 scope map is recorded in `findings.md` and currently classifies 17 paths as `include`, 26 paths as `exclude`, and 0 paths as `split-needed`.
- Current risk note: the relevant slice is broader than just hook files; it includes planner, executor, and delegation prompt contracts that must stay aligned when isolating the preserved route.
- Task 3 now uses a clean worktree lane at `E:/github/oh-my-opencode-merge/.sisyphus/worktrees/isolate-hook-downstream-preserving-slice-lane` instead of touching the original dirty repo.
- The first isolated-gate run failed for a non-product reason: `git apply --index` staged 12 files and tripped `commit-size-checker-wrapper.test.ts`; `git reset HEAD -- .` removed the staged-file false positive without changing content.
- After unstaging, the preserved downstream gate passed in the isolated lane: `bun test src/hooks/atlas src/downstream` -> `112 pass`, `0 fail`, `215 expect() calls`, `3.14s`.
- Task 4 broader gates are green in the isolated lane: `bun test src/hooks src/downstream` -> `1669 pass`, `0 fail`; `bun run typecheck` -> pass; `bun run build` -> pass.
- Broader tests produced tracked auto-update-checker cache deletions as side effects, but those paths were restored with `git restore`, leaving the isolated slice limited to the classified include set.
- Current judgment: the isolated slice is merge-ready without additional hook repair.
- Task 5 packaging is now defined as three atomic commits: planning-prompt alignment, execution-reporting discipline, and the audit plan docs.
- Landing recommendation: use branch `isolate-hook-downstream-preserving-slice-lane` as the only safe source, then merge or cherry-pick from that branch depending on destination divergence.
- Explicitly rejected path: merging the original dirty repo, because it still contains excluded local config churn, analysis artifacts, scratch files, external directories, and unrelated plans.
- F1 verification passed: proposal, design, tasks, findings, and progress all agree that the current repo is the only source of truth, the old path is not a separate merge target, `bun test src/hooks/atlas src/downstream` remains the hard preserved gate, and isolation-first landing via the isolated branch is the required path.
