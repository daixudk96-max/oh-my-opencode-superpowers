# Design: verify-c5-guideline-anchoring

## Goal

验证 c5-guideline-anchoring 引入的 behavior-anchor hook 和 slop-detector 模块在运行时的真实行为。

## Architecture — 组件关系

```
src/shared/slop-detector.ts (纯函数 — 检测 3 种 slop 模式)
  ↓ 被调用
src/hooks/behavior-anchor/index.ts (hook — tool.execute.after)
  ↓ 注册
src/index.ts:208-210 (实例化 — isHookEnabledLoose)
  ↓ 接入
src/index.ts:468-471 (tool.execute.after 生命周期)
```

## 2 个功能详细分析

### 1. slop-detector 共享模块

| 属性 | 值 |
|------|-----|
| 路径 | `src/shared/slop-detector.ts` |
| 类型 | 纯函数（SlopDetector class） |
| 测试 | `src/shared/slop-detector.test.ts` |
| 检测规则 | 3 种 |

**3 种检测规则：**

| 规则 | 方法 | 阈值 | 触发条件 |
|------|------|------|---------|
| 过度注释 | `detectExcessiveComments` | `commentThreshold: 0.5` | 注释行占比 > 50% |
| 冗长解释 | `detectVerboseExplanations` | `verboseLengthThreshold: 500` | 代码块前文字 > 500 字符，或无代码块时总文字 > 1000 字符 |
| 重复代码 | `detectRepetitiveCode` | `repetitionThreshold: 0.3` | 重复行占比 > 30% |

### 2. behavior-anchor hook

| 属性 | 值 |
|------|-----|
| 路径 | `src/hooks/behavior-anchor/index.ts` |
| 导出 | `src/hooks/index.ts:97` |
| 实例化 | `src/index.ts:208-210` (`isHookEnabledLoose`) |
| 生命周期 | `tool.execute.after` (`src/index.ts:468-471`) |
| 测试 | `src/hooks/behavior-anchor/index.test.ts` |
| 可观察性 | output.output 追加 guidelines → agent 可见 |
| 触发逻辑 | `isSlop === true` 或 `round % refreshInterval === 0`（默认每 10 轮） |

**注入流程：**
1. 每次 tool.execute.after 触发，round++
2. `detector.detect(output.output, round)` 分析输出
3. 如果检测到 slop 或到达 refreshInterval → 追加 `config.guidelines` 到 output.output

## Key Decisions

1. slop-detector 用 bun test 验证 3 种规则 + Mode 2 验证其调用方（铁律6）
2. behavior-anchor 用 Mode 2 正向触发 — 构造含 slop 的工具输出场景
3. 需要额外验证 refreshInterval 机制（每 10 轮自动注入）

## Edge Cases

- 工具输出为空时 slop-detector 是否安全处理
- refreshInterval = 0 或负数时的行为
- 注释检测对不同语言注释风格（`//`, `/* */`, `#`, `"""`) 的支持范围
- behavior-anchor 的 round 计数器在 session 内是否持久（不重置）
