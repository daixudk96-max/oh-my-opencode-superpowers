# Proposal: verify-agent-consolidation-atlas

## Problem Statement

`agent-consolidation` / `verify-atlas` 引入了 2 个 Agent 功能：
1. **Hephaestus Agent** — "自主深度工作者" Senior Staff Engineer 人设，端到端完成复杂任务
2. **Atlas Agent** — 多模型编排器（Claude/GPT/Gemini 适配），严格 QA 协议，禁止自己写代码

两者已注册到 `builtin-agents.ts`，但没有单元测试，也没有系统化的端到端验证。`changes/verify-atlas/tasks.md` 内容仅为 `"test"`，表明之前的验证计划未完成。

## Proposed Solution

用 behavior-trigger-verify 框架验证：
- **Hephaestus**: Mode 2 正向触发 — 通过 `delegate_task` 派发任务，验证自主执行、并行子代理派发、完成保证
- **Atlas**: Mode 2 正向触发 — 验证模型路由、QA 协议、任务委派拒绝自实现
- **agent-consolidation 变更**: 静态检查 — 确认 Implementer 已废弃、`sisyphus_task` → `delegate_task` 术语迁移完成

## Success Criteria

- 2 个 Agent 全部有 PASS/FAIL 结论 + 可观察证据
- Hephaestus 自主执行一个简单任务（不中途请求确认）
- Atlas 正确路由到对应模型的 prompt，拒绝自己写代码
- agent-consolidation 的术语迁移完整（无残留 `sisyphus_task` 引用）

## Risk Assessment

- Agent 验证需要完整的多代理运行环境（delegate_task 工具可用）
- Hephaestus 的 "Do NOT Ask" 策略难以在测试中直接验证（行为约束而非代码逻辑）
- Atlas 的多模型路由依赖运行时模型配置（gcl/gemini 可能不可用）
- 部分验证可能只能做 Mode 1（需要在完整 CLI 环境中观察 Agent 行为）

## Alternatives Considered

- 只做静态代码检查 → 不够，Agent prompt 正确不代表运行时行为正确
- 只跑 Atlas prompt 生成逻辑 → 不够，需要验证模型路由和 QA 协议的实际触发
