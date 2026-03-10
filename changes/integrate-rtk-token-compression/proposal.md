# Proposal: integrate-rtk-token-compression

## Problem Statement

oh-my-opencode-merge 已有 `preemptive-compaction`（78% 阈值触发上下文压缩）和 `tool-output-truncator` 两种 token 优化手段，但这些都是**事后压缩**——等 token 已经产生后再截断或压缩。

rtk (Rust Token Killer) 能在**命令执行层**就压缩输出，对 git/build/test 等常见命令实现 60-99% 的 token 节省。但目前 rtk 与 OMO 没有集成，用户需要手动在每条命令前加 `rtk` 前缀，或依赖 CLAUDE.md 指令注入（不可靠）。

OMO 已有成熟的 `tool.execute.before` hook 系统，可以在命令执行前透明拦截并重写——这恰好是 rtk 集成的完美入口。

## Proposed Solution

在 OMO 的 hook 系统中新增 `rtk-rewrite` hook：

- 利用 `tool.execute.before` 事件拦截 Bash 工具调用
- 调用 `rtk rewrite` 重写命令（加 `rtk` 前缀）
- 参照 `non-interactive-env-hook.ts` 的模式实现
- 通过配置项 `rtk.enabled` 控制启用/禁用
- rtk 不可用时静默跳过

- **Key approach**: 在 OMO hook 系统中集成 rtk 命令重写
- **Scope**: 新增 hook + 配置项；不修改 rtk 核心逻辑，不修改 OMO 框架
- **Estimated effort**: small

## Success Criteria

- [ ] OMO 用户的 Bash 命令被透明拦截并自动经 rtk 压缩
- [ ] 无需 CLAUDE.md 指令注入，100% 覆盖率
- [ ] 可通过配置 `rtk.enabled: false` 禁用
- [ ] rtk 未安装时不影响 OMO 正常运行
- [ ] 与现有 hooks（non-interactive-env、tool-output-truncator）无冲突

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OMO hook 执行顺序冲突 | Low | Low | 放在 non-interactive-env 之后，truncator 之前 |
| rtk.exe 不在 PATH | Med | Med | 启动时检测，不可用则跳过 |
| rtk rewrite 改变命令语义 | Low | High | rtk rewrite 仅加前缀，不修改命令本身 |
| 与 tool-output-truncator 重复压缩 | Low | Low | rtk 压缩输出格式，truncator 截长度，互补不冲突 |

## Alternatives Considered

### Option 1: OMO hook 集成 (Recommended)
- **Pros**: 利用已有 hook 系统、跨平台、透明拦截
- **Cons**: 依赖 rtk 外部二进制
- **Why chosen**: 最小侵入性，复用已有基础设施

### Option 2: 内嵌 rtk 输出过滤逻辑
- **Pros**: 不依赖外部二进制
- **Cons**: 需要重写 rtk 的 50+ 命令 filter（维护成本极高）
- **Why not chosen**: rtk 更新频繁，内嵌无法跟进

### Option 3: 仅在 OMO 文档中推荐 rtk
- **Pros**: 零开发工作
- **Cons**: 用户需手动配置，覆盖率低
- **Why not chosen**: 不符合 OMO "batteries-included" 理念

## Dependencies

- rtk v0.27.x 已安装（用户侧）
- oh-my-opencode-merge hook 系统（已有）
- `non-interactive-env-hook.ts` 作为参考实现

## Timeline

- Phase 1: Hook 实现 + 注册
- Phase 2: 配置项 + 文档
- Phase 3: 测试
