# Proposal: fix-remaining-fail-partial

## Problem Statement

路线图 Step ④ 中 4 个 FAIL + 1 个 PARTIAL 项尚未修复：

| # | 功能 | 问题 | 来源 |
|:-:|------|------|------|
| F8 | MCP Health Checker | `checkAllOnStartup()` 存在但未被调用 | verify-integrate-missing |
| F9 | Commit Size Checker | 使用硬编码 mock 文件列表，警告不可见 | verify-integrate-missing |
| F11 | relevance-scorer | ~~死代码~~ → 实际已被 ContextCollector 使用（误报） | verify-fix-and-implement |
| F12 | Bash 拦截正则 | secret-scanner 不拦截 bash 工具的重定向 | verify-auth |
| P1 | start-work 执行模式 | 缺少 sequential/parallel 模式切换反馈 | verify-fix-continuation |

## Proposed Solution

1. **F8**: 在 `src/index.ts` 中接入已有的 `createBuiltinMcpsWithStartupHealthCheck` wrapper（Pattern C wrapper 已存在）
2. **F9**: 替换 mock 文件列表为真实 `git diff --cached` 检测 + 设置 `output.blocked` 使警告可见
3. **F11**: 仅更新路线图文档标记为 PASS（不需要代码修改）
4. **F12**: 扩展 secret-scanner 的 bash 拦截，增加重定向模式（`>`, `>>`, `2>`）检测
5. **P1**: 在 start-work 中补全模式切换时的状态更新 + 用户反馈消息

## Success Criteria

1. MCP health check 在插件启动时被调用（日志可见）
2. 大提交（>10 文件）时 commit 被 blocked 且有明确提示
3. F11 在路线图中标记为 PASS
4. bash 命令含敏感重定向时被 secret-scanner 拦截
5. start-work `--mode parallel` 切换后 boulder.json 更新且有确认消息

## Risk Assessment

| 风险 | 等级 | 缓解 |
|------|:----:|------|
| F8 修改 index.ts | R | 仅 1 行 wrapper 替换，Pattern C 已就位 |
| F9 git 调用失败 | 低 | 失败时 fallback 为允许提交 |
| F12 正则过于激进 | 中 | 只拦截含已知 secret 的重定向，不拦截正常重定向 |

## Upstream Safety Audit

| # | 交付物 | 类型 | 安全等级 | 应用 Pattern | 碰上游文件 |
|---|--------|------|:--------:|:------------:|:----------:|
| 1 | F8 MCP wrapper 接入 | 注册行 | R | C (已有wrapper) | index.ts 1行 |
| 2 | F9 commit-size-checker 增强 | 模块修改 | S | — | 否(下游独立文件) |
| 3 | F11 文档更新 | 文档 | S | — | 否 |
| 4 | F12 secret-scanner bash 扩展 | 模块修改 | S | — | 否(下游hook) |
| 5 | P1 start-work 模式切换 | 模块修改 | S | — | 否(下游hook) |

- 碰上游文件数: 1（index.ts 1 行 wrapper 替换）
- 存活预测: 98%+
