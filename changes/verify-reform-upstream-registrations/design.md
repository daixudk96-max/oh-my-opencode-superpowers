# Design: verify-reform-upstream-registrations

## Goal

全面验证 Step ⑤ reform-upstream-registrations 的全部变更，确保：
- 代码正确性（编译 + 静态审计）
- 运行时正确性（manifest 发现 + factory 执行 + lifecycle 注册）
- 行为正确性（disabledHooks 过滤、blocked 异常、alwaysEnabled 豁免）
- 无回归（全量测试）

## Architecture

### 验证矩阵

| 验证维度 | 验证方法 | 验证对象 |
|---------|---------|---------|
| 编译 | `bun run tsc --noEmit` | 全项目 |
| 静态审计 | grep/代码审查 | index.ts 无手动接线残留 |
| manifest 发现 | 文件计数 + auto-registry 扫描 | 45 个 manifest |
| factory 正确性 | 单元测试 | 3 个新 manifest factory |
| disabledHooks | 单元测试 | runtime-hook-executor |
| blocked 异常 | 单元测试 | runtime-hook-executor.runToolExecuteBefore |
| alwaysEnabled | 单元测试 | runtime-hook-executor 对 final-audit |
| 全量回归 | `bun test` | 基线对比 |

### 验证模式

- **Session 0 (Mode 2 Agent)**: 编译 + 静态审计 + 单元测试编写与运行
- **Session 1 (Mode 1 CLI)**: 运行时发现验证 + 行为触发
- **Session Final**: 全量测试 + 汇总报告

## Key Decisions

1. **不修改生产代码** — 纯验证，只创建/运行测试文件
2. **单元测试在 `src/downstream/runtime-hook-executor.test.ts` 中编写** — 测试 disabledHooks/blocked/alwaysEnabled
3. **manifest factory 测试直接 import 各 manifest** — 验证返回的 lifecycle handler 类型正确
