# Proposal: verify-test-hooks-real-environment3

## Problem Statement

`test-hooks-real-environment` 引入了 3 个 hook 功能，之前的验证（2026-01-24）发现部分未触发。
代码库已经过重构（plugin 架构），3 个 hook 均已接入生命周期，但需要在新架构下重新验证。

## Proposed Solution

用 behavior-trigger-verify 框架对 3 个 hook 执行真实行为触发验证：
1. **background-notification** — 正向触发（Mode 2）
2. **directory-agents-injector** — 正向触发（Mode 2）
3. **comment-checker** — 正向触发（Mode 2）+ 单元测试

## Success Criteria

- 3 个 hook 全部有 PASS/FAIL 结论 + 可观察证据
- 发现的问题记录到 findings.md
- 之前的已知问题（comment-checker CLI 异步、directory-readme-injector 子目录限制）验证是否已修复

## Risk Assessment

- comment-checker 依赖外部 CLI 二进制（rtk/comment-checker.exe），环境依赖风险
- background-notification 需要后台任务完成才能触发，条件较特殊
- directory-agents-injector 有 native support 检测，可能被自动禁用

## Alternatives Considered

- 只跑单元测试 → 不够，之前单元测试通过但真实环境未触发
- 只做静态检查 → 违反铁律6，无法确认运行时行为
