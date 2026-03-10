# Proposal: verify-misc-session-scorer-notepad

## Problem Statement

"其他零散新增"（section 19）中有 4 个功能，其中 boulder-state 和 run-continuation-state 已在 `verify-fix-continuation-start-work` 中覆盖。剩余 2 个功能从未被系统化验证：

1. **session-scorer** (`src/features/session-scorer/`) — 会话质量评分 (Grade A-F)，基于测试覆盖(40%)、代码质量(30%)、任务完成度(30%)。来自 50-enhancements，在 `session.stop` 事件时输出评分。
2. **sisyphus-junior-notepad** hook (`src/hooks/sisyphus-junior-notepad/`) — Sisyphus Junior agent 的条件性笔记本，拦截 Atlas 编排器的 `task` 调用，注入 findings.md 写入指令，防止子代理陷入重复失败循环。来自 50-enhancements。

两者都有单元测试，但缺乏运行时行为验证。

## Proposed Solution

- **session-scorer**: bun test（评分逻辑）+ Mode 2 正向触发（观察 session.stop 事件是否输出评分）
- **sisyphus-junior-notepad**: bun test + Mode 2 正向触发（通过 task 工具调用验证指令注入）

## Success Criteria

- session-scorer 在 session.stop 时正确输出 `会话质量: X (N/100)` 格式的评分
- sisyphus-junior-notepad 在 Atlas 编排器调用 task 时正确注入 NOTEPAD_DIRECTIVE
- 两个功能的单元测试全部通过

## Risk Assessment

- session-scorer 的 session.stop 事件在当前 agent 会话中难以主动触发（需要会话结束）
- sisyphus-junior-notepad 需要 Atlas 编排器身份才能触发（`isCallerOrchestrator` 检查）
- session-scorer 的评分数据（modifiedFiles, lintErrors, tasksCompleted）需要真实会话上下文
