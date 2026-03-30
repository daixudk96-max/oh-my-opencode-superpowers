# Isolate hook downstream preserving slice

## TODOs

- [x] 1. Prove provenance and freeze the preserved downstream gate
  - Run `git worktree list --porcelain` from the repo root.
  - Run `git rev-parse --show-toplevel`, `git rev-parse --git-dir`, and `git rev-parse HEAD` from `.sisyphus/worktrees/fix-hook-runtime-regression-from-baseline`.
  - Run `bun test src/hooks/atlas src/downstream` from the current repo root and record the result as the non-negotiable downstream-preserving anchor gate.
  - 结果记录: append provenance facts and preserved-gate output to `findings.md`; append command results to `progress.md`.
  - QA Scenarios:
    - Tool: Bash
    - Steps: Run the git provenance commands plus `bun test src/hooks/atlas src/downstream`
    - Expected: git proves the old path resolves to the current repo, and the protected downstream gate exits 0.

- [x] 2. Build a dirty-tree scope map for hook or downstream-preserving work
  - Capture `git status --short` and classify every dirty file as `include`, `exclude`, or `split-needed`.
  - For each `include` or `split-needed` path, explain which preserved downstream behavior or hook repair objective it supports.
  - For each `exclude` path, explain why it is unrelated to this slice.
  - 结果记录: append the full scope map to `findings.md`; append summary counts and risk notes to `progress.md`.
  - QA Scenarios:
    - Tool: Read, Bash
    - Steps: Read the scope map after classification and compare it against `git status --short`
    - Expected: every dirty path is accounted for exactly once and no path is left unclassified.

- [x] 3. Isolate a clean execution lane for the hook or downstream-preserving slice
  - Choose the least risky isolation mechanism based on the scope map: clean branch, clean worktree, or staged hunk extraction.
  - Prepare a file or hunk list that contains only the preserved hook or downstream slice and excludes unrelated dirt.
  - Re-run `bun test src/hooks/atlas src/downstream` against the isolated slice.
  - 结果记录: append the isolation method and resulting file list to `findings.md`; append gate results to `progress.md`.
  - QA Scenarios:
    - Tool: Bash
    - Steps: materialize the isolated slice and run `bun test src/hooks/atlas src/downstream`
    - Expected: the isolated slice keeps the downstream-preserving gate green.

- [x] 4. Determine whether further hook repair is still needed on the isolated slice
  - Run `bun test src/hooks src/downstream`, `bun run typecheck`, and `bun run build` on the isolated slice.
  - If all pass, declare the slice merge-ready.
  - If anything fails, record the smallest failing surface and create a bounded follow-up repair task list instead of widening scope.
  - 结果记录: append full gate outputs and merge-readiness judgment to `findings.md`; append outcomes to `progress.md`.
  - QA Scenarios:
    - Tool: Bash
    - Steps: run the broader hook or downstream and safety gates on the isolated slice
    - Expected: either all commands exit 0, or the remaining failing scope is small, exact, and recorded.

- [x] 5. Package the merge strategy without mixing unrelated changes
  - Draft the atomic commit sequence for the isolated slice.
  - Specify whether merge, cherry-pick, or patch-port is the correct final move, based on the isolation result.
  - Explicitly forbid merging the full current dirty repo if unrelated changes remain.
  - 结果记录: append commit strategy and merge recommendation to `findings.md`; append final planning status to `progress.md`.
  - QA Scenarios:
    - Tool: Read
    - Steps: review the final commit strategy and compare it to the classified scope map
    - Expected: every proposed commit contains only classified relevant changes, with unrelated dirt excluded.

- [x] F1. Verification
  - Re-read proposal, design, tasks, findings, and progress for internal consistency.
  - Confirm the plan rejects the nonexistent separate-worktree merge path and keeps downstream preservation as a hard gate.
  - 结果记录: append final planning verification note to `progress.md`.
  - QA Scenarios:
    - Tool: Read
    - Steps: verify all planning docs agree on source of truth, preserved downstream gate, and isolation-first strategy
    - Expected: docs are internally consistent and execution-ready.
