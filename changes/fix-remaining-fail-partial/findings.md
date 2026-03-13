# Findings: fix-remaining-fail-partial

> 每个 Task 完成后追加结果。

## 调研阶段发现

### F-1: F11 relevance-scorer 是误报
- `src/shared/relevance-scorer.ts` 被 `src/features/context-injector/collector.ts` (L154-155) 使用
- 通过 `agent-skill-reminder` 流程间接集成
- 原始验证报告错误标记为 "未使用"
- **决策**: 标记为 PASS，只需文档更新

### F-2: F8 Pattern C wrapper 已就位
- `src/downstream/patches/mcp-startup-health-check.ts` 已实现 `createBuiltinMcpsWithStartupHealthCheck()`
- 只需在 `src/index.ts` 中替换 1 行调用
- 非阻塞设计（void promise）不影响启动速度

### F-3: F9 硬编码 mock 确认
- `commit-size-checker.ts` 中 `["file1", "file2", "file3", "file4"]` 确认为占位符
- 需替换为真实 git 调用

### F-4: F12 bash 拦截范围
- secret-scanner 当前只拦截 Write/Edit 工具
- Bash 工具的 `args.command` 未被扫描
- 需要同时满足 "含 secret pattern" + "含重定向" 两个条件才拦截
