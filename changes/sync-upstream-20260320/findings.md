# Findings: Sync Upstream oh-my-openagent (2026-03-20)

## 冲突概览

- **Upstream**: `code-yeongyu/oh-my-openagent` → `upstream/dev` @ `c3b23bf6`
- **冲突文件数**: 46
- **冲突模式数**: 6（A/B/C/D/E/F）

## 冲突分类统计

| 模式 | 描述 | 文件数 | 风险 | 解决策略 |
|------|------|:------:|:----:|----------|
| Accept-upstream | 直接接受上游版本 | 7 | 低 | `git checkout --theirs` |
| F: Config/Infra | 配置/依赖/schema | 6 | 中 | 合并两侧 |
| C: Minor divergence | 小幅分歧 | 5 | 中 | Case-by-case |
| D: Tests | 测试文件 | 6 | 中 | 合并两侧测试覆盖 |
| A: Modularization | 上游模块化重构 | 5 | 中 | 接受上游+保留路径 |
| E: CLI/Commands | 命令/prompt | 4 | 中 | 保留下游命令+接受上游 |
| B: Core Registry | 核心注册 | 10 | 极高 | 手动合并 |
| Dependencies | bun.lock | 1 | 中 | 重新生成 |
| **合计** | | **46** | | |

## 关键技术发现

### 1. 下游 hook 架构已迁移

下游 `src/index.ts` 不再使用 `isHookEnabledLoose()` 模式（0 occurrences）。
所有下游 hook 注册通过 `bootstrapDownstreamHooks()` 集中管理，runner 方法包括：
- `runChatMessage()`, `runUserPromptSubmit()`, `runEvent()`
- `runToolExecuteBefore()`, `runToolExecuteAfter()`
- `runExperimentalSessionCompacting()`

### 2. 上游 API 变更

- **Plugin Disposal**: 新增 `createPluginDispose` / `activePluginDispose` 生命周期
- **Compaction Injector**: `function(sessionID)` → `{ capture(sessionID), inject(sessionID) }` 对象 API
- **Background Manager**: 新增 circuit breaker, spawn depth limits, session permission propagation
- **Agent Types**: 新增 `sisyphus-junior`
- **Tool Guard**: 新增 `todo-description-override` hook

### 3. 路径约定分歧

- 上游使用 `.sisyphus/plans/*.md`, `.sisyphus/notepads/`, `.sisyphus/evidence/`
- 下游使用 `changes/{name}/tasks.md`, `changes/{name}/design.md` 等
- **决策**: 保留下游 `changes/` 约定

### 4. 下游独有资产（必须保留）

- **Hook exports**: ~40 个下游独有（见 downstream-snapshot.md Section 2）
- **Commands**: 8 个下游独有（`status`, `revert`, `instinct-*`, `evolve`, `build-fix`, `learn`）
- **Hook schema entries**: 5 个下游独有（`secret-scanner`, `tasks-md-creation-guard`, `plan-*` 系列）
- **Agent types**: `prometheus`, `observer`
- **Directories**: ~80 个下游独有 `src/` 子目录

### 5. 上游新功能（必须保留）

- `sisyphus-junior` agent + fallback model + skip rules
- Plugin disposal lifecycle
- Background manager reliability improvements
- `todo-description-override` hook
- GPT-5.4 prompt builders
- Anti-duplication section in atlas prompts
- Provider-gated skill filtering

## 文件级分析摘要

### Accept-upstream 文件（7 个，无需手动操作）

| 文件 | 原因 |
|------|------|
| `resolve-file-uri.test.ts` | 上游测试更健壮 |
| `oracle.ts` | 仅格式差异 |
| `auto-slash-command/executor.ts` | 上游集中式命令发现 |
| `auto-slash-command/hook.ts` | 上游 TTL 清理 + agent-aware |
| `start-work-hook.ts` | 上游 worktree 警告更好 |
| `shared/index.ts` | HEAD 是测试 artifact |
| `shared/logger.ts` | 上游 buffered logger 更好 |

### 最高风险文件

1. **`src/index.ts`** — 3 conflict blocks, 上游 disposal + compaction API change vs 下游全部 wrapper
2. **`src/features/background-agent/manager.ts`** — 3 blocks, 大型语义合并
3. **`src/agents/sisyphus.ts`** — 5 blocks, monolith vs modular prompts
4. **`src/hooks/index.ts`** — 1 block, ~80 exports to merge
5. **`src/plugin/tool-registry.ts`** — 3 blocks, tool creator inventory

---

*后续发现将在执行过程中追加到此文件*

### 2026-03-20 - Task 9.1 typecheck

- Task 9.1 的首个阻塞不是普通类型错误，而是 `src/features/background-agent/manager.ts` 残留 merge conflict markers；先将该文件恢复到已接受的本地侧版本，才能让 `tsc --noEmit` 继续暴露真实错误集。
- 真实 typecheck 错误共 3 类：`doctor` 模块缺失 `LspServerInfo` 类型导出、`auto-slash-command` 未兼容 runtime command template 的函数型 `content`、以及 `BackgroundManager` 缺失 sync/call-omo-agent 已开始依赖的 subagent spawn guard 方法（`assertCanSpawn` / `reserveSubagentSpawn`）。
- 最小修复集为 3 个 TypeScript 文件：在 `src/cli/doctor/types.ts` 补回 `LspServerInfo`，在 `src/hooks/auto-slash-command/executor.ts` 复用 slashcommand 的 command-content 解析模式，在 `src/features/background-agent/manager.ts` 补入基于 `subagent-spawn-limits.ts` 的 spawn guard 包装；随后 repo 级 `tsc --noEmit` 归零。

### 2026-03-20 - Task 8.1 bun.lock

- `bun.lock` 的最小解决步骤是先按计划接受 upstream/theirs 作为 merge base，再基于已合并的 `package.json` 重新执行 Bun 解析并重新 `git add bun.lock` 清除 `UU`。
- 本地第一次 `bun install` 因 `@ast-grep/napi-win32-x64-msvc` integrity check 失败而中断；按计划重试 `bun install --no-verify` 后已保存 lockfile，但仓库里其他文件仍有冲突标记，触发 `prepare -> bun run build` 失败，与 `bun.lock` 本身无关。
- 为避免把 Task 9 的构建问题提前混入依赖再生步骤，最终用 `bun install --no-verify --ignore-scripts` 验证依赖解析可稳定完成；随后 `rtk proxy git diff --check -- bun.lock` 通过，`rtk git status --short -- bun.lock package.json` 显示 `bun.lock`/`package.json` 均为 staged `M`，且 `bun.lock` 不再是 `UU`。

### 2026-03-20 - Task 7.1 hooks/index.ts

- `src/hooks/index.ts` 的最小合并是以 HEAD 的下游 barrel 为基底，补齐上游 session notification helper exports（sender/formatting/scheduler/status）、`createTodoDescriptionOverrideHook`，并把 `json-error-recovery` 改为完整 named exports；`createCompactionContextInjector` 应从当前模块入口 `./compaction-context-injector` 导出，同时继续保留下游 planning/verification/observation hook exports。

### 2026-03-20 - Task 7.1 hooks/index.ts follow-up

- follow-up 仅按 Biome `organizeImports` 要求重排 `src/hooks/index.ts` 的 barrel exports；未增删任何导出名，保持合并后的 export surface 不变。

### 2026-03-20 - Task 7.2 agents registry trio

- `src/agents/builtin-agents.ts` 的最小合并是保留下游 `discoverDownstreamAgents()` + `mergedAgentSources` / `mergedAgentMetadata` 动态扩展路径，同时补入上游 `createSisyphusJuniorAgentWithOverrides` 注册，并把 `isFirstRunNoCache` 继续传入 general-agent 收集流程。
- `src/agents/builtin-agents/general-agents.ts` 不能收紧为 builtin-only map；应继续接受 `Record<string, AgentSource>` 以容纳下游自动发现 agent，并只对 builtin 名字做 requirements/override 查询；同时加入上游 first-run-no-cache fallback 和 `sisyphus-junior` skip rule，避免与 plugin-handler 的显式注册重复。
- `src/agents/types.ts` 的 builtin union 必须同时包含下游 `prometheus`、`observer` 与上游 `sisyphus-junior`，这样 registry/types/model-requirements 三处名字集合才能保持一致。

### 2026-03-20 - Task 5.1 atlas default.ts

- `src/agents/atlas/default.ts` 的最小合并是以上游 prompt 架构为主：保留 `buildAntiDuplicationSection()`、`<auto_continue>`、Final Verification Wave / post-delegation 语义，同时把 `.sisyphus/...` 计划与 notepad 路径全部替换为下游 `changes/{name}/...`，并继续保留文件头部的 `TDD-EXEMPT: Path migration to changes/` 标记。

### 2026-03-20 - Task 4.1 schema.test.ts

- `src/config/schema.test.ts` 的最小合并是同时保留 `HookNameSchema` 对下游 `plan-*` hooks 的接受测试与上游已移除 hook 名 `delegate-task-english-directive` 的拒绝测试；两者都与当前 `src/config/schema/hooks.ts` 一致。

### 2026-03-20 - Task 4.1 compaction-context-injector index.test.ts

- `src/hooks/compaction-context-injector/index.test.ts` 的最小合并应改为直接测试 `hook.ts` 的对象 API：保留验证状态相关 prompt 断言与 no-text/checkpoint 恢复事件测试，接受上游 `inject()`/delegated session 覆盖，并移除已不匹配当前实现的旧 `injectHookMessage`/anti-pattern 存储断言。

### 2026-03-20 - Task 4.1 ralph-loop index.test.ts

- `src/hooks/ralph-loop/index.test.ts` 的最小合并是以下游完整回归集为基础，按已合并的 `completion-promise-detector.ts` 更新断言：保留 instruction-like 误报过滤与 transcript/tool_result 覆盖，加入 `started_at` 旧 transcript 过滤与 assistant `tool_result` part 检测，并把 ultrawork 完成期望改为先进入 Oracle verification 流程。

### 2026-03-20 - Task 4.1 model-availability.test.ts

- `src/shared/model-availability.test.ts` 的最小合并是同时保留下游 `OPENCODE_CONFIG_DIR` / `XDG_CACHE_HOME` 隔离与上游 `readProviderModelsCache` spy/mock 方案：前者确保配置路径读取不串测试环境，后者让 provider-models cache 分支可控；两侧在当前 `model-availability.ts` 下是互补关系。

### 2026-03-20 - Task 3.2 completion-promise-detector.ts

- `completion-promise-detector.ts` 的最小合并做法是保留下游 `isCompletionText`/instruction-like 误报过滤与 `tool_output` 文本抽取，同时只吸收上游 `startedAt` 时间范围过滤，并让 assistant session parts 在 `tool_result` 情况下复用同一套文本候选提取逻辑。

### 2026-03-20 - Task 3.2 completion-promise-detector.ts follow-up fix

- final-wave F2 的空 `catch` 拒绝项可用两个极小 helper 收束：把 transcript 文件读取与 JSONL 行解析分别封装为返回 `null` 的安全函数，循环层继续 `continue`/`false`，即可移除空 `catch` 而不改变 false-positive 过滤、`startedAt` 窗口或 `tool_result` 扫描行为。
- 为锁定该行为，`completion-promise-detector.test.ts` 追加一个 transcript 回归：前面存在 malformed JSONL 行时，后续合法 assistant completion 仍应被检测到。

### 2026-03-20 - Task 1.1

- 已按 upstream/theirs 接受并暂存这 7 个文件：
  - `src/agents/builtin-agents/resolve-file-uri.test.ts`
  - `src/agents/oracle.ts`
  - `src/hooks/auto-slash-command/executor.ts`
  - `src/hooks/auto-slash-command/hook.ts`
  - `src/hooks/start-work/start-work-hook.ts`
  - `src/shared/index.ts`
  - `src/shared/logger.ts`

### 2026-03-20 - Task 2.1

- `.gitignore` 已移除冲突标记，保留 `.worktrees/`、`.test-*/`、`NUL`、`test-patch-id/`、`tmpopencode-source/`、`changess/`，并新增上游 `.omx/`。

### 2026-03-20 - Task 2.2

- `package.json` 已手动合并：接受上游 `3.11.0`、`prepare` 脚本、`@ast-grep/*` `0.41.1`、`@opencode-ai/*` `1.2.24`、`bun-types` `1.3.10`，同时保留下游 fork metadata（`repository`/`bugs`/`homepage`）以及 `@ai-sdk/*`、`mdast-*`、`remark-*`、`unified` 相关依赖，并移除全部冲突标记。

### 2026-03-20 - Task 2.2 follow-up fix

- 已将 `package.json` 的 `repository.url`、`bugs.url`、`homepage` 修正回下游 `HEAD` 的 fork identity：`oh-my-opencode`，其余 `3.11.0`、`prepare`、依赖升级与下游依赖保留结果不变。

### 2026-03-20 - Task 2.3

- `src/config/schema/hooks.ts` 已完成手动冲突合并：保留下游 schema extras `secret-scanner`、`tasks-md-creation-guard`、`plan-reorganizer`、`plan-update-reminder`、`plan-attention-refresher`，并加入上游 `todo-description-override`；`createHookNameSchema`、`parseHookName`、`HookName` 导出保持不变，文件已无冲突标记。

### 2026-03-20 - Task 2.4

- `src/features/boulder-state/types.ts` 已完成手动冲突合并：保留下游类型 `PhaseStatus`、`TaskPhaseStatus`、`TaskPhaseInfo`、`WaveWorktree`、`WaveExecutionState`、`WorktreeStatus`、`PlanProgress` 与 `BoulderState` 扩展字段 `phase`、`failure_count`、`last_updated`、`current_task`、`last_error`、`wave_execution`，并加入上游 `TaskSessionState`、`TopLevelTaskRef` 以及 `BoulderState.task_sessions`。

### 2026-03-20 - Task 2.4 storage.ts

- `src/features/boulder-state/storage.ts` 已完成冲突合并：保留下游 phase/progress/helpers、`changes/*/tasks.md` 发现逻辑与 legacy `.sisyphus/plans` fallback，同时加入上游 `task_sessions` 读写支持、reserved key 防护，以及 `appendSessionId()`/`upsertTaskSessionState()` 写失败回滚。

### 2026-03-20 - Task 2.4 index.ts

- `src/features/boulder-state/index.ts` 已完成最小 barrel 合并：保留下游 `./worktree-manager`、`./retry-tracker`，加入上游 `./top-level-task`，并按当前模块导出排序移除冲突标记。

### 2026-03-20 - Task 3.1 atlas-hook.ts

- `src/hooks/atlas/atlas-hook.ts` 已完成最小冲突合并：保留下游 `createAtlasEventHandler -> createBoulderGatingWrapper -> createContinuationMaxRetriesWrapper` 包装链，同时把上游 `pendingTaskRefs` 接入 `tool.execute.before/after`，并为 `tool.execute.after` 保留 `autoCommit` 与 `getState`。

### 2026-03-20 - Task 3.1 system-reminder-templates.ts

- `src/hooks/atlas/system-reminder-templates.ts` 已完成最小冲突合并：`BOULDER_CONTINUATION_PROMPT` 保留下游 `changes/{PLAN_NAME}/` notepad 路径与完成后将 `- [ ]` 改为 `- [x]` 的提醒，同时移除冲突标记并接受其余上游措辞。

### 2026-03-20 - Task 3.1 verification-reminders.ts

- `src/hooks/atlas/verification-reminders.ts` 已完成最小冲突合并：保留上游 `buildReuseHint` / `buildCompletionGate` / `buildFinalWaveApprovalReminder` 结构，同时将计划路径统一为下游 `changes/${planName}/tasks.md`，并保留 `buildOrchestratorReminder` 中的“STEP 7: MARK COMPLETION IN PLAN FILE”区块。

### 2026-03-20 - Task 3.2 model-requirements.ts

- `model-requirements.ts` 的正确最小合并是保留上游刷新后的 `AGENT_MODEL_REQUIREMENTS` 模型名与顺序，只在冲突尾部同时保留下游 `observer` fallback chain，并加入上游 `sisyphus-junior` 条目后直接闭合对象。

### 2026-03-20 - Task 4.1 model-requirements.test.ts

- `src/shared/model-requirements.test.ts` 的最小合并是让测试快照跟随当前 `model-requirements.ts`：保留下游 `observer` 覆盖、接受上游 `sisyphus-junior` 覆盖，并把 builtin agent 总数断言更新为 12，以同时验证两侧条目都存在。

### 2026-03-20 - Task 4.1 delegate-task tools.test.ts

- `src/tools/delegate-task/tools.test.ts` 的最终最小合并是保留下游 category/continuation 回归集并接受上游 `run_in_background` 必填与 sync/background 分流覆盖，同时把所有基于 builtin `ultrabrain` 的陈旧期望统一更新为当前 `constants.ts` 的 `openai/gpt-5.4`；显式用户覆盖为 `gpt-5.3-codex` 的断言保持不变。

### 2026-03-20 - Task 6.2 delegate-task constants.ts

- `src/tools/delegate-task/constants.ts` 的最小合并是保留下游 helper exports、plan-family 常量与扩展 category/defaultSkills 结构，同时接受上游更强的 `visual-engineering` design-system workflow 提示，以及 `ultrabrain`=`openai/gpt-5.4`、`quick`=`openai/gpt-5.4-mini` 的模型更新。

### 2026-03-20 - Task 5.1 atlas gemini.ts

- `src/agents/atlas/gemini.ts` 的最小合并是接受上游 `buildAntiDuplicationSection()`、`<auto_continue>`、Final Verification Wave / post-delegation 语义，同时将所有 `.sisyphus/...` prompt 路径替换为下游 `changes/{plan-name}/...` / `changes/{name}/...`，并保留 `TDD-EXEMPT: Path migration to changes/` 注释。

### 2026-03-20 - Task 5.1 atlas gpt.ts

- `src/agents/atlas/gpt.ts` 的最小合并是以上游 GPT prompt 架构为主，保留 `buildAntiDuplicationSection()`、`<auto_continue>` 与 Final Verification Wave 语义，同时把所有 plan/notepad 路径统一为下游 `changes/{name}/...`，并保留 `// TDD-EXEMPT: reason="Path migration to changes/"` 与 plan read-only 约束。

### 2026-03-20 - Task 5.2 sisyphus.ts

- `src/agents/sisyphus.ts` 的最小合并是保留下游非 GPT-5.4 orchestration prompt 主体与 completion/archive workflow，同时接受上游 `./sisyphus/gemini`、`./sisyphus/gpt-5-4`、`./sisyphus/default` 模块化导入、GPT-5.4 fast path、`buildParallelDelegationSection()` 与 `buildAntiDuplicationSection()`，并把早期 session-resume guidance 对齐到 `session_id` continuation 语义。

### 2026-03-20 - Task 5.3 start-work/index.ts

- `src/hooks/start-work/index.ts` 的最小合并是保留下游 compatibility wrapper：继续在本地 `createStartWorkHook()` 中做 placeholder sanitization、基于 message path 的 working-directory 解析，以及 `changes/*/tasks.md` 到 `LEGACY_PROMETHEUS_PLANS_DIR` 的 legacy mirror；同时只补齐上游 barrel 导出 `HOOK_NAME`、`detectWorktreePath`、`listWorktrees`、`parseWorktreeListPorcelain`，避免重新导出上游 `createStartWorkHook` 与本地 wrapper 冲突。

### 2026-03-20 - Task 6.1 builtin-commands

- `src/features/builtin-commands/commands.ts` 的最小合并是以下游 registry 为主：保留 `status`、`revert`、`instinct-import`、`instinct-export`、`evolve`、`instinct-status`、`build-fix`、`learn` 以及 runtime preset/agent-chain 注入逻辑，只吸收上游 `ULW_LOOP_TEMPLATE` 和 loop argument hint 更新。
- `src/features/builtin-commands/templates/start-work.ts` 的最小合并是保留下游 `changes/` plan 搜索、merged-context 注入与 `--mode <sequential|parallel|wave>` 提示，同时补入上游 mandatory task breakdown 与 worktree completion/merge 流程，并避免把路径退回 `.sisyphus/plans/*.md`。

### 2026-03-20 - Task 6.2 momus.ts

- `src/agents/momus.ts` 的最小合并是保留上游 default/GPT split prompt 结构与 `createMomusAgent()` 的条件选择，同时把 prompt 与 metadata 中的 reviewable 路径统一到下游 `changes/{name}/tasks.md`、`changes/{name}/design.md`、`changes/{name}/proposal.md`，并继续保留 practical blocker-finder 立场与 QA scenario 可执行性要求。
- `MOMUS_SYSTEM_PROMPT` 继续导出 default prompt，GPT 变体仅在 `isGptModel(model)` 分支启用；agent description 与 `momusPromptMetadata.keyTrigger` 也同步对齐到新的 `changes/` 约定，避免残留 `.sisyphus/plans/*.md` 假设。

### 2026-03-20 - Task 6.2 momus.ts follow-up

- `src/agents/momus.ts` 的 follow-up 仅做 import 顺序整理以满足 Biome `organizeImports`；prompt 内容、`changes/` 路径约定、metadata 和 factory 逻辑均未变更。

### 2026-03-20 - Task 7.3 plugin registry quintet

- `src/plugin-handlers/agent-config-handler.ts` 的最小合并是保留下游 skill-awareness/custom-agent layering 与 Sisyphus build/plan flow，同时接入上游 `customAgentSummaries`、protected-agent override 过滤，并让 `sisyphus-junior` 从已解析的 Atlas model 继承默认模型而不回退到硬编码默认值。
- `src/plugin/hooks/create-tool-guard-hooks.ts` 必须同时返回下游 `tasksMdCreationGuard` 与上游 `todoDescriptionOverride`；前者继续供 `tool.execute.before/after` 使用，后者继续供 `tool.definition` 使用，二者不能互相覆盖。
- `src/plugin/skill-context.ts` 的 provider-gated 过滤应只插在 merge 之前，不能改变下游 skill merge order：`builtin -> config -> user+agentsGlobal -> global -> project+agentsProject -> opencodeProject`。
- `src/plugin/tool-execute-after.ts` 的最小合并是保留下游 after-hook 顺序（`claudeCodeHooks` 仍先于 `toolOutputTruncator`，并保留末尾 `tasksMdCreationGuard`），再包入上游 ULW verification session tracking 与 `extract`/`discard` 输出回滚保护。
- `src/plugin/tool-registry.ts` 不能退回上游 `builtinTools` 常量；应继续使用下游 `createBuiltinTools({ additionalTools })`、task/hashline tool inventory，并在过滤 disabled tools 之前对全部 tool definitions 执行 `normalizeToolArgSchemas()`，同时把 `createCallOmoAgent()` 扩展参数对齐到当前 agent/category override 解析路径。

### 2026-03-20 - Task 7.3 follow-up fix

- follow-up 仅修复 QA 拒绝项：`agent-config-handler.ts` 将 `ctx.client?: any` 收紧为现有仓库约定 `PluginInput["client"]`，并与 `create-tool-guard-hooks.ts`、`tool-execute-after.ts` 一起做 import order 清理；Task 7.3 的 merge 语义未改动。

### 2026-03-20 - Task 7.3 blocker retry

- `tool-execute-after.ts` 的测试可见语义必须是 `toolOutputTruncator` 先于 `claudeCodeHooks` 运行，否则 Claude hook 读到的是原始输出而非截断后的输出；其余 Task 7.3 after-hook 链、ULW verification tracking 与 `extract`/`discard` rollback 可保持不变。
- `src/shared/index.ts` 需要继续 barrel 导出 `generateAgentSkillReminder`；否则 `agent-config-handler.test.ts` 在加载共享模块时会因为缺失 re-export 直接失败。
- 实际执行目标测试时还暴露了一个隐藏相邻回归：`agent-config-handler.ts` 重新需要把 `useTaskSystem` 作为第三参数传给 `createSisyphusJuniorAgentWithOverrides()`，并为此恢复 `src/agents/sisyphus-junior.ts` 的可选第三参数签名；这是通过目标测试所必需的最小相邻修复。

### 2026-03-20 - Task 7.3 final shared barrel cleanup

- `src/shared/index.ts` 的 barrel export 已按 source path 重排，并保留 `skill-reminder-generator` re-export；本地 `biome check src/shared/index.ts` 静默通过，但 `lsp_diagnostics(..., severity="all")` 仍返回 info 级 `assist/source/organizeImports`，说明当前 LSP/Biome 对该 barrel 的建议与 CLI 检查结果不一致。

### 2026-03-20 - Task 7.3 final shared barrel cleanup fix

- `src/shared/index.ts` 的最终 Biome 修复包含两点：补全所有 export 语句分号，并把 `resolveModelPipeline` / `model-resolution-types` 放到 `model-resolver` exports 之前；另外 `export type` block 里的缩进也必须匹配 Biome formatter 预期，否则 `bunx @biomejs/biome check` 仍会失败。

### 2026-03-20 - Task 7.4 index.ts

- `src/index.ts` 的最小合并是保留下游 runtime bootstrap/wrapper 链（`initConfigContext`、conditional disabled-hook 计算、`bootstrapDownstreamHooks()`、`repairMisbucketedSessionMetadata()`、tool/event/chat wrappers、`tmuxConfig`、`createManagers(...backgroundNotificationHookEnabled)`），同时接入上游 `createPluginDispose` / `activePluginDispose` 生命周期，并把 `experimental.session.compacting` 更新为 `compactionContextInjector.capture(sessionID)` + `inject(sessionID)` 对象 API。
- 为了让 `src/index.ts` 实际收到新的 injector 对象而不是旧的 summarize 函数，必须做一个最小相邻兼容修复：`src/plugin/hooks/create-continuation-hooks.ts` 需要直接从 `../../hooks/compaction-context-injector/hook` 导入 `createCompactionContextInjector`，避免继续经过仍指向 legacy 实现的 hooks barrel。

### 2026-03-20 - Task 9.1 plan-template.ts merge fix

- `src/agents/prometheus/plan-template.ts` 的最小合并只处理 `## Final Verification Wave` 下的两个冲突块：保留上游 final-wave wording/format skeleton（`F1` / `F3` 标题与周围措辞风格），但把证据路径继续固定为下游 `changes/{name}/` 与 `changes/{name}/final-qa/`，不回退到 `.sisyphus/evidence/...`。
- 冲突标记已全部移除；`lsp_diagnostics` 对目标文件 clean；repo 级 `"C:\Users\daixu\AppData\Roaming\npm\bun.cmd" run typecheck` 已执行且未返回类型错误；`git add` 后 `git status --short -- src/agents/prometheus/plan-template.ts` 显示 staged `M`，不再是 `UU`。

### 2026-03-20 - Task 9.4 commit scope decisions

- `.opencode/oh-my-opencode.jsonc` 当前仅表现为本地未暂存删除，不属于上游同步产物；应恢复而不是提交删除。
- `assets/oh-my-opencode.schema.json` 的未暂存 `openclaw` schema 扩展来自已完成的 build 验证后生成结果，属于应保留的生成产物；最终应把该最新生成内容纳入提交，而不是回退到较早的 staged 版本。
- `changes/sync-upstream-20260320/` 下的 `design.md`、`proposal.md`、`downstream-snapshot.md`、`learnings.md`、`tasks.md` 与 findings/progress 一起构成本次 upstream-sync 记录，应随本次 merge 提交。
- 明确排除的本地杂物/非预期文件包括：`.opencode/.lock-*.tmp`、`.opencode/merge-analysis/**`、`.opencode/oh-my-opencode1.jsonc`、`debug-test-scratch.txt`、`githubanomalyco-opencode/`、`reproduce_bug.ts`，以及未进入暂存区的 `vendor/`、`src/downstream/runtime-hook-executor.test.ts`、`src/hooks/failure-counter/index.test.ts`；它们不是已验证的 merge 输出。

### 2026-03-20 - Task 5.1 follow-up Atlas read-only fix

- `src/agents/atlas/default.ts` 与 `src/agents/atlas/gemini.ts` 的 final-wave follow-up 最小修复是对齐已正确的 GPT 约定：`- Plan: \`changes/{name}/tasks.md\` (READ ONLY)`，并删除所有允许 Atlas 编辑或勾选 `changes/*/tasks.md` 的说明。
- 这次 follow-up 不需要改 `src/agents/atlas/gpt.ts`；默认版/Gemini 版只要移除 plan-editing boundary 和整个 `POST-DELEGATION RULE` 区块，即可消除“Atlas 可以编辑计划文件”的残留回归。
- prompt 测试的稳妥断言应锁定两个点：一是 downstream `changes/{name}/tasks.md` read-only 描述必须存在，二是 prompt 中不得再出现 `edit the plan checkbox` / `change \`- [ ]\` to \`- [x]\`` 等编辑指令；验证示例里的读取占位符仍可能是 `{name}` 或 `{plan-name}`，测试不应把它误判为回归。
