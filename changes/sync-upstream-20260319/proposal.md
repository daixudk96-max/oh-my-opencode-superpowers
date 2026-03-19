# Proposal: Sync Upstream 20260319

## Problem Statement

下游 fork (oh-my-opencode-merge) 落后上游 (code-yeongyu/oh-my-opencode) 589 个 commits。
上游在 3月18-19日合并了多个关键改进，直接解决了我们已知的多个 bug：

- **task_sessions 机制**：每个 task 分配独立子 agent session，可跨 continuation 复用
- **todo-description-override hook**：温和控制 TodoWrite 行为
- **atlas 容错提升**：连续 10 次 prompt 失败才停止
- **熔断器重构**：滑动窗口 → 连续调用检测
- **性能优化**：regex 预编译、热路径字符串优化
- **todo-continuation 改进**：stagnation 检测、dispose 生命周期

## Proposed Solution

执行 5 阶段同步流程（sync-upstream-preserve-downstream skill）：
1. 快照下游状态
2. 冲突预判
3. 在独立分支执行 merge
4. 验证下游功能完整性
5. 修复 + 提交

## Success Criteria

- [ ] 上游 589 commits 全部合并
- [ ] 7 个热点文件的下游注册行全部保留
- [ ] 下游独立 hook/feature 目录全部存在
- [ ] `bun run build` 通过
- [ ] 下游 hook 注册数量 ≥ 合并前

## Risk Assessment

| 风险 | 级别 | 缓解 |
|------|:----:|------|
| skills.ts 删了 2116 行（上游大重构） | 极高 | 先看上游新结构再补下游 skill |
| index.ts 330 行变更 | 高 | 按 omo-sync-details.md 的 3 区域策略补回 |
| hooks.ts schema enum 变更 | 中 | 接受上游版本，下游用 isHookEnabledLoose |
| 334 个 hook 文件变更 | 中 | 下游独立 hook 不受影响，共享 hook 需逐个检查 |

## Alternatives Considered

1. **Cherry-pick 关键 commits** — 只拉 task_sessions 等关键改动。风险：后续同步更难。
2. **重建 fork** — 从上游重新 fork，手动移植下游功能。风险：工作量巨大。
3. **全量 merge（选择此方案）** — 一次性同步，痛苦但彻底。
