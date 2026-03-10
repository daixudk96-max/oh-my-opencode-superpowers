# Proposal: verify-c5-guideline-anchoring

## Problem Statement

`c5-guideline-anchoring` 引入了 2 个功能：
1. **behavior-anchor hook** — 使用 SlopDetector 监控 AI 输出质量，实时注入纠正指引
2. **slop-detector 共享模块** — 检测 AI 输出中的低质量模式（过度注释、冗长、重复）

这两个功能已有单元测试，但从未进行过真实行为触发验证。需要确认在运行时环境中 hook 是否正确触发并注入 guidelines。

## Proposed Solution

用 behavior-trigger-verify 框架验证：
- **slop-detector**: bun test（纯函数）+ 为调用方（behavior-anchor）生成 Mode 2 触发
- **behavior-anchor**: Mode 2 正向触发 — 写入含 slop 模式的代码，观察 guidelines 注入

## Success Criteria

- 2 个功能全部有 PASS/FAIL 结论 + 可观察证据
- slop-detector 3 种检测模式（过度注释、冗长解释、重复代码）分别验证
- behavior-anchor 在 tool.execute.after 中正确追加 guidelines 到 output.output
- 确认 `isHookEnabledLoose("behavior-anchor")` 在当前环境下返回 true

## Risk Assessment

- behavior-anchor 使用 `isHookEnabledLoose`（宽松匹配），可能默认启用也可能需要配置
- slop-detector 阈值（50% 注释、500 字符冗长、30% 重复）可能不容易在真实操作中精确触发
- guidelines 注入到 output.output 后，agent 能看到但用户不一定能在终端看到

## Alternatives Considered

- 只跑单元测试 → 不够，违反铁律6（纯函数的调用方需 Mode 2 验证）
- 修改阈值降低触发难度 → 不应改代码来适配测试
