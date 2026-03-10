# Design: verify-test-hooks-real-environment3

## Goal

验证 test-hooks-real-environment 引入的 3 个 hook 在新 plugin 架构下的真实运行时行为。

## Architecture — Hook 注册链路

```
src/hooks/index.ts (导出)
  ↓
src/plugin/hooks/create-tool-guard-hooks.ts (实例化 comment-checker, directory-agents-injector)
src/plugin/hooks/create-continuation-hooks.ts (实例化 background-notification)
  ↓
src/plugin/tool-execute-before.ts (tool.execute.before 生命周期)
src/plugin/tool-execute-after.ts  (tool.execute.after 生命周期)
src/plugin/chat-message.ts        (chat.message 生命周期)
src/plugin/event.ts               (event 生命周期)
```

## 3 个 Hook 详细分析

### 1. background-notification

| 属性 | 值 |
|------|-----|
| 路径 | `src/hooks/background-notification/` |
| 导出 | `src/hooks/index.ts:16` |
| 实例化 | `src/plugin/hooks/create-continuation-hooks.ts:102` |
| 生命周期 | `chat.message` (注入通知), `event` (监听后台完成) |
| 可观察性 | chat.message 输出中追加通知文本 → agent 可见 |
| 验证模式 | Mode 2 正向 — 启动后台任务，等待完成，观察通知注入 |
| 条件 | `isHookEnabled("background-notification")` 且有 BackgroundManager |

### 2. directory-agents-injector

| 属性 | 值 |
|------|-----|
| 路径 | `src/hooks/directory-agents-injector/` |
| 导出 | `src/hooks/index.ts:7` |
| 实例化 | `src/plugin/hooks/create-tool-guard-hooks.ts:68-81` |
| 生命周期 | `tool.execute.before/after` (读文件时注入), `event` (清缓存) |
| 可观察性 | output.output 追加 AGENTS.md 内容 → agent 可见 |
| 验证模式 | Mode 2 正向 — 在有 AGENTS.md 的目录读文件，观察注入 |
| 条件 | `isHookEnabled` 且 `!hasNativeSupport`（OpenCode 无原生支持时才启用） |

### 3. comment-checker

| 属性 | 值 |
|------|-----|
| 路径 | `src/hooks/comment-checker/` |
| 导出 | `src/hooks/index.ts:5` |
| 实例化 | `src/plugin/hooks/create-tool-guard-hooks.ts:56-58` |
| 生命周期 | `tool.execute.before` (记录 pendingCall), `tool.execute.after` (执行检查) |
| 可观察性 | output.output 追加注释警告 → agent 可见 |
| 验证模式 | Mode 2 正向 + bun test |
| 条件 | `isHookEnabled("comment-checker")` |
| 已知问题 | 之前测试 CLI 二进制异步下载未完成导致静默失败 |

## Key Decisions

1. 3 个 hook 全部用 Mode 2 正向触发（代码已接入生命周期）
2. comment-checker 额外跑单元测试验证 CLI 层逻辑
3. directory-agents-injector 需要先确认 native support 检测是否禁用了 hook

## Edge Cases

- background-notification: 后台任务快速完成时通知可能在下次 chat.message 才注入
- directory-agents-injector: OpenCode 有原生 AGENTS.md 支持时 hook 自动禁用
- comment-checker: Windows 上 CLI 路径可能不同；CLI 下载失败时静默跳过
