# Design: sync-upstream-preserve-downstream

## Goal

从 `dev` (bae3bdc2) 合并 `upstream/dev` (be606cdf) 的 1365 个 commit，分 5 波次解决 53 个冲突，保留下游核心功能。

## Architecture

Worktree `/tmp/upstream-merge-analysis` 中已执行 `git merge --no-commit upstream/dev`，53 个冲突文件处于 unmerged 状态。按子系统分波次解决：

- **Wave 0**: Config/Root (3 files) — schema, index.ts, .gitignore
- **Wave A**: Shared/CLI (12 files) — model 管理, doctor, cli 入口
- **Wave B**: Features (14 files) — skills, commands, boulder-state, loaders
- **Wave C**: Hooks (14 files) — 统一 KEEP_OURS (上游只是 re-export stub)
- **Wave D**: Tools/Agents (10 files) — modify/delete 决策, delegate-task

## Key Decisions

1. **Hook 统一策略 = KEEP_OURS**: 上游重构将 hook index.ts 变为 re-export stub，下游包含完整实现
2. **CLI/Loader 模块化 = KEEP_THEIRS**: 上游架构改进（拆分大文件为独立模块）
3. **Model 版本 = KEEP_THEIRS**: 上游更新更频繁
4. **合并方式 = git merge**: 保留完整历史，避免 rebase 风险

## Edge Cases

- `src/index.ts` 27 commits 复杂冲突：需手动逐段合并
- 上游删除的 5 个文件：需检查功能迁移去向
- `loader.ts` / `skill-content.ts` KEEP_THEIRS 后需验证上游子模块存在
