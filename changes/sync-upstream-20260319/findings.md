# Findings: Sync Upstream 20260319

## 上游变更概览

- **Commits**: 589
- **Files changed**: 2619
- **Insertions**: 58,857
- **Deletions**: 358,110（净删除 ~30 万行，上游做了大规模清理/重构）

## 冲突预判结果

### 7 个热点文件变更量

| 文件 | 变更行数 | 风险 |
|------|---------|:----:|
| skills.ts | -2116 行 | 极高 |
| commands.ts | -439 行 | 高 |
| builtin-agents.ts | 383 行 | 高 |
| index.ts | 330 行 | 极高 |
| hooks.ts schema | 152 行 | 中 |
| mcp/index.ts | 126 行 | 中 |
| tools/index.ts | 30 行 | 低 |

### 上游 hook 目录变更（334 文件，+14535/-24327 行）

关键新增/改动：
- `todo-description-override/` — 新 hook，改写 TodoWrite 描述
- `todo-continuation-enforcer/` — 大量改进（stagnation、dispose、session-state）
- `atlas/` — task_sessions 机制
- `verbosity-controller/` — 被删除
- `thinking-block-validator/` — 测试被删除

### 上游关键新功能

1. **task_sessions**（atlas）：每个 task 独立 session，可跨 continuation 复用
2. **todo-description-override**：温和控制 TodoWrite 行为
3. **smart circuit breaker**：target-aware 循环检测
4. **plugin dispose**：完整 teardown 生命周期
5. **性能优化**：regex 预编译、热路径优化
6. **openclaw bidirectional**：双向通信

## 技术决策

- 接受上游版本为基础，补回下游注册行（不拒绝上游变更）
- hooks.ts schema 不补回下游 enum（用 isHookEnabledLoose 绕过）
- 同步完成后重新评估 fix-plan-update-reminder 的 8 个 bug
