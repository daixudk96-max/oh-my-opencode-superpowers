<!-- MERGED CONTEXT -->
### PROPOSAL
#### Problem Statement
`verify-fix-remaining-fail-partial` 真实行为触发验证发现 2 个 FAIL：

| #     | 功能                         | 验证结果 | 根因                                     |
| ----- | -------------------------- | ---- | -------------------------------------- |
| V-1.1 | F12 Secret Scanner Bash 拦截 | FAIL | Bash 命令含 secret + 重定向未被阻止（Edit 工具可以阻止） |
| V-2.1 | F9 Commit Size Checker     | FAIL | 执行 git commit 5 文件时无警告                 |

##### F12 根因分析
* `secret-scanner/index.ts` 代码逻辑正确：检查 `toolLower === "bash"` → 检查重定向 → 扫描 secret → 设 `output.blocked`
* `secret-scanner` 不在 `skipManifestNames` 中 → 手动注册 + auto-discovery 双重执行
* **可能原因 1**: `output.args.command` 为 `undefined`（Bash 工具 args 结构不匹配）
* **可能原因 2**: 重定向正则 `/(?:^|\s)(?:>>|2>|>)(?:\s|$)/` 对某些命令格式匹配失败
* **可能原因 3**: `runHandlers` 中 catch 吞错导致后续 blocked 检查不到

##### F9 根因分析（代码审计确认）
* `commit-size-checker-wrapper.ts:28` 调用 `checker.check({ files: DEFAULT_WRAPPER_FILE_SAMPLE })` — 硬编码 mock `["file-1", "file-2", "file-3", "file-4"]`
* `commit-size-checker.ts:136-141` 的 `shouldWarn` 处理块为空 — 不设 `output.blocked`
* Wrapper 只追加 `output.message`，不设 `output.blocked`
* 结果：4 个 mock 文件 > threshold 3 → 应该触发警告 → 但 message 追加可能被上游覆盖

#### Success Criteria
1. `echo "AKIAIOSFODNN7EXAMPLE" > /tmp/test.txt` 被 secret-scanner 阻止
2. `echo "hello" > /tmp/test.txt` 不被阻止
3. `git commit` 超过阈值时 output.blocked = true 且有警告消息
4. 非 git 目录不崩溃
5. TSC 编译通过

### DESIGN
#### Goal
修复验证发现的 F12 Secret Scanner Bash 拦截失败 + F9 Commit Size Checker 静默无警告。

#### Architecture
##### F12: Secret Scanner Bash 修复
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

##### F9: Commit Size Checker 修复
```
问题链路:
  index.ts:401 → commitSizeChecker.tool.execute.before(input, output)
    └── wrapper.ts:21-33:
          1. 调用 checker.tool.execute.before(input, output)  ← checker 空 handler，什么都不做
          2. 用 DEFAULT_WRAPPER_FILE_SAMPLE (mock) 做 check   ← 永远 4 文件
          3. 超阈值只追加 message，不设 blocked              ← 用户看不到

修复方案:
  1. 删除 DEFAULT_WRAPPER_FILE_SAMPLE，改用 checker.getStagedFiles()
     BUT: getStagedFiles() 是 private 方法 → 需要暴露 or 在 wrapper 中直接实现
  2. wrapper 中超阈值时设 output.blocked = true
  3. checker 的空 shouldWarn handler 填充完整逻辑（作为防御）
```

#### Key Decisions
1. **F12 正则放宽而非重写** — 当前正则 `/(?:^|\s)(?:>>|2>|>)(?:\s|$)/` 要求重定向符前后有空格，但 `>filename` (无空格) 也是合法重定向
2. **F9 在 wrapper 中实现而非 checker** — wrapper 是下游独立 file(S级)，修改 checker(下游直接文件) 风险更低但需保持两处一致
3. **添加 skipManifestNames** — 防止 secret-scanner 双重执行，统一走手动注册路径
<!-- END MERGED CONTEXT -->

# Tasks: fix-verified-fail-f9-f12

> 修复 F12 Secret Scanner Bash 拦截 + F9 Commit Size Checker 静默。
> 4 个文件，5 个 Task，相互独立可并行。

---

## Phase 1: F12 — Secret Scanner Bash 修复 <!-- Risk: S -->

### Task 1.1: 放宽重定向正则 + 添加防御性日志
- **Modify**: `src/hooks/secret-scanner/index.ts`
- **Do**:
  1. 放宽 `hasBashRedirectionOperator` 正则：去掉结尾 `(?:\s|$)` 锚定，改为 `(?:\s|$|[^\s])`，允许 `>filename` 无空格形式
  2. 在 bash 路径入口添加 `log` 调用（如果 `ctx.log` 存在），记录进入 bash 检查的命令
  3. 在 `output.blocked = true` 之前添加 log，确认拦截被触发
- **Risk**: S（下游独立文件）
- **Acceptance**:
  - `echo "AKIAIOSFODNN7EXAMPLE" > /tmp/test.txt` 被拦截
  - `echo "AKIAIOSFODNN7EXAMPLE" >/tmp/test.txt`（无空格）也被拦截
  - `echo "hello" > /tmp/test.txt` 不被拦截
  - `git push origin main` 不受影响
  - TSC 编译通过

### Task 1.2: 添加 secret-scanner 到 skipManifestNames
- **Modify**: `src/index.ts`
- **Do**:
  1. 在 `skipManifestNames` Set 中添加 `"secret-scanner"`
  2. 确保不影响手动注册的 `secretScanner` 变量
- **Risk**: R（修改上游共享文件 1 行）
- **Acceptance**:
  - secret-scanner 只执行一次（手动注册路径）
  - TSC 编译通过

---

## Phase 2: F9 — Commit Size Checker 修复 <!-- Risk: S -->

### Task 2.1: 填充 checker 空 shouldWarn handler + 暴露 getStagedFiles
- **Modify**: `src/hooks/pre-tool-use/commit-size-checker.ts`
- **Do**:
  1. 将 `getStagedFiles()` 从 private 改为 public（或在接口中声明）
  2. 填充 `tool.execute.before` 的空 shouldWarn 块：设置 `output.blocked = true` 和 `output.message = result.message`
- **Risk**: S（下游独立文件）
- **Acceptance**:
  - checker 的 `tool.execute.before` 在 shouldWarn 时设 `output.blocked = true`
  - `getStagedFiles()` 可从外部调用
  - TSC 编译通过

### Task 2.2: wrapper 改用真实 staged 文件 + 设 blocked
- **Modify**: `src/downstream/patches/commit-size-checker-wrapper.ts`
- **Do**:
  1. 删除 `DEFAULT_WRAPPER_FILE_SAMPLE` 常量
  2. 在 `tool.execute.before` 中调用 `checker.getStagedFiles()` 获取真实文件列表（如果暴露了）；或直接在 wrapper 中实现 `execSync("git diff --cached --name-only")` 调用
  3. 用真实文件列表做 `checker.check({ files })`
  4. 超阈值时设 `output.blocked = true`
- **Risk**: S（下游独立文件）
- **Acceptance**:
  - staged 5+ 文件时 git commit 被阻止
  - staged 0-3 文件时 git commit 正常
  - 非 git 目录不崩溃
  - TSC 编译通过

---

## Phase 3: 验证 <!-- Risk: S -->

### Task 3.1: TypeScript 编译 + 测试
- **Do**:
  1. `bun run tsc --noEmit` — 编译通过
  2. `bun test src/hooks/secret-scanner/ src/hooks/pre-tool-use/ src/downstream/patches/commit-size-checker-wrapper --reporter=summary` — 无回归
- **Risk**: S
- **Acceptance**:
  - TSC exit code 0
  - 测试 pass 数不低于基线

---

## Feature Coverage Index

| Feature | Task ID | Phase | Expected |
|---------|---------|:-----:|----------|
| Bash 重定向正则放宽 | 1.1 | 1 | 含/不含空格的重定向都能匹配 |
| 防双重执行 | 1.2 | 1 | secret-scanner 仅执行一次 |
| Checker 空 handler 修复 | 2.1 | 2 | shouldWarn 时设 blocked |
| Wrapper 真实文件 + blocked | 2.2 | 2 | mock 替换为 git staged |
| 编译 + 回归 | 3.1 | 3 | 全部通过 |
