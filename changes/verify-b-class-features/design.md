# Design: verify-b-class-features

## Goal

验证 41 个 B 类功能在 dist 生产环境下能正常工作，确认静态注册修复有效。

## Architecture

分层验证架构：静态验证 → 单元测试 → 真实行为触发 → 汇总回归。

每个功能经过三级验证筛选：
1. **Level 0 (静态)**: manifest 存在 + tsc 编译通过 + 被 generated-registry.ts 包含
2. **Level 1 (单元测试)**: 相关 .test.ts 通过（如有）
3. **Level 2 (行为触发)**: 在 dist CLI 中触发实际行为，观察输出

### 验证矩阵

| 类别 | 数量 | Level 0 | Level 1 | Level 2 |
|------|:----:|:-------:|:-------:|:-------:|
| Hooks | 28 | manifest 检查 | .test.ts | agent 操作触发 |
| Skills | 8 | manifest 检查 | SKILL.md 加载 | /skill 命令调用 |
| Commands | 6 | manifest 检查 | 模板加载 | /command 执行 |
| Modules | 4 | 文件存在 | .test.ts | 相关功能调用 |

### 验证模式说明

| Session | Mode | 执行者 | 可观察渠道 |
|---------|:----:|--------|-----------|
| 0 | Setup | agent | CLI 输出 (tsc/grep/wc) |
| 1 | 2 正向 | agent (当前会话) | hook 阻止消息 / 工具输出追加 |
| 2 | 汇总 | agent | bun test 输出 |

## Tech Stack

- Runtime: Bun
- Build: `bun run build` (含 generate-registry 预处理)
- Test: `bun test` (Bun 内置测试运行器)
- Verify: dist/index.js (编译后产物)

## File Structure

```
changes/verify-b-class-features/
├── proposal.md          # 本文件
├── design.md            # 设计文档
├── tasks.md             # 验证任务清单
├── findings.md          # 验证结果记录
└── progress.md          # 执行进度
```

不创建/修改任何 src/ 文件。纯验证操作。

## Key Decisions

1. **Decision**: 不修改生产代码
   - **Why**: 纯验证阶段，避免引入新风险
   - **Trade-off**: 发现问题只记录不修复，修复留给下一个 changes

2. **Decision**: 按类别分组验证而非逐一验证
   - **Why**: Hooks 触发模式相似，可以批量验证（如所有 PreToolUse hooks 用一个操作同时触发）
   - **Trade-off**: 个别 hook 可能被遗漏，需要补充验证

3. **Decision**: AGENT_INVISIBLE 作为合法验证状态
   - **Why**: 部分 hook（如 session-scorer, final-audit）只在 session 结束时触发，agent 无法观察
   - **Trade-off**: 这些功能需要人工在真实 CLI 中验证

## Edge Cases

- hook 需要特定配置才生效（如 disabledHooks 列表）: 检查默认配置是否启用
- skill 需要特定文件才触发（如 mdsel 需要 .md 文件）: 准备测试文件
- command 需要特定状态（如 /instinct-export 需要有 instinct 数据）: 标注前置条件

## Open Questions

- [ ] dist 环境下 auto-registry 的 hook 执行顺序是否与 src/ 开发模式一致？
- [ ] 部分 C→B 重分类项（如 worktree-manager）的验证是否需要创建真实 worktree？
