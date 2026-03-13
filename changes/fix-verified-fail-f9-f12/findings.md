# Findings: fix-verified-fail-f9-f12

> 每个 Task 完成后追加结果。

## 验证结果来源

- V-1.1 FAIL: Secret Scanner Bash 拦截不工作（Edit 工具正常拦截，Bash 不拦截）
- V-2.1 FAIL: Commit Size Checker 5 文件提交无警告

## 代码审计发现

### F12 Secret Scanner
- `hasBashRedirectionOperator` 正则 `/(?:^|\s)(?:>>|2>|>)(?:\s|$)/` 要求重定向符后必须有空格或行尾
- `secret-scanner` 不在 `skipManifestNames` → 双重执行（手动 + auto-discovery）
- `runtime-hook-executor.ts:39` 的 `runHandlers` catch 吞错误 — 如果 auto-discovered 版本异常，不会影响 blocked 检查
- 手动注册路径 `index.ts:442` → `index.ts:464` 检查 `output.blocked` 是连贯的

## Task 1.2 执行补充（2026-03-13）
- 在 `src/index.ts` 的 `skipManifestNames` 集合中新增 `"secret-scanner"`，用于避免 downstream auto-discovery 与手动注册重复执行。
- 保持 `secretScanner` 的手动创建与 `tool.execute.before` 调用链不变，确保拦截语义不受影响。
- 变更为单点去重，无 hook 顺序与其它注册行为改动。

### F9 Commit Size Checker
- `commit-size-checker-wrapper.ts:11` 硬编码 `DEFAULT_WRAPPER_FILE_SAMPLE = ["file-1", "file-2", "file-3", "file-4"]`
- `commit-size-checker-wrapper.ts:28` 调用 `checker.check({ files: DEFAULT_WRAPPER_FILE_SAMPLE })` — 永远 4 文件
- `commit-size-checker.ts:136-141` 空 shouldWarn handler — 不设 output.blocked
- `commit-size-checker.ts:115-125` `getStagedFiles()` 是 private — wrapper 无法调用

## Task 1.1 追加发现（2026-03-13）

- `hasBashRedirectionOperator` 放宽为 `/(?:^|\s)(?:>>|2>|>)\s*\S+/` 后可同时覆盖 `> file` 与 `>file`。
- Bash 分支增加了防御性日志：命令存在时先记录 “Checking bash command for redirected secrets”。
- 阻断路径在 `output.blocked = true` 前增加显式日志：
  - Bash：`Blocking bash command due to detected secret in redirected output`
  - Edit/Write：`Blocking ${toolLower} for ${filePath} due to detected secret(s)`
- 新增测试覆盖 `echo "AKIAIOSFODNN7EXAMPLE" >/tmp/key.txt`，验证无空格重定向也会被拦截。

## Task 2.1 执行发现（2026-03-13）

- `src/hooks/pre-tool-use/commit-size-checker.ts` 中 `CommitSizeChecker` 接口新增 `getStagedFiles(cwd: string): string[]`，实现方法从 `private` 改为公开，保持原有非 Git 环境 `catch -> []` 安全语义不变。
- `tool.execute.before` 在 `result.shouldWarn` 为真时补全阻断行为：`output.blocked = true` 且 `output.message = result.message`。
- 保留原有命令门控链路：仅 `input.tool === "bash"` 且 `isCommitCommand(args.command)` 命中时执行 staged files 检查；`COMMIT_BLOCK_THRESHOLD` 的硬阻断优先级不变。

## Task 2.2 执行发现（2026-03-13）

- `commit-size-checker-wrapper.ts` 移除 `DEFAULT_WRAPPER_FILE_SAMPLE`，改为使用 `checker.getStagedFiles(output.args?.cwd ?? process.cwd())` 获取真实 staged 文件。
- Wrapper 在 `result.shouldWarn` 为真时显式设置 `output.blocked = true`；消息仍沿用原有 append 语义（已有 message 时前置 `\n\n`）。
- 采用“覆写实例 hook + 调用 originalHook”的实现，避免对象展开导致 class 原型方法丢失的问题，并保持原 checker 既有行为。
- 新增 non-git 场景测试（临时目录未初始化 git），验证 commit wrapper 不崩溃且不会误阻断。

## Task 3.1 验证结果（2026-03-13）

- TypeScript 编译命令：`bun run tsc --noEmit`，exit code `0`（通过）。
- 定向测试命令：`bun test src/hooks/secret-scanner src/hooks/pre-tool-use src/downstream/patches/commit-size-checker-wrapper`，exit code `0`（通过）。
- 测试汇总：`36 pass`，`0 fail`，`Ran 36 tests across 3 files`。
- 结论：本次验证范围（`secret-scanner` / `pre-tool-use` / `commit-size-checker-wrapper`）未发现失败；无可见的范围外基线失败。
