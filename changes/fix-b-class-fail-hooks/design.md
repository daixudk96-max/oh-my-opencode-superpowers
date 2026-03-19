# Design: fix-b-class-fail-hooks

## Goal

修复 3 个在 B 类验证中 FAIL 的 hook，使其在生产环境中正常工作。

## Architecture

精准定点修复，不涉及架构变更。每个修复独立，可单独验证。

### 修复矩阵

| Hook | 问题类型 | 修改文件 | 修改量 |
|------|---------|---------|:------:|
| B3 debugging-injector | 配置 bug | constants.ts | ~1 行 |
| B4 failure-counter | 逻辑 bug | index.ts, manifest.ts | ~5 行 |
| B2 codebase-assessment | 健壮性 | index.ts | ~3 行 |

## Tech Stack

- Runtime: Bun
- Test: `bun test` (Bun 内置测试运行器)
- Build: `bun run build`

## File Structure

```
src/hooks/debugging-injector/
├── constants.ts              # Modify: enabled false → true
├── index.ts                  # No change
└── debugging-injector.test.ts # Verify: 8 tests pass

src/hooks/failure-counter/
├── constants.ts              # Verify: skill 引用
├── index.ts                  # Modify: output field reading
└── types.ts                  # No change

src/downstream/hooks/failure-counter/
└── manifest.ts               # Modify: add UserPromptSubmit lifecycle

src/hooks/codebase-assessment/
└── index.ts                  # Modify: move injectedSessions.add
```

## Key Decisions

1. **Decision**: B3 改默认值而非在 manifest 传入配置
   - **Why**: 保持 manifest 简洁，默认应该是启用状态
   - **Trade-off**: 如果用户想禁用需要通过 disabledHooks 配置

2. **Decision**: B4 同时读 output.content + output.output + output.result
   - **Why**: 不同工具可能用不同字段，兼容性最好
   - **Trade-off**: 可能匹配到误报，但 failure 正则足够严格

3. **Decision**: B2 移动 injectedSessions.add 到 output.parts.push 之后
   - **Why**: 如果注入失败不应标记已注入
   - **Trade-off**: 极端情况下可能注入两次（race condition），但影响极小

## Edge Cases

- delegate_task 输出为空/undefined: 应视为未知，不计数
- debugging-injector 在 subagent 中: 应按原有逻辑过滤
- codebase-assessment 并发调用: injectedSessions Set 天然防重

## Open Questions

- [x] failure-counter 引用的 `systematic-debugging` skill 是否存在？→ 不存在，需要替换或移除
