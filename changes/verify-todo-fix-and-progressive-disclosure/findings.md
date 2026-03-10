# Findings: verify-todo-fix-and-progressive-disclosure

> 每个 Task 完成后追加结果。

## Final Verification Report

| # | 功能 | 原 Task | 验证方式 | 结果 | 备注 |
|---|------|---------|---------|------|------|
| V-1.1 | Build + 基线 | ALL | bun test | PASS | Build OK, 450 failures in baseline. |
| V-2.1 | .sisyphus 残留 | 0.1 | bash | FAIL | **30+ 处残留**，特别是 atlas 代理。 |
| V-2.2 | changes/ 规范 | 0.1 | bash | PASS | prometheus/storage 已适配。 |
| V-3.1 | Boulder gating | 1.2,1.3 | bash | FAIL | **未实现**：readPlanProgress 根本未被调用。 |
| V-3.2 | TODO 单元测试 | 1.1 | bun test | PASS | 59 tests pass (仅覆盖 API 部分)。 |
| V-4.1 | 文件存在性 (4) | 2.1-2.4 | bash | FAIL | **index.test.ts 缺失**。 |
| V-4.2 | Skill 注册 | 2.5 | bash | PASS | 注册正常。 |
| V-4.3 | Hook 注册 | 2.7 | bash | FAIL | **未注册到 index.ts**，hook 不生效。 |
| V-4.4 | HookNameSchema | 3.2 | bash | FAIL | schema 中缺失。 |
| V-4.5 | 工具名安全 | 2.4 | bash | PASS | toLowerCase() 使用正确。 |
| V-4.6 | 阻止逻辑 | 2.4 | bash | PASS | 逻辑代码存在。 |
| V-5.1 | Hook 单元测试 | 2.4 | bun test | FAIL | **测试文件缺失**无法运行。 |
| V-5.2 | 全量回归 | ALL | bun test | PASS | 无新增失败。 |
| V-6.1 | **大 .md 被阻止** | 2.4,2.7 | **主会话** | FAIL | 预期内失败：hook 未注册导致不拦截。 |
| V-6.2 | **小 .md 允许** | 2.4 | **主会话** | PASS | 正常读取。 |
| V-6.3 | **TODO 无 boulder** | 1.2,1.3 | **主会话** | FAIL | 预期内失败：gating 未实现。 |
| V-6.4 | **.sisyphus 不使用** | 0.1 | **主会话** | FAIL | 反向触发成功：仍在使用旧路径。 |

## Summary of Critical Failures
1. **mdsel-enforcer Inactive**: The hook is exported but never instantiated or added to the tool guard chain in `src/index.ts`.
2. **Missing Implementation**: The feature to scan `tasks.md` for continuation (and its associated gating) is entirely missing from the codebase, despite being marked as complete in the original plan.
3. **Incomplete Cleanup**: Over 30 references to `.sisyphus` remain, primarily in agent prompts and logic, preventing a full transition to the `changes/` directory.

