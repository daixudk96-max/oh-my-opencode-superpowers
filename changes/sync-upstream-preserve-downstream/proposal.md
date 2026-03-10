# Proposal: sync-upstream-preserve-downstream

## Problem Statement

本仓库 `dev` 分支与上游 `code-yeongyu/oh-my-opencode` 的 `dev` 分支存在严重分叉：上游有 **1365** 个新 commit，下游有 **120** 个独有 commit。直接合并产生 **53** 个文件冲突（48 content, 4 modify/delete, 1 add/add）。

## Proposed Solution

- Key approach: 从 `dev` (bae3bdc2) 出发，分 5 波次按子系统解决冲突
- Scope: 仅处理 dev 与 upstream/dev 的合并冲突
- Estimated effort: large

## Success Criteria

- [ ] upstream/dev 的 1365 个 commit 成功合并
- [ ] 53 个冲突全部解决
- [ ] `bun run build` 通过
- [ ] 核心测试通过
- [ ] 下游关键功能保留

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| modify/delete 冲突（5 文件） | Certain | High | 逐一排查上游重构意图 |
| 核心模块冲突复杂 (index.ts 27 commits) | High | High | 逐段合并 |
| 上游重构破坏 hook 注册链 | Medium | High | 合并后验证 hook 完整性 |
| 隐性回归 | Medium | High | 分波次 + 每波次构建验证 |

## Alternatives Considered

### Option 1: 分波次子系统合并 (Recommended)
- 可控、可追踪、每波次可验证

### Option 2: 一次性 git merge
- 53 个冲突同时出现难以管理

### Option 3: Rebase
- 120 个 commit 逐一 rebase 风险极高
