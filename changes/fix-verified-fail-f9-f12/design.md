# Design: fix-verified-fail-f9-f12

## Goal

修复验证发现的 F12 Secret Scanner Bash 拦截失败 + F9 Commit Size Checker 静默无警告。

## Architecture

### F12: Secret Scanner Bash 修复

```
问题链路:
  index.ts:442 → secretScanner.tool.execute.before(input, output)
  index.ts:462 → downstreamHooks.runToolExecuteBefore(input, output)  ← 也会运行 secret-scanner
  index.ts:464 → if (output.blocked) throw Error  ← 只在手动调用链检查

  BUT: runHandlers() 在 runtime-hook-executor.ts:39 catch 住了所有错误
       如果 auto-discovered 版本的 secret-scanner 抛异常，会被吞掉

修复方案:
  1. 在 secret-scanner bash 路径添加防御性日志
  2. 放宽重定向正则（去掉 (?:\s|$) 结尾锚定，允许 >filename 无空格）
  3. 加 secret-scanner 到 skipManifestNames（防双重执行）
  4. 确保 output.blocked 在手动调用路径生效（已由 index.ts:464 保证）
```

### F9: Commit Size Checker 修复

```
问题链路:
  index.ts:401 → commitSizeChecker.tool.execute.before(input, output)
    └── wrapper.ts:21-33:
          1. 调用 checker.tool.execute.before(input, output)  ← checker 空 handler，什么都不做
          2. 用 DEFAULT_WRAPPER_FILE_SAMPLE (mock) 做 check   ← 永远 4 文件
          3. 超阈值只追加 message，不设 blocked              ← 用户看不到

修复方案:
  1. 删除 DEFAULT_WRAPPER_FILE_SAMPLE，改用 checker.getStagedFiles()
     BUT: getStagedFiles() 是 private 方法 → 需要暴露或在 wrapper 中直接实现
  2. wrapper 中超阈值时设 output.blocked = true
  3. checker 的空 shouldWarn handler 填充完整逻辑（作为防御）
```

## File Structure

```
src/hooks/secret-scanner/index.ts           (MODIFY: F12, 放宽正则 + 防御日志)
src/hooks/pre-tool-use/commit-size-checker.ts (MODIFY: F9, 填充空 handler + 暴露 getStagedFiles)
src/downstream/patches/commit-size-checker-wrapper.ts (MODIFY: F9, 用真实 staged 文件 + blocked)
src/index.ts                                 (MODIFY: 加 secret-scanner 到 skipManifestNames)
```

## Key Decisions

1. **F12 正则放宽而非重写** — 当前正则 `/(?:^|\s)(?:>>|2>|>)(?:\s|$)/` 要求重定向符前后有空格，但 `>filename` (无空格) 也是合法重定向
2. **F9 在 wrapper 中实现而非 checker** — wrapper 是下游独立文件(S级)，修改 checker(下游直接文件) 风险更低但需保持两处一致
3. **添加 skipManifestNames** — 防止 secret-scanner 双重执行，统一走手动注册路径

## Edge Cases

- F12: heredoc 中的 secret（`cat << EOF > file`）— 暂只处理单行
- F12: 管道重定向（`cmd | tee file`）— 不拦截，因为不含 `>` 直接重定向
- F9: 非 git 目录 — `getStagedFiles()` 已有 try-catch 返回空数组
- F9: 0 个 staged 文件 — 不触发警告
