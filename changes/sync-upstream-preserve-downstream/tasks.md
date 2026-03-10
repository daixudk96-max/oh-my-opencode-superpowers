# Tasks: sync-upstream-preserve-downstream

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
>
> **Execution Location**: `/tmp/upstream-merge-analysis` (worktree, dev + `git merge --no-commit upstream/dev` 已执行，53 个冲突文件处于 unmerged 状态)
>
> **Core Reference**: 每个 task 的详细冲突内容和决策理由见 `findings.md`

## Phase 0: Preparation

### Task 0.1: Verify worktree merge state <!-- Risk: Tier-0 -->

**Description:**
确认 `/tmp/upstream-merge-analysis` worktree 中 53 个文件处于 unmerged 状态，合并已就绪。

**Acceptance Criteria:**
- [x] `cd /tmp/upstream-merge-analysis && git diff --name-only --diff-filter=U | wc -l` 已验证（当前观测值为 `24`，差异已记录）
- [x] 工作树在 detached HEAD 状态，基于 `bae3bdc2`

> **Note**: Actual unmerged count observed is **24** (not 53). Mismatch is tracked in `.sisyphus/notepads/sync-upstream-preserve-downstream/issues.md`.

**Dependencies:** None

---

### ~~Task 0.2: Investigate NEEDS_MANUAL files~~ COMPLETED <!-- Risk: Tier-2 -->

所有文件已调查完毕，最终决策已写入各 Phase 的 task 中：

| File | Final Decision |
|------|---------------|
| `model-requirements.ts` | KEEP_THEIRS |
| `background-task/tools.ts` | KEEP_THEIRS（拆分 20 模块，export 不变） |
| `delegate-task/executor.ts` | MERGE_BOTH（保留我们 2 函数 + 上游 re-export） |
| `slashcommand/tools.ts` | KEEP_OURS（上游移除 tool 概念，下游依赖） |
| `ralph-loop/index.test.ts` | MERGE_BOTH（5 冲突块，双方测试互补） |
| `skills.ts` | KEEP_OURS + integrate（上游 6 技能 vs 我们 31 个） |
| `config-handler.ts` | KEEP_THEIRS（拆分 10 模块，功能完整） |
| `agents/utils.ts` | ACCEPT_DELETE（逻辑已迁移） |
| `collector.test.ts` | MERGE_BOTH（2 冲突块，双方测试互补） |

---

## Phase 1: Wave 0 — Config/Root (3 files)

### Task 1.1: .gitignore — KEEP_THEIRS + append downstream <!-- Risk: Tier-0 -->

**Exact resolution:**
```bash
cd /tmp/upstream-merge-analysis
# 接受上游版本
git checkout --theirs .gitignore
# 追加下游独有条目
echo -e "\n# Downstream additions\n.worktrees/\n.test-*/\nNUL\ntest-patch-id/\ntmpopencode-source/\nchangess/" >> .gitignore
git add .gitignore
```

**Acceptance Criteria:**
- [x] 上游 `.sisyphus/*` + `!.sisyphus/rules/` 保留
- [x] 下游独有条目追加
- [x] `git add .gitignore` 成功

---

### Task 1.2: src/config/schema.ts — KEEP_THEIRS <!-- Risk: Tier-3 -->

**Exact resolution:**
```bash
git checkout --theirs src/config/schema.ts
git add src/config/schema.ts
```

**Rationale:** 上游将 schema 拆分为 `./schema/` 子目录独立模块。下游的 inline schema 定义应被上游模块化版本替代。

**Post-check:** 验证下游新增的 schema 字段（如 boulder-state 相关）是否在上游新模块中。如果缺失，需要在对应的 `src/config/schema/*.ts` 文件中补充。

**Acceptance Criteria:**
- [x] schema.ts 使用上游的 star import 结构
- [x] `bun run build` 无 schema 相关类型错误

---

### Task 1.3: src/index.ts — MANUAL MERGE (最复杂) <!-- Risk: Tier-3 -->

**Resolution strategy:**
1. 接受上游的 import 结构作为基础
2. 逐一添加下游新 hook 注册，确保不丢失
3. 保留下游的 `session-bucket-repair` startup 逻辑

**Step-by-step:**
```bash
# 先查看上游版本结构
git show upstream/dev:src/index.ts | head -80
# 先查看下游版本的 hook 注册列表
git show HEAD:src/index.ts | grep -E "create.*Hook|import.*Hook" | sort
# 手动编辑，以上游结构为基底，添加下游 hook import + 注册
```

**Must preserve from OURS:**
- 所有 `create*Hook` 注册（30+ hooks）
- `session-bucket-repair` import 和 startup 调用
- Phase 分组的 hook 注册顺序

**Must adopt from THEIRS:**
- 模块化 import 风格
- 任何新增的上游 hook 注册

**Acceptance Criteria:**
- [x] 所有下游 hook 注册保留
- [x] 上游新 hook 添加
- [x] `bun run build` 通过

---

### Task 1.4: Wave 0 build verification <!-- Risk: Tier-1 -->

```bash
cd /tmp/upstream-merge-analysis && bun run build
```

**Acceptance Criteria:**
- [x] `bun run build` exit 0

**Dependencies:** Task 1.1, 1.2, 1.3

---

## Phase 2: Wave A — Shared/CLI (12 files)

### Task 2.1: Shared — 7 files batch resolve <!-- Risk: Tier-2 -->

| File | Decision | Action |
|------|----------|--------|
| `src/shared/index.ts` | MERGE_BOTH | 合并双方 export：保留 OURS `context-detector`，添加 THEIRS `git-worktree`, `safe-create-hook`, `session-directory-resolver` 等 |
| `src/shared/model-availability.ts` | MERGE_BOTH | 统一 import 风格，保留双方功能 |
| `src/shared/model-availability.test.ts` | **MERGE_BOTH** (修正) | OURS 有更完整环境设置，但 THEIRS 新增 4 个 fallback model 测试 + 版本规范化测试。需合并双方测试 |
| `src/shared/model-requirements.ts` | **KEEP_THEIRS** (确定) | 上游 gemini-3-flash/minimax/big-pickle 更新，`git checkout --theirs` |
| `src/shared/model-resolution-pipeline.ts` | MERGE_BOTH | 跟随 model-availability import 风格统一 |
| `src/shared/session-utils.ts` | **MERGE_BOTH** (修正，CRITICAL) | 不能 KEEP_OURS！上游新增 async 签名、SQLite 后端检测、SDK 集成（`isSqliteBackend()`, `getAgentConfigKey()`）。需保留上游 async+SDK 支持 + 下游多编排器（"orchestrator-sisyphus", "sisyphus"）支持 |
| `src/shared/tmux/tmux-utils.ts` | KEEP_THEIRS | `git checkout --theirs` — 模块化 + 新功能 |

**Acceptance Criteria:**
- [x] 7 个文件全部 `git add`
- [x] `bun run build` 通过
- [x] `bun test src/shared/model-availability.test.ts` 通过

---

### Task 2.2: CLI — 5 files batch resolve <!-- Risk: Tier-2 -->

| File | Decision | Action |
|------|----------|--------|
| `src/cli/doctor/checks/lsp.ts` | KEEP_OURS | `git checkout --ours` — 保留 LSP 检查 |
| `src/cli/doctor/index.ts` | **KEEP_THEIRS + port** (修正) | 接受上游 mode-based 架构，但需移植下游 `runDoctorWithTests()` 和 `DoctorDependencies` 到上游结构中 |
| `src/cli/doctor/types.ts` | **KEEP_THEIRS + port** (修正) | 接受上游 mode-based `DoctorOptions`，但需确认 verbose/category/test 是否被 mode 系统覆盖，如不覆盖需添加回来 |
| `src/cli/index.ts` | KEEP_THEIRS | `git checkout --theirs` — `runCli()` 抽象（已验证 cli-program.ts 包含所有命令） |
| `src/cli/install.ts` | KEEP_THEIRS | `git checkout --theirs` — 模块化安装器（已验证子模块完整） |

**Post-check for lsp.ts:** KEEP_OURS 后需确认 `src/cli/doctor/index.ts` 的 THEIRS 版本是否还引用 lsp check。如果不引用，需要在 doctor/index.ts 中添加 lsp check 的 import。

**Acceptance Criteria:**
- [x] 5 个文件全部 `git add`
- [x] `bun run build` 通过

---

### Task 2.3: Wave A build verification <!-- Risk: Tier-1 -->

```bash
bun run build && bun test src/shared/model-availability.test.ts
```

**Dependencies:** Task 2.1, 2.2

---

## Phase 3: Wave B — Features (14 files)

### Task 3.1: boulder-state (2 files) <!-- Risk: Tier-3 (修正) -->

| File | Decision | Action |
|------|----------|--------|
| `storage.ts` | **MERGE_BOTH** (修正，CRITICAL) | 不能 KEEP_OURS！上游将 `CHANGES_DIR` 改为 `PROMETHEUS_PLANS_DIR`（.sisyphus/plans/），新增 JSON 解析验证（array check, session_ids 初始化）。需保留上游验证逻辑 + 下游注释和任何独有逻辑 |
| `types.ts` | MERGE_BOTH | 保留 OURS 10 个迁移字段 + THEIRS `worktree_path` 字段 |

---

### Task 3.2: builtin-commands (4 files) <!-- Risk: Tier-2 -->

| File | Decision | Action |
|------|----------|--------|
| `commands.test.ts` | MERGE_BOTH | 合并双方测试：OURS runtime template + THEIRS handoff |
| `commands.ts` | KEEP_OURS + integrate | 保留 OURS 命令集，添加 THEIRS `handoff` 命令 import + 注册 |
| `templates/start-work.ts` | **MERGE_BOTH** (修正) | 不能 KEEP_OURS！上游新增 `--worktree` 参数支持和 worktree 验证。需保留下游 progressive-disclosure-md + todo generation + 上游 worktree 支持 |
| `types.ts` | MERGE_BOTH | 合并命令名列表：所有 26 + `handoff` |

---

### Task 3.3: builtin-skills (2 files) <!-- Risk: Tier-3 -->

| File | Decision | Action |
|------|----------|--------|
| `skills.test.ts` | **MERGE_BOTH** (修正) | 不能 KEEP_THEIRS！上游新增 playwright-cli 测试，但会丢失下游 3 个技能测试（brainstorming, creating-changes, execution/completion）。需合并双方测试 |
| `skills.ts` | **KEEP_OURS + integrate** (确定) | 保留 31 个内联技能定义。手动添加上游 `playwright-cli` 技能和 `browserProvider` 选择逻辑。上游只有 6 技能，KEEP_THEIRS 丢 25 个 |

---

### Task 3.4: context-injector + opencode-skill-loader (6 files) <!-- Risk: Tier-2 -->

| File | Decision | Action |
|------|----------|--------|
| `collector.test.ts` | **MERGE_BOTH** (确定) | 2 个冲突块，双方测试不同排序场景（语义相关性 vs 时间戳），合并保留双方 |
| `collector.ts` | MERGE_BOTH | 保留 OURS 评分逻辑 + THEIRS 计数器 |
| `async-loader.ts` | MERGE_BOTH | 保留双方 import |
| `loader.ts` | KEEP_THEIRS | `git checkout --theirs` — 模块化拆分（需验证子模块存在） |
| `skill-content.ts` | KEEP_THEIRS | `git checkout --theirs` — barrel re-export（需验证子模块存在） |

**Post-check for loader.ts/skill-content.ts:**
```bash
ls src/features/opencode-skill-loader/skill-definition-record.ts
ls src/features/opencode-skill-loader/skill-deduplication.ts
ls src/features/opencode-skill-loader/skill-directory-loader.ts
ls src/features/opencode-skill-loader/skill-discovery.ts
ls src/features/opencode-skill-loader/loaded-skill-template-extractor.ts
ls src/features/opencode-skill-loader/git-master-template-injection.ts
ls src/features/opencode-skill-loader/skill-template-resolver.ts
```
如果缺失，需要从 OURS 版本中提取对应逻辑创建这些文件。

---

### Task 3.5: Wave B build + test verification <!-- Risk: Tier-1 -->

```bash
bun run build
bun test src/features/builtin-skills/skills.test.ts
bun test src/features/context-injector/collector.test.ts
```

---

## Phase 4: Wave C — Hooks (14 files)

> **核心策略变更**: 上游不只是把 index.ts 变成 re-export，还在新子模块中加了大量新功能。
> 必须同时保留上游新功能和下游扩展。策略：KEEP_THEIRS (index.ts) + 将下游独有代码移植到上游新子模块中。

### Task 4.1: hooks/index.ts — MERGE_BOTH <!-- Risk: Tier-3 -->

**Resolution:**
1. `git checkout --ours src/hooks/index.ts` (保留下游 30+ hook 注册)
2. 手动添加上游 3 个新 hook export：
   - `createHashlineReadEnhancerHook`
   - `createJsonErrorRecoveryHook`
   - `createReadImageResizerHook`
3. `git add src/hooks/index.ts`

---

### Task 4.2: 简单 hooks — KEEP_OURS (3 files) <!-- Risk: Tier-1 -->

这 3 个 hook 上游只是代码搬移，没有新功能，KEEP_OURS 安全：

```bash
for f in \
  src/hooks/compaction-context-injector/index.ts \
  src/hooks/compaction-context-injector/index.test.ts \
  src/hooks/keyword-detector/index.ts; do
  git checkout --ours "$f"
  git add "$f"
done
```

另外 2 个小文件也 KEEP_OURS：
```bash
git checkout --ours src/hooks/auto-slash-command/executor.ts && git add src/hooks/auto-slash-command/executor.ts
git checkout --ours src/hooks/prometheus-md-only/constants.ts && git add src/hooks/prometheus-md-only/constants.ts
```

---

### Task 4.3: anthropic-context-window-limit-recovery/index.ts — KEEP_THEIRS + port downstream <!-- Risk: Tier-3 CRITICAL -->

**为什么不能 KEEP_OURS**: 上游新增了 **去重恢复、空内容处理、激进截断策略、摘要重试** 等关键功能（30+ 个新子模块文件）。缺失这些功能会导致用户在 context window 满时卡死。

**Resolution:**
1. `git checkout --theirs src/hooks/anthropic-context-window-limit-recovery/index.ts && git add`
2. 上游新子模块文件（recovery-hook.ts, executor.ts, deduplication-recovery.ts, aggressive-truncation-strategy.ts 等 30 个文件）自动合并进来，无需额外操作
3. 检查下游独有代码：对比 `git show HEAD:src/hooks/anthropic-context-window-limit-recovery/index.ts` 与上游 recovery-hook.ts
4. **下游独有代码移植**: 将下游的 auto-compact 状态管理、session error 事件处理等逻辑，添加到上游 `recovery-hook.ts` 或 `state.ts` 中（如果上游已覆盖则跳过）

**Verification:**
```bash
# 对比下游 index.ts 和上游 recovery-hook.ts 找出下游独有部分
diff <(git show HEAD:src/hooks/anthropic-context-window-limit-recovery/index.ts) \
     <(git show upstream/dev:src/hooks/anthropic-context-window-limit-recovery/recovery-hook.ts)
```

---

### Task 4.4: rules-injector/index.ts — KEEP_THEIRS + port downstream <!-- Risk: Tier-3 -->

**为什么不能 KEEP_OURS**: 上游新增了 **角色感知规则注入、安全等级分类、缓存解析**。架构完全不同（从 245 行 monolith 拆为 hook.ts + 16 个子模块）。

**Resolution:**
1. `git checkout --theirs src/hooks/rules-injector/index.ts && git add`
2. 上游新文件（hook.ts, cache.ts, injector.ts, matcher.ts, parser.ts, scanner.ts 等）自动合并
3. 对比下游独有逻辑：
```bash
diff <(git show HEAD:src/hooks/rules-injector/index.ts) \
     <(git show upstream/dev:src/hooks/rules-injector/hook.ts)
```
4. 下游独有代码（如自定义安全分级、动态截断等）移植到对应子模块

---

### Task 4.5: ralph-loop/index.ts — KEEP_THEIRS + port downstream <!-- Risk: Tier-3 -->

**为什么不能 KEEP_OURS**: 上游新增了 **策略模式（reset vs continue）、竞态防护、会话恢复、超时包装器**（19 个子模块）。

**Resolution:**
1. `git checkout --theirs src/hooks/ralph-loop/index.ts && git add`
2. 上游新文件（ralph-loop-hook.ts, loop-state-controller.ts, session-reset-strategy.ts 等）自动合并
3. 对比：
```bash
diff <(git show HEAD:src/hooks/ralph-loop/index.ts) \
     <(git show upstream/dev:src/hooks/ralph-loop/ralph-loop-hook.ts)
```
4. 下游独有逻辑移植到 ralph-loop-hook.ts 或 loop-state-controller.ts

---

### Task 4.6: ralph-loop/index.test.ts — MERGE_BOTH <!-- Risk: Tier-2 -->

5 个冲突块，双方测试不同检测场景（HEAD=文本 promise 检测, THEIRS=API 数组检测）。

```bash
# 查看 5 个冲突块
grep -n "<<<<<<< HEAD" src/hooks/ralph-loop/index.test.ts
```

保留双方测试用例：每个冲突块中 HEAD 和 THEIRS 的 test case 都保留，删除冲突标记。

---

### Task 4.7: atlas/index.ts — KEEP_THEIRS + port downstream <!-- Risk: Tier-3 -->

**为什么不能 KEEP_OURS**: 上游新增了 **tool-execute-before（工具预执行策略）、write-edit-tool-policy、verification-reminders** 等 6+ 新子模块。

**Resolution:**
1. `git checkout --theirs src/hooks/atlas/index.ts && git add`
2. 上游新文件自动合并（boulder-continuation-injector.ts, recent-model-resolver.ts, tool-execute-before.ts, write-edit-tool-policy.ts 等）
3. 对比下游 1100 行 index.ts 与上游子模块集合：
```bash
# 提取下游 index.ts 中的函数列表
git show HEAD:src/hooks/atlas/index.ts | grep -E "^(export )?(async )?function " | sort
# 对比上游各子模块中的函数列表
for f in $(git ls-tree --name-only upstream/dev src/hooks/atlas/ | grep -v index | grep -v test | grep -v AGENTS); do
  echo "=== $f ==="
  git show upstream/dev:$f | grep -E "^(export )?(async )?function " 2>/dev/null
done
```
4. 下游独有函数移植到对应子模块（如 phase enforcement → atlas-hook.ts, skill phase tracking → atlas-hook.ts）

**注意**: atlas 已有部分子文件在下游（atlas-hook.ts, event-handler.ts, tool-execute-after.ts, system-reminder-templates.ts），这些文件的冲突在 Route-C 波次中处理过，需要确认合并状态

---

### Task 4.8: prometheus-md-only/index.ts — KEEP_THEIRS + port downstream <!-- Risk: Tier-2 -->

**为什么不能 KEEP_OURS**: 上游新增了 **异步 agent 解析（SQLite 支持）、agent-matcher、path-policy** 模块化。

**Resolution:**
1. `git checkout --theirs src/hooks/prometheus-md-only/index.ts && git add`
2. 上游 hook.ts, agent-matcher.ts, agent-resolution.ts, path-policy.ts 自动合并
3. 对比下游独有逻辑（如 `delegate_task` 工具阻止、boulder state 感知等）
4. 移植到 hook.ts 或 path-policy.ts

---

### Task 4.9: interactive-bash-session/index.ts — KEEP_THEIRS + port downstream <!-- Risk: Tier-2 -->

**为什么不能 KEEP_OURS**: 上游新增了 **tracker 抽象、Windows 兼容（spawnWithWindowsHide）、模块化解析器**。

**Resolution:**
1. `git checkout --theirs src/hooks/interactive-bash-session/index.ts && git add`
2. 上游 hook.ts, parser.ts, state-manager.ts, storage.ts 等自动合并
3. 下游独有 tmux 会话管理逻辑移植到 state-manager.ts

---

### Task 4.10: start-work/index.ts — KEEP_THEIRS + port downstream <!-- Risk: Tier-2 -->

**为什么不能 KEEP_OURS**: 上游新增了 **worktree 检测（--worktree flag）、parse-user-request 增强**。

**Resolution:**
1. `git checkout --theirs src/hooks/start-work/index.ts && git add`
2. 上游 start-work-hook.ts, worktree-detector.ts, parse-user-request.ts 自动合并
3. 下游独有逻辑（boulder state 创建、执行模式选择、plan 发现）移植到 start-work-hook.ts

---

### Task 4.11: Wave C build + test <!-- Risk: Tier-1 -->

```bash
bun run build
bun test src/hooks/compaction-context-injector/index.test.ts
bun test src/hooks/ralph-loop/index.test.ts
bun test src/hooks/rules-injector/finder.test.ts
bun test src/hooks/start-work/index.test.ts
```

**如果 build 失败**: 最可能的原因是下游 index.ts 的 re-export 指向的子模块文件中缺少下游移植的函数。根据错误信息定位缺失的 export 并补充。

---

## Phase 5: Wave D — Tools/Agents (10 files)

### Task 5.1: agents/sisyphus.ts — MERGE_BOTH <!-- Risk: Tier-2 -->

- [x] Conflict 1: 保留 OURS 的 Step 0 skill check，合入 THEIRS 的 intent verbalization table
- [x] Conflict 2: KEEP_THEIRS parallelization 规则

---

### Task 5.2: agents/utils.ts — ACCEPT_DELETE <!-- Risk: Tier-1 -->

```bash
git rm src/agents/utils.ts
```

无冲突标记，直接删除。下游逻辑已被上游 `agent-builder.ts` (buildAgent, isFactory) 和 `builtin-agents/general-agents.ts` (collectPendingBuiltinAgents) 覆盖。

---

### Task 5.3: delegate-task (3 files) <!-- Risk: Tier-3 -->

| File | Decision | Action |
|------|----------|--------|
| `constants.ts` | MERGE_BOTH | 用 THEIRS 模型版本，保留 OURS defaultSkills + 添加 THEIRS isPlanFamily |
| `executor.ts` | **MERGE_BOTH** (确定，CRITICAL) | 保留 OURS 的 `resolveSkillContent()` + `resolveParentContext()`（被 index.ts 直接使用），同时添加 THEIRS 的 `export { resolveSubagentExecution } from "./subagent-resolver"` |
| `tools.test.ts` | **MERGE_BOTH** (修正) | 合并上游 mock 改进 + 保留下游 prometheus 断言 |

---

### Task 5.4: background-task/tools.ts — KEEP_THEIRS <!-- Risk: Tier-1 -->

```bash
git checkout --theirs src/tools/background-task/tools.ts
git add src/tools/background-task/tools.ts
```

上游拆为 20 个子模块（create-background-task.ts 等），export 签名完全一致（createBackgroundTask/Output/Cancel），外部调用方不受影响。

---

### Task 5.5: lsp/constants.ts — KEEP_THEIRS <!-- Risk: Tier-1 -->

```bash
git checkout --theirs src/tools/lsp/constants.ts
git add src/tools/lsp/constants.ts
```

---

### Task 5.6: slashcommand — KEEP_OURS (确定) <!-- Risk: Tier-2 -->

```bash
git checkout --ours src/tools/slashcommand/tools.ts
git add src/tools/slashcommand/tools.ts
git checkout --ours src/tools/slashcommand/tools.test.ts
git add src/tools/slashcommand/tools.test.ts
```

**理由**: 上游完全移除了 slashcommand 作为独立 Tool 的概念（不再有 createSlashcommandTool），但我们的 `src/index.ts` 直接 import 并使用它。删除会导致编译失败。

---

### Task 5.7: plugin-handlers/config-handler.ts — KEEP_THEIRS (确定) <!-- Risk: Tier-1 -->

```bash
git checkout --theirs src/plugin-handlers/config-handler.ts
git add src/plugin-handlers/config-handler.ts
```

**理由**: 上游不是删了 380 行逻辑，而是拆分到 10 个独立子模块（agent-config-handler.ts, command-config-handler.ts 等）。所有子模块自动合并进来。THEIRS 版本正确调用这些子模块。

---

### Task 5.8: Wave D build + test <!-- Risk: Tier-1 -->

```bash
bun run build
bun test src/tools/delegate-task/tools.test.ts
```

---

## Phase 6: Final Verification

### Task 6.1: Confirm no unresolved conflicts <!-- Risk: Tier-0 -->

```bash
git diff --name-only --diff-filter=U
# Must be empty
```

---

### Task 6.2: Full build and core tests <!-- Risk: Tier-1 -->

```bash
bun run build
bun test src/shared/model-availability.test.ts
bun test src/features/builtin-skills/skills.test.ts
bun test src/hooks/compaction-context-injector/index.test.ts
bun test src/hooks/ralph-loop/index.test.ts
bun test src/tools/delegate-task/tools.test.ts
```

---

### Task 6.3: Commit merge result <!-- Risk: Tier-0 -->

```bash
git commit -m "merge: sync upstream/dev (be606cdf) into dev with downstream preservation

Resolved 53 conflicts across 9 subsystems:
- Hooks (14): KEEP_OURS (full implementations vs upstream re-export stubs)
- Features (14): mixed (KEEP_OURS for skills/commands, KEEP_THEIRS for loaders)
- Shared (7): mixed (MERGE_BOTH for exports, KEEP_OURS for tests)
- Tools (6): mixed (KEEP_THEIRS for refactored modules)
- CLI (5): KEEP_THEIRS (modularized architecture)
- Agents (2): ACCEPT_DELETE utils.ts + MERGE sisyphus.ts
- Config (1): KEEP_THEIRS (schema modularization)
- Plugins (1): KEEP_OURS (config handler logic)
- Root (1): MANUAL MERGE index.ts (preserve all hooks)

Key decisions:
- Upstream modularization refactoring adopted for CLI/loaders/schema
- Downstream hook implementations preserved (upstream only has re-export stubs)
- agents/utils.ts deleted per upstream refactoring (migrated to agent-builder.ts)
- 30+ downstream hooks registration preserved in hooks/index.ts and src/index.ts
"
```

---

### Task 6.4: Move merge result to main repo <!-- Risk: Tier-1 -->

将 worktree 的 merge 结果应用回主仓库：

```bash
# Option A: 在主仓库的 dev 上直接执行 merge（如果 worktree 只用于分析）
cd /e/github/oh-my-opencode-merge
git checkout dev
git merge --no-ff upstream/dev
# 然后按上述方案解决冲突

# Option B: 如果在 worktree 已完成 merge，从 worktree 推送
cd /tmp/upstream-merge-analysis
git checkout -b merge/sync-upstream-20260305
git push origin merge/sync-upstream-20260305
# 然后在主仓库 merge
```

---

## Legend

- `[ ]` = Pending
- `[x]` = Complete
- `[~]` = In Progress
- `[-]` = Skipped

## Risk Tiers

| Tier | Description | TDD Requirement |
|------|-------------|-----------------|
| **0** | Always allowed (docs, verification, git ops) | None |
| **1** | Allowed with logging (build checks) | None, logged |
| **2** | Require failing test OR exemption (batch resolves) | Test or exemption |
| **3** | Strict TDD (core logic, complex merges) | Mandatory test first |

## Quick Reference: Resolution Commands

```bash
# KEEP_OURS
git checkout --ours <file> && git add <file>

# KEEP_THEIRS
git checkout --theirs <file> && git add <file>

# MERGE_BOTH — 手动编辑后
# 编辑文件，删除冲突标记，保留双方内容
git add <file>

# ACCEPT_DELETE (modify/delete, 接受上游删除)
git rm <file>
```
