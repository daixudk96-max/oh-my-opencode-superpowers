# Design: verify-misc-session-scorer-notepad

## Goal

验证 session-scorer 和 sisyphus-junior-notepad 在运行时的注册、实例化和行为。

## Architecture

```
src/features/session-scorer/index.ts (评分引擎)
  ├─ 评分标准: 测试覆盖(40%) + 代码质量(30%) + 任务完成度(30%)
  ├─ 等级: A(≥90) B(≥80) C(≥70) D(≥60) F(<60) N/A(无数据)
  └─ 触发: session.stop 事件
      ↓ 注册
  src/index.ts → sessionScorer 实例
      ↓ 接入
  event handler → session.stop → 输出 "会话质量: X (N/100)"

src/hooks/sisyphus-junior-notepad/hook.ts (条件性笔记本注入)
  ├─ 触发条件: tool === "task" && isCallerOrchestrator && !已注入
  ├─ 注入内容: NOTEPAD_DIRECTIVE（强制用 Edit append findings.md）
  └─ 防重复: 检查 SYSTEM_DIRECTIVE_PREFIX 是否已存在
      ↓ 注册
  src/config/schema/hooks.ts → HookNameSchema "sisyphus-junior-notepad"
  src/plugin/hooks/create-session-hooks.ts → safeHook 实例化
      ↓ 接入
  tool.execute.before → 拦截 task 调用 → 修改 args
```

## 2 个功能详细分析

### 1. session-scorer

| 属性 | 值 |
|------|-----|
| 路径 | `src/features/session-scorer/index.ts` |
| 导出 | `QualityGrade`, `SessionMetrics`, `SessionScorer`, `createSessionScorer` |
| 注册 | `src/index.ts` — 实例化为 `sessionScorer` |
| 生命周期 | `event` handler → `session.stop` |
| 测试 | `src/features/session-scorer/index.test.ts` ✅ |
| 可观察性 | log 输出 "会话质量: X (N/100)" → **AGENT_INVISIBLE**（log 不在 output.output） |

**评分公式：**
```
总分 = (testCoverage * 0.4) + (codeQuality * 0.3) + (taskCompletion * 0.3)
testCoverage = (filesWithTests / modifiedFiles) * 100
codeQuality = 100 - (lintErrors * 2) - (typeErrors * 5)   // min 0
taskCompletion = (tasksCompleted / tasksTotal) * 100
```

### 2. sisyphus-junior-notepad

| 属性 | 值 |
|------|-----|
| 路径 | `src/hooks/sisyphus-junior-notepad/` |
| 文件 | constants.ts, hook.ts, index.ts, index.test.ts |
| Schema | `src/config/schema/hooks.ts` → `"sisyphus-junior-notepad"` |
| 实例化 | `src/plugin/hooks/create-session-hooks.ts` → `safeHook` |
| 生命周期 | `tool.execute.before` |
| 触发条件 | tool === "task" && isCallerOrchestrator && !已注入 |
| 注入目标 | task 工具的 prompt 参数 → 前置 NOTEPAD_DIRECTIVE |
| 测试 | `index.test.ts` ✅ |
| 可观察性 | args 修改 → agent 间接可观察（子代理收到的 prompt 被修改） |

## Key Decisions

1. session-scorer 的 session.stop 触发标记为 AGENT_INVISIBLE — log 输出 agent 看不到
2. session-scorer 优先用 bun test 验证评分逻辑正确性
3. sisyphus-junior-notepad 用 bun test + Mode 2（通过 task 工具调用验证 args 修改）
4. sisyphus-junior-notepad 的 `isCallerOrchestrator` 条件在非 Atlas 上下文中不会触发 — 需标注

## Edge Cases

- session-scorer: 无修改文件 + 无任务 → Grade N/A
- session-scorer: lintErrors 极多导致 codeQuality < 0 → 应 clamp 到 0
- sisyphus-junior-notepad: 非 Atlas 调用 task → 不注入（正确行为）
- sisyphus-junior-notepad: 已注入后再次调用 task → 不重复注入（防重复机制）
