# Proposal: verify-reform-upstream-registrations

## Problem Statement

Step ⑤ `reform-upstream-registrations` 已完成代码变更（18 个 task），但验证不完整：
- 4.3 全量 `bun test` 未执行（命令不兼容当时环境）
- runtime-hook-executor 的 `disabledHooks` 过滤和 `blocked` 异常抛出未通过真实行为触发验证
- 3 个新 manifest（session-scorer, commit-size-checker, final-audit）未通过单元测试验证 factory 正确性
- `alwaysEnabled` 语义未验证（final-audit 在 disabledHooks 中仍应加载）

## Proposed Solution

采用 **Mode 2 (Agent) + Mode 1 (CLI)** 两阶段验证：
1. Mode 2: 编译检查 + 静态代码审计 + 单元测试
2. Mode 1: 运行时 manifest 发现验证 + 行为触发验证

## Success Criteria

1. `bun run tsc --noEmit` 通过
2. 45 个 manifest 全部被发现
3. index.ts 无手动 hook 残留（0 个 `createXxxHook` / `isHookEnabledLoose` / `skipManifestNames`）
4. runtime-hook-executor 单元测试覆盖 disabledHooks + blocked + alwaysEnabled
5. 3 个新 manifest 的 factory 返回正确 lifecycle handler
6. 全量测试无新增 regression
