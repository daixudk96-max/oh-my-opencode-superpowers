# Proposal: fix-b-class-fail-hooks

## Problem Statement

verify-b-class-features 验证（13/13 tasks 完成）发现 3 个 hook 未能在真实行为测试中触发：
- **B3 debugging-injector**: 默认 `enabled: false`，生产环境下永远不会触发
- **B4 failure-counter**: 读取了错误的输出字段 `output.content`，而 delegate_task 的输出在 `output.output`/`output.result`
- **B2 codebase-assessment**: 不是真 bug，是隐形注入设计，可选健壮性改进

## Proposed Solution

- **B3**: 将 `constants.ts` 中的 `enabled` 默认值改为 `true`
- **B4**: 修正输出字段读取逻辑 + 补全 manifest lifecycle + 修正不存在的 skill 引用
- **B2**: 将 `injectedSessions.add()` 移到成功注入之后

**Key approach**: 精准修复，每个 hook 改动不超过 10 行
**Scope**: 3 个 hook 文件 + 1 个 manifest + 对应测试
**Estimated effort**: small

## Success Criteria

- [ ] B3 debugging-injector 在 `enabled: true` 下通过已有 8 个单元测试
- [ ] B4 failure-counter 能正确检测 delegate_task 的失败输出
- [ ] B4 manifest 包含 UserPromptSubmit lifecycle
- [ ] B2 injectedSessions 仅在成功注入后标记
- [ ] `bun run tsc --noEmit` 零错误
- [ ] `bun test` fail 数 ≤ 562（当前基线）

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| debugging-injector 启用后干扰正常工作流 | Low | Med | 保留 failure_threshold: 2 和 30min 窗口限制 |
| failure-counter 字段修改影响其他 hook | Low | Low | 只改 failure-counter 自身的读取逻辑 |
| 已有测试与修改冲突 | Low | Low | 先跑测试确认基线再改 |

## Dependencies

- verify-b-class-features 已完成 ✅
- dist 静态注册修复已生效 ✅
