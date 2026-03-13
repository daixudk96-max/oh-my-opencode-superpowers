# Design: fix-remaining-fail-partial

## Goal

修复路线图中剩余 4 个 FAIL + 1 个 PARTIAL 项，使全部已验证功能达到 PASS 状态。

## Architecture

5 个修复项相互独立，可并行实现。

### F8: MCP Health Checker 接入

```
现状: src/downstream/patches/mcp-startup-health-check.ts (Pattern C wrapper 已存在)
     └── createBuiltinMcpsWithStartupHealthCheck() 已实现
     └── 但 src/index.ts 仍调用原始 createBuiltinMcps

修复: src/index.ts 中 createTools 或 MCP 初始化路径
     └── 替换为 wrapper 版本，启动时触发 checkAllOnStartup()
```

### F9: Commit Size Checker 增强

```
现状: src/hooks/pre-tool-use/commit-size-checker.ts
     └── 硬编码 mock: ["file1", "file2", "file3", "file4"]
     └── 只追加到 output.message，不设 blocked

修复: src/downstream/patches/commit-size-checker-wrapper.ts
     └── 用 git diff --cached --name-only 获取真实 staged 文件
     └── 超过阈值时设 output.blocked = true
     └── 失败时 fallback 允许提交
```

### F11: relevance-scorer 文档更新

```
现状: src/shared/relevance-scorer.ts 被 ContextCollector 使用
     └── 路线图错误标记为 FAIL

修复: docs/upgrade/downstream-migration-roadmap.md
     └── F11 行改为 PASS + 备注"实际已被 context-injector/collector.ts 使用"
```

### F12: Secret Scanner Bash 扩展

```
现状: src/hooks/secret-scanner/index.ts
     └── 拦截 Write/Edit 工具的 secret
     └── 不检查 Bash 工具的重定向命令

修复: secret-scanner hook
     └── 增加对 Bash 工具 args.command 的扫描
     └── 检测 echo/printf + 重定向(>, >>, 2>)组合中的 secret pattern
     └── 仅在命令包含已知 secret 模式时拦截
```

### P1: start-work 执行模式切换

```
现状: src/hooks/start-work/start-work-hook.ts
     └── selectExecutionMode 解析 --mode 参数
     └── 但不更新 boulder.json 也不给用户反馈

修复: start-work-hook.ts
     └── 模式切换时写入 boulder.json.execution_mode
     └── 向 contextInfo 追加 "Switching to {mode} mode" 消息
```

## File Structure

```
src/index.ts                                          (MODIFY: F8, 1行 wrapper)
src/downstream/patches/commit-size-checker-wrapper.ts  (MODIFY: F9)
src/hooks/secret-scanner/index.ts                      (MODIFY: F12)
src/hooks/start-work/start-work-hook.ts                (MODIFY: P1)
docs/upgrade/downstream-migration-roadmap.md           (MODIFY: F11 doc)
```

## Key Decisions

1. **F8 用已有 wrapper** — 不重新实现，Pattern C wrapper 已就位
2. **F9 真实 git 调用** — 用 `execSync('git diff --cached --name-only')` 而非 mock
3. **F12 不拦截正常重定向** — 只在命令同时含 secret pattern + 重定向时拦截
4. **P1 最小改动** — 只补状态写入和反馈消息，不重构整个 start-work 流程

## Edge Cases

- F8: MCP 服务不可达时 health check 不应阻塞启动（非阻塞 void promise）
- F9: 非 git 目录时跳过检查（fallback 允许）
- F12: 多行 bash 命令、heredoc 中的 secret — 暂只处理单行重定向
- P1: boulder.json 不存在时跳过模式写入
