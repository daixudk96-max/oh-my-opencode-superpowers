# Proposal: verify-fix-continuation-start-work

## Problem Statement

`fix-continuation-loop` 和 `start-work-hardening` 引入了 2 个核心 feature 模块：
1. **run-continuation-state** — 长期运行任务的持久化状态管理，信号 CLI 是否需要下一轮迭代。修复了之前 TODO/BOULDER CONTINUATION 无限循环的 bug。
2. **boulder-state** — 计划级元数据和 worktree 状态管理，包含 retry-tracker 防无限重试、worktree-manager 管理波次并行执行的 git 工作树。

两者都有单元测试，但从未做过端到端行为验证。它们被多个 hook 间接依赖（todo-continuation-enforcer、stop-continuation-guard、plan-attention-refresher、start-work 等），是 Sisyphus 编排系统的基础设施。

## Proposed Solution

用 behavior-trigger-verify 框架验证：
- **run-continuation-state**: bun test（存储层）+ Mode 2（通过 hook 间接触发验证 CLI 信号机制）
- **boulder-state**: bun test（storage + retry-tracker + worktree-manager）+ Mode 2（通过依赖 hook 验证运行时集成）
- **fix-continuation-loop 修复**: 反向触发 — 确认无限循环已被修复（retry cap 生效）
- **start-work-hardening**: 静态检查 — 确认执行模式强制选择和 plan worktree 创建逻辑

## Success Criteria

- 2 个 feature 模块全部有 PASS/FAIL 结论 + 可观察证据
- run-continuation-state 的 CLI 信号链路完整（marker → isContinuationMarkerActive → CLI 检测）
- boulder-state 的 retry-tracker 在 3 次后正确阻断
- worktree-manager 可正确初始化 wave execution 元数据
- 无限循环 bug 已修复的证据

## Risk Assessment

- run-continuation-state 的 CLI 信号需要完整 CLI 运行环境才能端到端触发
- boulder-state 的 worktree-manager 依赖 git 环境
- retry-tracker 的 max retry 阈值（3 次）需要在真实场景中触发多次失败
- start-work hook 的执行模式选择是 Mode 1（需要用户在 CLI 中操作）
