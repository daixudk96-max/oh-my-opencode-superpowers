# Proposal: verify-b-class-features

## Problem Statement

路线图 ①~⑥ 已全部完成，dist 静态注册修复也已就绪（63 manifest 打包成功）。但 41 个 B 类功能（代码存在 + manifest 已注册）从未经过真实行为触发验证。我们无法确认这些功能在 dist 生产环境下是否真正生效。

此前 ⑤ 的验证明确暴露了 auto-registry 在 dist 下全面失效的问题（已通过 `generate-registry.ts` 静态注册修复），但修复后尚未在真实 CLI 中确认过任何一个下游 hook/skill/command 能正常触发。

## Proposed Solution

分三个 Session 对 41 个 B 类功能进行分层验证：

- **Session 0 (静态基线)**: tsc + manifest 计数 + 单元测试扫描，确立验证起点
- **Session 1 (真实行为触发)**: 在 dist 构建的 CLI 中逐一触发 hooks/skills/commands，观察实际行为
- **Session 2 (汇总 + 回归)**: 全量 bun test + 汇总报告

**Key approach**: 不修改生产代码，纯验证。对每个功能标注 PASS/FAIL/AGENT_INVISIBLE。
**Scope**: 41 个 B 类功能（原 B1-B30 + C→B 重分类 11 项）
**Estimated effort**: medium（主要是触发验证，不涉及代码修改）

## Success Criteria

- [ ] 41 个 B 类功能全部标注验证状态（PASS/FAIL/AGENT_INVISIBLE）
- [ ] dist 环境下至少 1 个 hook 成功拦截（证明静态注册修复有效）
- [ ] 全量 bun test 无新增 regression（与 ⑥ 基线对比）
- [ ] findings.md 包含每个功能的验证证据

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| dist 环境下静态注册仍有问题 | Low | High | Session 0 先确认 build 成功 + manifest 被打包 |
| 部分 hook 需要特定上下文才能触发 | High | Low | 标记为 AGENT_INVISIBLE，记录触发条件 |
| Windows 环境导致路径问题 | Med | Med | 使用 path.join 和跨平台正则 |

## Alternatives Considered

### Option 1: 逐一真实触发 (Recommended)
- **Pros**: 最高置信度，能发现运行时问题
- **Cons**: 耗时较长，部分 hook 难以触发
- **Why chosen**: 之前 ⑤ 验证就是因为跳过了真实触发才遗漏了 dist 失效问题

### Option 2: 仅单元测试
- **Pros**: 快速，可自动化
- **Cons**: 无法验证 dist 打包和 auto-registry 集成
- **Why not chosen**: 单元测试不能覆盖打包后的运行时行为

## Dependencies

- ⑥ verify-and-cleanup 已完成 ✅
- dist 静态注册修复已提交 ✅
- `bun run build` 成功 ✅
