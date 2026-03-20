# Tasks: Sync Upstream oh-my-openagent (2026-03-20)

> 46 个冲突文件，6 种模式，9 个执行阶段
> 工作目录：`E:\github\oh-my-opencode-merge`
> 状态：`git merge upstream/dev --no-commit` 已执行，冲突待解决
> 安全网：`downstream-snapshot.md` 已生成

---

## TODOs

- [x] Task 1.1: 直接接受上游版本的 7 个文件
- [x] Task 2.1: 解决 .gitignore 冲突
- [x] Task 2.2: 解决 package.json 冲突
- [x] Task 2.3: 解决 config/schema/hooks.ts 冲突
- [x] Task 2.4: 解决 boulder-state 3 个文件冲突
- [x] Task 3.1: 解决 atlas hook 相关 3 个文件
- [x] Task 3.2: 解决 ralph-loop 和 model-requirements
- [x] Task 4.1: 解决 6 个测试文件冲突
- [x] Task 5.1: 解决 3 个 Atlas agent prompt 文件
- [x] Task 5.2: 解决 sisyphus.ts 冲突
- [x] Task 5.3: 解决 start-work/index.ts 冲突
- [x] Task 6.1: 解决 builtin-commands 2 个文件
- [x] Task 6.2: 解决 delegate-task 和 momus
- [x] Task 7.1: 解决 hooks/index.ts
- [x] Task 7.2: 解决 agents 注册文件（3 个文件）
- [x] Task 7.3: 解决 plugin 相关文件（4 个文件）
- [x] Task 7.4: 解决 src/index.ts（最关键）
- [x] Task 8.1: 重新生成 bun.lock
- [x] Task 9.1: TypeScript 类型检查
- [x] Task 9.2: Build 验证
- [x] Task 9.3: 下游快照对比
- [ ] Task 9.4: 提交并同步

---

## Phase 1: Accept Upstream（7 个文件，低风险）

### Task 1.1: 直接接受上游版本的 7 个文件

- **Files**:
  - `src/agents/builtin-agents/resolve-file-uri.test.ts`
  - `src/agents/oracle.ts`
  - `src/hooks/auto-slash-command/executor.ts`
  - `src/hooks/auto-slash-command/hook.ts`
  - `src/hooks/start-work/start-work-hook.ts`
  - `src/shared/index.ts`
  - `src/shared/logger.ts`
- **Action**:
  1. 对每个文件执行 `git checkout --theirs <file>`
  2. `git add <file>`
- **Acceptance**:
  - 7 个文件无冲突标记
  - 文件内容 = upstream/dev 版本
- **Risk**: 低
- **Dependencies**: 无
- **结果记录**: 记录 7 个文件已接受上游版本到 findings.md；标记 Phase 1 完成到 progress.md

---

## Phase 2: Config/Infra — Pattern F（6 个文件，中风险）

### Task 2.1: 解决 .gitignore 冲突

- **Files**: `.gitignore`
- **Action**:
  1. 读取冲突文件
  2. 保留 HEAD 的 `.worktrees/`、`.test-*`、`NUL`、`test-patch-id/`、`tmpopencode-source/`、`changess/`
  3. 添加 upstream 的 `.omx/`
  4. 移除冲突标记
- **Acceptance**: 文件包含两侧所有 ignore 规则，无冲突标记
- **Risk**: 低
- **结果记录**: 合并后的新增规则列表

### Task 2.2: 解决 package.json 冲突

- **Files**: `package.json`
- **Action**:
  1. 接受 upstream 版本号 (`3.11.0`)、`prepare` script、依赖版本升级（`@ast-grep/*`, `@opencode-ai/*`, `bun-types`）
  2. 保留下游依赖：`@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`, `mdast-*`, `remark-*`, `unified`
  3. **不接受** upstream 的 repo/bugs/homepage URL 改名（保持 fork 身份）
  4. 移除冲突标记
- **Acceptance**: package.json 有效 JSON，包含两侧依赖
- **Risk**: 中
- **结果记录**: 记录保留/接受的依赖变更清单

### Task 2.3: 解决 config/schema/hooks.ts 冲突

- **Files**: `src/config/schema/hooks.ts`
- **Action**:
  1. 保留 HEAD 所有 hook name entries（含 `secret-scanner`、`tasks-md-creation-guard`、`plan-reorganizer`、`plan-update-reminder`、`plan-attention-refresher`）
  2. 添加 upstream 的 `todo-description-override`
  3. 保留下游的 `createHookNameSchema`、`parseHookName` helpers（如果存在）
- **Acceptance**: HookNameSchema enum 包含所有上下游 hook 名称
- **Risk**: 低
- **结果记录**: 最终 hook 名称列表

### Task 2.4: 解决 boulder-state 3 个文件冲突

- **Files**:
  - `src/features/boulder-state/types.ts`
  - `src/features/boulder-state/storage.ts`
  - `src/features/boulder-state/index.ts`
- **Action**:
  - **types.ts**:
    1. 保留下游类型：`PhaseStatus`, `TaskPhaseStatus`, `TaskPhaseInfo`, `WaveWorktree`, `WaveExecutionState`, `WorktreeStatus`, `PlanProgress`
    2. 保留下游 `BoulderState` 扩展字段（`phase`, `failure_count`, `last_updated`, `current_task`, `last_error`, `wave_execution`）
    3. 添加 upstream：`task_sessions`, `TaskSessionState`, `TopLevelTaskRef`
  - **storage.ts**:
    1. 保留下游函数：`updatePhaseStatus`, `incrementFailureCount`, `resetFailureCount`, `getCurrentPhase`, `canCallPlanningAgents`, `isExecutingPhase`, `markBoulderComplete`, `getFirstIncompleteTask`, `getPlanProgress`, `findPrometheusPlans`
    2. 添加 upstream：`task_sessions` 支持、reserved-key protection、rollback on failed `appendSessionId`、`getTaskSessionState`、`upsertTaskSessionState`
  - **index.ts**:
    1. 保留下游 exports：`./worktree-manager`, `./retry-tracker`
    2. 添加 upstream：`./top-level-task`
- **Acceptance**: 3 个文件无冲突标记；所有下游类型/函数/导出保留；upstream 新增功能存在
- **Risk**: 中
- **Dependencies**: 无
- **结果记录**: 记录保留/新增的类型、函数、导出清单

---

## Phase 3: Minor Divergence — Pattern C（5 个文件，中风险）

### Task 3.1: 解决 atlas hook 相关 3 个文件

- **Files**:
  - `src/hooks/atlas/atlas-hook.ts`
  - `src/hooks/atlas/system-reminder-templates.ts`
  - `src/hooks/atlas/verification-reminders.ts`
- **Action**:
  - **atlas-hook.ts**:
    1. 保留下游 `createBoulderGatingWrapper`、`createContinuationMaxRetriesWrapper` 和 wrapped event handler chain
    2. 添加 upstream `PendingTaskRef` tracking、`pendingTaskRefs` 和 `getState` 参数
  - **system-reminder-templates.ts**:
    1. 保留下游 `changes/{PLAN_NAME}/...` 路径
    2. 接受 upstream 改进的提示文案
  - **verification-reminders.ts**:
    1. 保留下游 `changes/${planName}/...` 路径
    2. 接受 upstream `buildReuseHint`、`buildCompletionGate`、`buildFinalWaveApprovalReminder` 结构
- **Acceptance**: 3 个文件无冲突；下游 wrapper 和路径保留；upstream 新功能存在
- **Risk**: 中
- **结果记录**: 每个文件的保留/接受决策摘要

### Task 3.2: 解决 ralph-loop 和 model-requirements

- **Files**:
  - `src/hooks/ralph-loop/completion-promise-detector.ts`
  - `src/shared/model-requirements.ts`
- **Action**:
  - **completion-promise-detector.ts**:
    1. 保留 HEAD 的 false-positive filtering 和结构化 tool output 提取
    2. 添加 upstream 的 `startedAt` temporal scoping 和 `tool_result` parts scanning
  - **model-requirements.ts**:
    1. 接受 upstream 的 model 刷新（gpt-5.4, gpt-5.4-mini, kimi-k2.5, glm-5 等）
    2. 保留下游 `observer` agent 的 fallback chain
    3. 添加 upstream `sisyphus-junior` 要求
- **Acceptance**: 2 个文件无冲突；下游特有逻辑保留
- **Risk**: 中
- **结果记录**: 合并策略摘要

---

## Phase 4: Tests — Pattern D（6 个文件，中风险）

### Task 4.1: 解决 6 个测试文件冲突

- **Files**:
  - `src/config/schema.test.ts`
  - `src/hooks/compaction-context-injector/index.test.ts`
  - `src/hooks/ralph-loop/index.test.ts`
  - `src/shared/model-availability.test.ts`
  - `src/shared/model-requirements.test.ts`
  - `src/tools/delegate-task/tools.test.ts`
- **Action**:
  - **schema.test.ts**: 保留下游 plan-hook tests + 添加 upstream rejection test
  - **compaction-context-injector/index.test.ts**: 接受 upstream 新 API tests（`inject`/`capture`）；如果下游有独特断言则保留
  - **ralph-loop/index.test.ts**: 根据 Phase 3 合并后的 detector 行为更新期望
  - **model-availability.test.ts**: 保留下游 config-dir 隔离 + 接受 upstream mock 改进
  - **model-requirements.test.ts**: 保留下游 `observer` test + 接受 upstream `sisyphus-junior` tests
  - **tools.test.ts**: 保留下游 category tests + 接受 upstream `run_in_background` tests
- **Acceptance**: 6 个文件无冲突标记
- **Risk**: 中
- **Dependencies**: Phase 3（ralph-loop detector 行为影响 test 期望）
- **结果记录**: 测试文件合并策略和保留的测试用例列表

---

## Phase 5: Modularization — Pattern A（5 个文件，中风险）

### Task 5.1: 解决 3 个 Atlas agent prompt 文件

- **Files**:
  - `src/agents/atlas/default.ts`
  - `src/agents/atlas/gemini.ts`
  - `src/agents/atlas/gpt.ts`
- **Action**:
  1. 接受 upstream prompt 架构（anti-duplication, auto-continue, final-wave 语义）
  2. 将所有 `.sisyphus/...` 路径替换为下游的 `changes/{name}/...` 路径
  3. 保留下游特有的 TDD/path-migration 内容（如果仍然需要）
- **Acceptance**: 3 个文件无冲突；路径为 `changes/` 格式
- **Risk**: 中
- **结果记录**: 替换的路径数量和保留的下游内容

### Task 5.2: 解决 sisyphus.ts 冲突

- **Files**: `src/agents/sisyphus.ts`
- **Action**:
  1. 接受 upstream 的模块化导入（`./sisyphus/gemini`, `./sisyphus/gpt-5-4`, `./sisyphus/default`）
  2. 接受 upstream GPT-5.4 prompt builder 和 `buildParallelDelegationSection`
  3. 保留下游特有的 orchestration guidance、session-resume 规则、completion/archive workflow
  4. 确保下游规则不与 upstream 新规则冲突
- **Acceptance**: 文件无冲突；包含 upstream 模块化 + 下游 orchestration 规则
- **Risk**: 高（prompt 内容复杂）
- **结果记录**: 保留的下游 prompt 段落列表

### Task 5.3: 解决 start-work/index.ts 冲突

- **Files**: `src/hooks/start-work/index.ts`
- **Action**:
  1. 保留 HEAD 的完整兼容性 wrapper（placeholder sanitization, working-directory resolution, legacy plan mirroring）
  2. 添加 upstream 新 helper exports（`listWorktrees`, `parseWorktreeListPorcelain`）
- **Acceptance**: 文件无冲突；下游 wrapper 完整保留
- **Risk**: 中
- **结果记录**: 保留的 wrapper 功能列表

---

## Phase 6: CLI/Commands — Pattern E（4 个文件，中风险）

### Task 6.1: 解决 builtin-commands 2 个文件

- **Files**:
  - `src/features/builtin-commands/commands.ts`
  - `src/features/builtin-commands/templates/start-work.ts`
- **Action**:
  - **commands.ts**:
    1. 接受 upstream `ULW_LOOP_TEMPLATE` 修复
    2. 保留所有下游命令：`status`, `revert`, `instinct-import`, `instinct-export`, `evolve`, `instinct-status`, `build-fix`, `learn`
    3. 保留下游 imports 和 preset/agent-chain wiring
  - **templates/start-work.ts**:
    1. 保留下游 `--mode <sequential|parallel|wave>` 支持
    2. 接受 upstream 的 mandatory task breakdown section 和 worktree completion/merge workflow
- **Acceptance**: 2 个文件无冲突；下游命令完整保留
- **Risk**: 中
- **结果记录**: 最终命令列表

### Task 6.2: 解决 delegate-task 和 momus

- **Files**:
  - `src/tools/delegate-task/constants.ts`
  - `src/agents/momus.ts`
- **Action**:
  - **constants.ts**:
    1. 接受 upstream visual-engineering prompt 强化和 model 更新
    2. 保留下游 category helper exports 和 plan-family constants
  - **momus.ts**:
    1. 接受 upstream prompt split（default vs GPT-specific）和 QA-scenario 要求
    2. 将 upstream `.sisyphus/plans/*.md` 替换为下游 `changes/*/...`
- **Acceptance**: 2 个文件无冲突
- **Risk**: 中
- **结果记录**: 合并策略摘要

---

## Phase 7: Core Registry — Pattern B（10 个文件，极高风险）

### Task 7.1: 解决 hooks/index.ts

- **Files**: `src/hooks/index.ts`
- **Action**:
  1. 接受 upstream 的新 hook exports 和 reorganized 导出路径
  2. 追加所有下游专属 hook exports（参照 `downstream-snapshot.md` Section 2，共 ~40 个下游独有导出）
  3. 确保 upstream 新增的 `createTodoDescriptionOverrideHook` 等保留
- **Acceptance**: 文件包含 upstream 全部 exports + 下游全部 exports
- **Risk**: 高
- **Dependencies**: 无
- **结果记录**: 最终 export 数量（upstream + downstream）

### Task 7.2: 解决 agents 注册文件（3 个文件）

- **Files**:
  - `src/agents/builtin-agents.ts`
  - `src/agents/builtin-agents/general-agents.ts`
  - `src/agents/types.ts`
- **Action**:
  - **builtin-agents.ts**:
    1. 保留下游 `discoverDownstreamAgents`, `mergedAgentSources`, `mergedAgentMetadata`
    2. 添加 upstream `sisyphus-junior` 和 `isFirstRunNoCache`
  - **general-agents.ts**:
    1. 保留下游 generic string-keyed `agentSources`（支持动态发现的 non-BuiltinAgentName agents）
    2. 添加 upstream `isFirstRunNoCache` fallback + `sisyphus-junior` skip rule
  - **types.ts**:
    1. Union 合并：保留 `prometheus`, `observer` + 添加 `sisyphus-junior`
- **Acceptance**: 3 个文件无冲突；所有 agent 类型和注册逻辑保留
- **Risk**: 高
- **结果记录**: 最终 BuiltinAgentName 联合类型列表

### Task 7.3: 解决 plugin 相关文件（4 个文件）

- **Files**:
  - `src/plugin-handlers/agent-config-handler.ts`
  - `src/plugin/hooks/create-tool-guard-hooks.ts`
  - `src/plugin/skill-context.ts`
  - `src/plugin/tool-execute-after.ts`
  - `src/plugin/tool-registry.ts`
- **Action**:
  - **agent-config-handler.ts**: 保留下游 config pipeline + 添加 upstream protected-agent override 和 junior 继承
  - **create-tool-guard-hooks.ts**: 保留 `tasks-md-creation-guard` + 添加 `todo-description-override`（4 处：import、type、factory、return）
  - **skill-context.ts**: 保留下游 merge order + 添加 upstream provider gating
  - **tool-execute-after.ts**: 保留下游 hook chain + 用 upstream ULW verification 和 corruption protection 包裹
  - **tool-registry.ts**: 保留下游 tool creators（`createAstGrepTools` 等）+ 添加 upstream schema normalization
- **Acceptance**: 5 个文件无冲突
- **Risk**: 高
- **结果记录**: 每个文件的合并决策摘要

### Task 7.4: 解决 src/index.ts（最关键）

- **Files**: `src/index.ts`
- **Action**:
  1. 接受 upstream 的 `createPluginDispose` / `activePluginDispose` 新增
  2. 接受 upstream 的 compaction injector API 变更：`capture()` / `inject()` 对象风格
  3. 保留下游全部内容：
     - `initConfigContext(...)` bootstrap
     - `createContextDetector`, `HookCondition`, conditional disabled-hook evaluation
     - `bootstrapDownstreamHooks(...)` 及其所有 runner 方法
     - `repairMisbucketedSessionMetadata(...)` session 修复
     - `tmuxConfig` 构造
     - `createManagers(...)` 下游参数（`backgroundNotificationHookEnabled`）
     - 所有 wrapper methods: `chat.message`, `UserPromptSubmit`, `event`, `tool.execute.before`, `tool.execute.after`, `experimental.session.compacting`
  4. 适配 compaction injector API：将下游 wrapper 中的 `hooks.compactionContextInjector(_input.sessionID)` 改为 `hooks.compactionContextInjector?.capture(_input.sessionID)` 和 `.inject()`
  5. 在 startup 序列中添加 `await activePluginDispose?.()`
  6. 在 plugin interface 返回前设置 `activePluginDispose = dispose`
- **Acceptance**:
  - 文件无冲突标记
  - 包含 upstream disposal + compaction API
  - 包含下游全部 wrapper 和 bootstrap
  - `tsc --noEmit` 对此文件无错误
- **Risk**: 极高
- **Dependencies**: Task 7.1 ~ 7.3（先解决其他核心文件）
- **结果记录**: 最终保留的 upstream 新功能列表 + 下游 wrapper 数量

---

## Phase 8: Dependencies（1 个文件）

### Task 8.1: 重新生成 bun.lock

- **Files**: `bun.lock`
- **Action**:
  1. 接受 upstream 版本的 bun.lock 作为基础：`git checkout --theirs bun.lock`
  2. 运行 `bun install` 重新生成（基于已解决的 package.json）
  3. 如果 `bun install` 网络失败，尝试 `bun install --no-verify`
- **Acceptance**: `bun.lock` 无冲突，与 `package.json` 一致
- **Risk**: 中（网络依赖）
- **Dependencies**: Task 2.2（package.json 必须先解决）
- **结果记录**: 安装是否成功，新增/删除的依赖数量

---

## Phase 9: Verification

### Task 9.1: TypeScript 类型检查

- **Action**: `tsc --noEmit`
- **Acceptance**: 0 errors
- **Risk**: 高（可能发现遗漏的类型/导入问题）
- **Dependencies**: Phase 1~8 全部完成
- **结果记录**: 错误数量和修复列表

### Task 9.2: Build 验证

- **Action**: `bun run build`
- **Acceptance**: Build 成功
- **Risk**: 中
- **Dependencies**: Task 9.1
- **结果记录**: Build 输出大小和时间

### Task 9.3: 下游快照对比

- **Action**:
  1. 对比 `downstream-snapshot.md` 中的 hook exports 数量 vs 合并后的数量
  2. 对比 command entries 数量
  3. 对比 boulder-state types/functions 数量
  4. 对比 hook schema entries 数量
  5. 确认所有下游独立目录仍存在
- **Acceptance**: 所有下游注册点数量 ≥ snapshot 值
- **Risk**: 低
- **Dependencies**: Task 9.1
- **结果记录**: 对比表格

### Task 9.4: 提交并同步

- **Action**:
  1. `git add .`
  2. `git commit -m "sync: merge upstream/dev (c3b23bf6) into dev, preserve all downstream features"`
  3. 在 update 仓库同步：
     ```bash
     cd E:\github\oh-my-opencode-update
     git fetch origin
     git reset --hard origin/dev  # 或者 git pull
     ```
  4. 验证两个仓库 HEAD 一致
- **Acceptance**: 两个仓库 HEAD commit hash 相同
- **Risk**: 低
- **Dependencies**: Task 9.1 ~ 9.3
- **结果记录**: 最终 commit hash

---

## 执行顺序总结

```
Phase 1 (7 文件, accept-upstream, ~5 min)
  → Phase 2 (6 文件, config/infra, ~15 min)
  → Phase 3 (5 文件, minor divergence, ~15 min)
  → Phase 4 (6 文件, tests, ~15 min)
  → Phase 5 (5 文件, modularization, ~20 min)
  → Phase 6 (4 文件, cli/commands, ~15 min)
  → Phase 7 (10 文件, core registry, ~45 min) ← 最高风险
  → Phase 8 (1 文件, bun.lock, ~5 min)
  → Phase 9 (verification, ~15 min)
```

每个 Phase 完成后都可以做增量 `git add`。
