# Proposal: fix-verified-fail-f9-f12

## Problem Statement

`verify-fix-remaining-fail-partial` 真实行为触发验证发现 2 个 FAIL：

| # | 功能 | 验证结果 | 根因 |
|---|------|---------|------|
| V-1.1 | F12 Secret Scanner Bash 拦截 | FAIL | Bash 命令含 secret + 重定向未被阻止（Edit 工具可以阻止） |
| V-2.1 | F9 Commit Size Checker | FAIL | 执行 git commit 5 文件时无警告 |

### F12 根因分析
- `secret-scanner/index.ts` 代码逻辑正确：检查 `toolLower === "bash"` → 检查重定向 → 扫描 secret → 设 `output.blocked`
- `secret-scanner` 不在 `skipManifestNames` 中 → 手动注册 + auto-discovery 双重执行
- **可能原因 1**: `output.args.command` 为 `undefined`（Bash 工具 args 结构不匹配）
- **可能原因 2**: 重定向正则 `/(?:^|\s)(?:>>|2>|>)(?:\s|$)/` 对某些命令格式匹配失败
- **可能原因 3**: `runHandlers` 中 catch 吞错导致后续 blocked 检查不到

### F9 根因分析（代码审计确认）
- `commit-size-checker-wrapper.ts:28` 调用 `checker.check({ files: DEFAULT_WRAPPER_FILE_SAMPLE })` — 硬编码 mock `["file-1", "file-2", "file-3", "file-4"]`
- `commit-size-checker.ts:136-141` 的 `shouldWarn` 处理块为空 — 不设 `output.blocked`
- Wrapper 只追加 `output.message`，不设 `output.blocked`
- 结果：4 个 mock 文件 > threshold 3 → 应该触发警告 → 但 message 追加可能被上游覆盖

## Proposed Solution

1. **F12**: 增加防御性日志 + 放宽重定向正则 + 加 `secret-scanner` 到 `skipManifestNames` 防双重执行
2. **F9**: wrapper 改用 checker 的 `getStagedFiles()` 获取真实文件 + 超阈值时设 `output.blocked = true`

## Success Criteria

1. `echo "AKIAIOSFODNN7EXAMPLE" > /tmp/test.txt` 被 secret-scanner 阻止
2. `echo "hello" > /tmp/test.txt` 不被阻止
3. `git commit` 超过阈值时 output.blocked = true 且有警告消息
4. 非 git 目录不崩溃
5. TSC 编译通过

## Risk Assessment

| 风险 | 等级 | 缓解 |
|------|:----:|------|
| 重定向正则放宽导致误报 | 低 | 仍需 secret pattern + 重定向双重条件 |
| skipManifestNames 修改 index.ts | R | 仅追加 1 个字符串到 Set |
| wrapper 改动影响上游 | 低 | wrapper 是下游独立文件(S级) |

## Upstream Safety Audit

| # | 交付物 | 类型 | 安全等级 | 碰上游文件 |
|---|--------|------|:--------:|:----------:|
| 1 | secret-scanner bash 修复 | 模块修改 | S | 否 |
| 2 | secret-scanner skipManifestNames | 注册行 | R | index.ts 1行 |
| 3 | commit-size-checker wrapper 修复 | 模块修改 | S | 否 |
| 4 | commit-size-checker 空 handler 修复 | 模块修改 | S | 否 |
