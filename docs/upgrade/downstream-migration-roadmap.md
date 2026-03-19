# 下游功能融合路线图

> 从 auto-registry 基础设施建好到全部功能融合完成的完整步骤。
> 创建时间: 2026-03-11
> 最后更新: 2026-03-19 (①~⑧ 全部完成, ⑨ 上游同步计划已建立, ⑩ hook 修复待上游同步后重评估)

---

## 当前状态总览

| 指标 | 数值 |
|------|------|
| 下游功能总数 | 113 项（`docs/未验证新功能.md`） |
| 历史已验证（PASS/FAIL/PARTIAL） | 58 项（42 / 15 / 1） |
| B 类专项验证 | 41 项（静态/行为验证完成；全量 `bun test` 回归门禁于 2026-03-16 经用户授权记录后跳过） |
| C 类（从未实现） | 14 项 |
| bun test 基线 | 593 fail / 127 errors / 22 snapshot failures |
| .sisyphus 残留引用 | 368 处 / 79 个文件 |

---

## 验证结果完整索引

> 每条记录来自 `changes/verify-*/findings.md`，标注具体出处。

### FAIL 项（15 项）— 按修复优先级排序

| # | 功能名 | 类型 | 失败原因 | findings 出处 | 目标修复 changes |
|:-:|--------|:----:|----------|---------------|:----------------:|
| F1 | 🔬 Boulder gating (readPlanProgress) | Module | `readPlanProgress()` 定义在 `reader.ts` 但从未在应用代码中调用 | `verify-todo-fix/findings.md` V-3.1 | ① fix-boulder (✅已验证) |
| F2 | 🔬 CLI continuation-state (isMaxRetries) | Command | 未包含 `isMaxRetries` 条件检查，CLI 会无限轮询 | `verify-fix-continuation/findings.md` V-3.2 | ① fix-boulder (✅已验证) |
| F3 | .sisyphus 残留引用 | Patch | 368 处 / 79 文件仍使用旧 `.sisyphus` 路径 | `verify-todo-fix/findings.md` V-2.1, V-6.4 | ① fix-boulder |
| F4 | 🔬 TDD State Tracker | Module | `TddStateTracker` 已实现但未被 `tdd-guard` 或其他组件使用（死代码） | `verify-integrate-missing/findings.md` V-3.1 | ① fix-boulder (✅已验证) |
| F5 | ✅ mdsel-enforcer 未注册 | Hook | 未注册到 `index.ts`，hook 不生效；HookNameSchema 缺失 | `verify-todo-fix/findings.md` V-4.3, V-4.4 | ① fix-boulder (observed) |
| F6 | ✅ mdsel-enforcer 不拦截 | Hook | hook 未注册导致大 .md 不被拦截 | `verify-todo-fix/findings.md` V-6.1 | ① fix-boulder (observed) |
| F7 | 🔬 TODO 无 boulder gating | Module | gating 未实现导致 TODO 不感知活跃 plan | `verify-todo-fix/findings.md` V-6.3 | ① fix-boulder (✅已验证) |
| F8 | MCP Health Checker | Module | `checkAllOnStartup()` 未在任何启动流程中被调用 | `verify-integrate-missing/findings.md` V-2.2 | ④ fix-remaining |
| F9 | Commit Size Checker UI 反馈 | Hook | 逻辑存在但 CLI 反馈机制未显式呈现，警告可能被忽略 | `verify-integrate-missing/findings.md` V-6.2 | ④ fix-remaining |
| F10 | HookNameSchema 缺失条目 | Module | 新增 Hook 未在 Schema 中定义，影响配置识别 | `verify-integrate-missing/findings.md` V-7.1; `verify-fix-and-implement/findings.md` | ⑤ reform-upstream |
| F11 | relevance-scorer 误报（已解决/PASS） | Module | 实际已被 `context-injector/collector.ts` 使用；此前“未使用”报告为误判 | `verify-fix-and-implement/findings.md` | ④ fix-remaining |
| F12 | Bash 拦截正则不全 | Hook | regex fix 可能未覆盖所有 Bash 重定向场景 | `verify-auth/findings.md` | ④ fix-remaining |
| F13 | ✅ mdsel-enforcer 测试缺失 | Hook | `index.test.ts` 缺失，无法运行单元测试 | `verify-todo-fix/findings.md` V-4.1, V-5.1 | ① fix-boulder (verified) |
| F14 | 全量回归测试问题 | Patch | Model Resolution、TDD 执行、Windows 路径处理等回归 | `verify-integrate-missing/findings.md` V-5.2 | ⑥ verify-cleanup |
| F15 | 🔬 Boulder gating 测试也验证失败 | Module | 预期内：gating 未实现导致 V-6.3 反向也失败 | `verify-todo-fix/findings.md` V-6.3 | ① fix-boulder (✅已验证) |


### PARTIAL 项（1 项）

| # | 功能名 | 类型 | 问题 | findings 出处 | 目标修复 changes |
|:-:|--------|:----:|------|---------------|:----------------:|
| P1 | start-work hook 执行模式切换 | Hook | 代码中完全缺失 `execution_mode` (sequential/parallel) 选择逻辑 | `verify-fix-continuation/findings.md` V-4.1 | ④ fix-remaining |

### PASS 项（42 项）— 按验证来源分组

**来自 `verify-fix-and-implement-remaining/findings.md`（16 项 PASS）**:

| 功能名 | 类型 |
|--------|:----:|
| Build System | Patch |
| Full Regression | Patch |
| Module Unit Tests | Module |
| behavior-anchor Hook | Hook |
| skill-auto-injector Hook | Hook |
| secret-scanner Hook | Hook |
| knowledge-injection Hook | Hook |
| project-context-injector Hook | Hook |
| pr-context-injector Hook | Hook |
| verbosity-controller Hook | Hook |
| phase-rules-injector Hook | Hook |
| Agent existence pre-checks | Agent |
| Hook registration logic | Hook |
| File existence check | Module |
| Phase rollback integration | Module |
| anti-pattern-tracker / ast-coverage-checker / isolation-checker | Module ×3 |

**来自 `verify-todo-fix-and-progressive-disclosure/findings.md`（7 项 PASS）**:

| 功能名 | 类型 |
|--------|:----:|
| Build + 基线 (V-1.1) | Patch |
| changes/ 规范 (V-2.2) | Patch |
| TODO 单元测试 (V-3.2) | Module |
| Skill 注册 (V-4.2) | Skill |
| 工具名安全 (V-4.5) | Hook |
| 阻止逻辑 (V-4.6) | Hook |
| 全量回归 (V-5.2) / 小 .md 允许 (V-6.2) | Hook/Patch |

**来自 `verify-integrate-missing-features/findings.md`（7 项 PASS）**:

| 功能名 | 类型 |
|--------|:----:|
| Skill Auto-Injector 注册 (V-2.1) | Hook |
| Commit Size Checker 注册 (V-2.3) | Hook |
| Context Detector 集成 (V-2.4) | Module |
| Template Generator 集成 (V-3.2) | Hook |
| Agent Chains 集成 (V-4.1) | Command |
| Dead Code Detector 集成 (V-4.2) | Command |
| 单元测试验证 (V-5.1) / Skill 触发 (V-6.1) / 小提交 (V-6.3) / 模板生成 (V-6.4) | Hook/Module |

**来自 `verify-c5-guideline-anchoring/findings.md`（4 项 PASS）**:

| 功能名 | 类型 |
|--------|:----:|
| behavior-anchor Hook 启用状态 (V-0.1) | Hook |
| slop-detector 单元测试 (V-1.1) | Module |
| behavior-anchor 重复代码检测 (V-2.4) | Hook |
| behavior-anchor refreshInterval (V-2.5) / 冗长解释 (V-2.3) | Hook |

**来自 `verify-fix-continuation-start-work/findings.md`（3 项 PASS）**:

| 功能名 | 类型 |
|--------|:----:|
| BoulderState Verification (V-2.4) | Module |
| Retry Tracker Verification (V-3.1) | Module |
| start-work 单元测试 (V-4.2) | Hook |

**来自 `verify-misc-session-scorer-notepad/findings.md`（5 项 PASS）**:

| 功能名 | 类型 |
|--------|:----:|
| session-scorer 单元测试 (V-1.1) | Module |
| session-scorer 评分公式 (V-1.2) | Module |
| session-scorer session.stop 注册 (V-1.3) | Module |
| sisyphus-junior-notepad 单元测试 (V-2.1) | Hook |
| sisyphus-junior-notepad 条件触发 (V-2.3) / 反向触发 (V-2.4) | Hook |

**来自 `verify-auth/findings.md`（3 项 PASS）**:

| 功能名 | 类型 |
|--------|:----:|
| Write Interception | Hook |
| Skill Authorization | Skill |
| Authorized Write/Bash + Wave Auto-activation | Hook/Command |

**来自 `verify-test-hooks-real-environment3/findings.md`（1 项 PASS）**:

| 功能名 | 类型 |
|--------|:----:|
| comment-checker CLI 二进制检查 | Hook |

### 验证来源目录汇总

| verify 目录 | PASS | FAIL | PARTIAL | 总计 |
|-------------|:----:|:----:|:-------:|:----:|
| `verify-fix-and-implement-remaining` | 16 | 2 | 0 | 18 |
| `verify-todo-fix-and-progressive-disclosure` | 7 | 9 | 0 | 16 |
| `verify-integrate-missing-features` | 7 | 4 | 0 | 11 |
| `verify-c5-guideline-anchoring` | 4 | 0 | 0 | 4 |
| `verify-fix-continuation-start-work` | 3 | 1 | 1 | 5 |
| `verify-misc-session-scorer-notepad` | 5 | 0 | 0 | 5 |
| `verify-auth` | 3 | 1 | 0 | 4 |
| `verify-test-hooks-real-environment3` | 1 | 0 | 0 | 1 |
| `verify-open-code-user-session` | 9 | 2 | 0 | 11 |

> `verify-b-class-features` 为专项验证批次：覆盖 41 个 B 类功能，状态使用 `PASS / FAIL / AGENT_INVISIBLE`，并记录了全量 `bun test` 的阻塞结果。由于该批次没有以传统 `PASS / FAIL / PARTIAL` 三分法统计，故不并入上表计数。
| **合计** | **55** | **19** | **1** | **75** |

---

### B 类功能索引（代码存在，未被 verify 覆盖，需写 manifest 迁移）— 30 项

> 这些功能代码已存在于 `src/` 中，但不在上述 58 项验证结果里。需要写 `src/downstream/*/manifest.ts` 迁移。

#### B 类 Hooks（14 项）

| # | Hook 名称 | 生命周期 | 代码位置 | 来源 changes | 目标 changes |
|:-:|-----------|:--------:|----------|-------------|:------------:|
| B1 | skill-suggestion | PreToolUse | `src/hooks/skill-suggestion/` | activate-dormant-hooks | ② hooks迁移 |
| B2 | planning-flow-guide | PreToolUse | `src/hooks/planning-flow-guide/` | activate-dormant-hooks | ② hooks迁移 |
| B3 | failure-counter | PostToolUse | `src/hooks/failure-counter/` | activate-dormant-hooks | ② hooks迁移 |
| B4 | subagent-verification | PostToolUse | `src/hooks/subagent-verification/` | activate-dormant-hooks | ② hooks迁移 |
| B5 | codebase-assessment | PreToolUse | `src/hooks/codebase-assessment/` | activate-dormant-hooks | ② hooks迁移 |
| B6 | debugging-injector | PreToolUse | `src/hooks/debugging-injector/` | activate-dormant-hooks | ② hooks迁移 |
| B7 | lsp-diagnostics-enforcer | PostToolUse | `src/hooks/lsp-diagnostics-enforcer/` | activate-dormant-hooks | ② hooks迁移 |
| B8 | phase-flow-enforcer | PreToolUse | `src/hooks/phase-flow-enforcer/` | activate-dormant-hooks | ② hooks迁移 |
| B9 | instinct-trigger | PreToolUse | `src/hooks/instinct-trigger/` | implement-missing-features | ② hooks迁移 |
| B10 | instinct-learner | PostToolUse | `src/hooks/instinct-learner/` | skill-reminder / implement-missing | ② hooks迁移 |
| B11 | agent-skill-reminder | PreToolUse | `src/hooks/agent-skill-reminder/` | skill-reminder-system | ② hooks迁移 |
| B12 | observation-recorder | PostToolUse | `src/hooks/observation-recorder/` | implement-missing-features | ② hooks迁移 |
| B13 | observation-write-guard | PreToolUse | `src/hooks/observation-write-guard/` | implement-missing-features | ② hooks迁移 |
| B14 | observer-detector | PostToolUse | `src/hooks/observer-detector/` | implement-missing-features | ② hooks迁移 |

#### B 类 Skills（9 项）

| # | Skill 名称 | 代码位置 | 来源 changes | 目标 changes |
|:-:|-----------|----------|-------------|:------------:|
| B15 | continuous-learning | `src/features/builtin-skills/continuous-learning/` | implement-missing-features | ③ skills迁移 |
| B16 | security-audit | `src/features/builtin-skills/security-audit/` | implement-missing-features | ③ skills迁移 |
| B17 | database-optimization | `src/features/builtin-skills/database-optimization/` | implement-missing-features | ③ skills迁移 |
| B18 | backend-pattern-go | `src/features/builtin-skills/backend-pattern-go/` | implement-missing-features | ③ skills迁移 |
| B19 | backend-pattern-java | `src/features/builtin-skills/backend-pattern-java/` | implement-missing-features | ③ skills迁移 |
| B20 | backend-pattern-python | `src/features/builtin-skills/backend-pattern-python/` | implement-missing-features | ③ skills迁移 |
| B21 | wave-parallel-execution | `src/features/builtin-skills/wave-parallel-execution/` | implement-wave-parallel-worktree | ③ skills迁移 |
| B22 | mdsel | `src/features/builtin-skills/mdsel/` | integrate-mdsel / mdsel-fusion | ③ skills迁移 |
| B23 | progressive-disclosure-md | `src/features/builtin-skills/progressive-disclosure-md/` | todo-fix-and-progressive-disclosure | ③ skills迁移 |

#### B 类 Commands（6 项）

| # | 命令 | 代码位置 | 来源 changes | 目标 changes |
|:-:|------|----------|-------------|:------------:|
| B24 | /evolve | `src/features/builtin-commands/templates/evolve.ts` | implement-missing / skill-reminder | ③ skills迁移 |
| B25 | /learn | `src/features/builtin-commands/templates/learn.ts` | implement-missing-features | ③ skills迁移 |
| B26 | /instinct-status | `src/features/builtin-commands/templates/instinct-status.ts` | implement-missing-features | ③ skills迁移 |
| B27 | /instinct-import | `src/features/builtin-commands/templates/instinct-import.ts` | implement-missing-features | ③ skills迁移 |
| B28 | /instinct-export | `src/features/builtin-commands/templates/instinct-export.ts` | implement-missing-features | ③ skills迁移 |
| B29 | /build-fix | `src/features/builtin-commands/templates/build-fix.ts` | implement-missing-features | ③ skills迁移 |

#### B 类 Modules（1 项）

| # | 模块 | 代码位置 | 来源 changes | 目标 changes |
|:-:|------|----------|-------------|:------------:|
| B30 | skill-reminder-generator | `src/shared/skill-reminder-generator.ts` | skill-reminder-system | ③ skills迁移 |

> 注: Observer Agent (`src/agents/observer.ts`)、Hephaestus (`src/agents/hephaestus.ts`)、Atlas (`src/agents/builtin-agents/atlas-agent.ts`) 代码已存在，Agent existence 在 verify-fix-and-implement-remaining 中已 PASS，归入已验证 PASS 计数。

---

### C→B 重分类（审计后发现代码已存在）— 11 项

> 2026-03-15 审计发现以下原 C 类项实际已有完整代码，重新归入 B 类。

| 原编号 | 功能名称 | 实际代码位置 | 说明 |
|:------:|----------|-------------|------|
| C10 | background-compaction | `src/hooks/preemptive-compaction.ts` + manifest | 以 preemptive-compaction 名实现 |
| C13 | L1 lightweight-detection | `src/hooks/observer-detector/` + manifest | 以 observer-detector 名实现 |
| C14 | TypeScript 观察记录器 | `src/hooks/observation-recorder/` + manifest | 完整实现 |
| C15 | L2 周期分析 | `src/hooks/observer-detector/` 内含 L2 触发 | 集成在 observer-detector 中 |
| C16 | L3 会话摘要提取 | `src/downstream/hooks/pattern-extraction/manifest.ts` | 以 pattern-extraction 名实现 |
| C17 | MCP Health Checker | `src/mcp/health-checker.ts` + test | 完整实现含测试 |
| C22 | mdsel 预编译 bundle | `src/features/builtin-skills/mdsel/cli.mjs` | 已编译打包 |
| C23 | mdsel Windows 适配 | `mdsel-reminder.cjs` + `install.cjs` | CJS hook 脚本已适配 |
| C24 | plan worktree metadata | `src/features/boulder-state/types.ts` worktree_path | 类型已定义 |
| C25 | 自动创建 plan worktree | `src/features/boulder-state/worktree-manager.ts` | 完整实现 |

### C 类功能索引（真正未实现）— 14 项

#### C 类 Skills — context-engineering 系列（9 项，仅有 draft 设计文档）

> 来源: `.sisyphus/drafts/add-context-engineering-skills-*.md`，无 `src/` 代码。

| # | Skill 名称 | 描述 | 来源 | 决策 |
|:-:|-----------|------|------|:----:|
| C1 | planning-with-files | Manus 风格三文件规划 | add-context-engineering-skills | 待定 |
| C2 | context-degradation | 上下文退化诊断 | add-context-engineering-skills | 待定 |
| C3 | filesystem-context | 文件系统上下文 | add-context-engineering-skills | 待定 |
| C4 | memory-systems | 跨会话记忆系统 | add-context-engineering-skills | 待定 |
| C5 | context-compression | 上下文压缩 | add-context-engineering-skills | 待定 |
| C6 | context-optimization | 上下文优化 | add-context-engineering-skills | 待定 |
| C7 | evaluation | 评估技能 | add-context-engineering-skills | 待定 |
| C8 | advanced-evaluation | 高级评估 | add-context-engineering-skills | 待定 |
| C9 | tool-design | 工具设计技能 | add-context-engineering-skills | 待定 |

#### C 类 Hooks（2 项，无代码无设计）

| # | Hook 名称 | 描述 | 来源 | 决策 |
|:-:|-----------|------|------|:----:|
| C11 | plan-reminder | PreToolUse 自动重读 task_plan.md | add-context-engineering-skills | 待定 |
| C12 | findings-capture | 2-Action Rule 自动提醒更新 findings.md | add-context-engineering-skills | 待定 |

#### C 类 Modules（4 项，有设计文档待实现）

> 来源: `changes/50-enhancements/design.md` 含 43 个增强任务规划。

| # | 功能名称 | 描述 | 来源 | 决策 |
|:-:|----------|------|------|:----:|
| C18 | Rules 系统增强 | 角色感知 + 角色配置 | 50-enhancements | 待定 |
| C19 | Context 系统改进 | 意图模式、主动压缩 | 50-enhancements | 待定 |
| C20 | Agent 系统增强 | 决策框架、结构化交接 | 50-enhancements | 待定 |
| C21 | 并行系统改进 | 依赖感知、缓存友好 | 50-enhancements | 待定 |

---

### 全量统计（2026-03-15 审计后更新）

| 分类 | 数量 | 说明 |
|------|:----:|------|
| 历史已验证 PASS | 42 | 代码 + 注册均正常 |
| 历史已验证 FAIL | 15 | 已在 ①④ 中修复 |
| 历史已验证 PARTIAL | 1 | 已在 ④ 中修复 |
| B 类专项验证 | 41 | `verify-b-class-features` 已完成静态/行为验证；全量 `bun test` 因 deterministic failures 被记录并按用户指令跳过 |
| 真实 session 验证 | 11 | `verify-open-code-user-session`: 9 PASS / 2 BLOCKED, 5 个 bug 修复 |
| C 类（真正未实现） | 14 | 9 context-engineering + 2 hooks + 4 modules（原 25 - 11 重分类） |
| **总计** | **124** | |

---

## 路线总览 — 六步 changes 计划

```
① fix-boulder-and-continuation (✅ 全部验证通过)
  ↓
② migrate-downstream-hooks (✅ 13 manifests + 4 双重执行修复, 验证通过)
  ↓
③ migrate-downstream-skills-cmds (✅ 已完成 — 18 manifests 均已存在且上游已接入)
  ↓
④ fix-remaining-fail-partial (✅ F8/F9/F12/P1 全部验证通过)
  ↓
⑤ reform-upstream-registrations (✅ 代码审计通过, auto-registry dist 已验证正常)
  ↓
⑥ verify-and-cleanup (✅ .sisyphus 清理 + 回归修复 + 构建通过)
  ↓
⑦ verify-open-code-user-session (✅ 真实 session 端到端验证, 5 个 bug 修复)
  ↓
⑧ C 类功能评估 + 待办清单 (✅ 10 项跳过 / 4 项 module 待开发 / 8 个 hook bug 已建计划)
  ↓
⑨ sync-upstream-20260319 (⏳ 589 commits 待同步, 计划已建, 待执行真实 merge 后写冲突解决方案)
  ↓
⑩ fix-plan-update-reminder-and-boulder-injection (⏳ 8 个 bug, 待 ⑨ 完成后重评估)
```

---

## ① fix-boulder-and-continuation (✅ 已验证)

**changes 目录**: `changes/fix-boulder-and-continuation/`
**涉及 FAIL**: F1, F2, F3, F4, F5, F6, F7, F13, F15（9 项）
**前置完成**: Step 1 auto-registry 已完成
**代码状态**: 7 个 task 全部完成，69 个单元测试 + 5 个集成测试通过
**验证状态**: 全量通过真实 CLI 验证 ✅

### 验证清单

| # | 验证项 | 怎么验 | 预期结果 | 状态 |
|:-:|--------|--------|----------|:----:|
| V1 | todo-continuation-wrapper | 跑一个已完成的 boulder plan，观察 session.idle | log 输出 "plan complete, skipping" | ✅ |
| V2 | isMaxRetries 检查 | 手动触发多次 retry 达到上限 | log 输出 "max retries reached" | ✅ |
| V3 | mdsel-enforcer 拦截 | 用 Read 工具读一个 >200 词的 .md 文件 | 被拦截，提示用 mdsel | ✅ |
| V4 | TddStateTracker 输出 | 触发 tdd-guard 测试执行 | log 显示 state label (RED/GREEN) | ✅ |

### 修复清单

| FAIL# | 功能 | 修复方式 | Pattern | 安全等级 | 状态 |
|:-----:|------|----------|:-------:|:--------:|:----:|
| F1 | readPlanProgress 未调用 | 扩展 `boulder-gating-wrapper.ts`，在 continuation 流程中调用 `readPlanProgress()` | C | D | 🔬 |
| F2 | isMaxRetries 缺失 | 新建 `continuation-max-retries-wrapper.ts`，注入 retry 上限检查 | C | D | 🔬 |
| F3 | .sisyphus 残留 368 处 | 批量替换为 `changes/` 体系路径（需审慎，影响面大） | E | U | ⏳ |
| F4 | TDD State Tracker 死代码 | 决策: 删除或重新集成到 `tdd-guard` | — | S | 🔬 |
| F5 | mdsel-enforcer 未注册 | 写 `src/downstream/hooks/mdsel-enforcer/manifest.ts` | D | S | ✅ |
| F6 | mdsel-enforcer 不拦截 | 修复 F5 后自动解决 | — | S | ✅ |
| F7 | TODO 无 boulder gating | 修复 F1 后自动解决 | — | — | 🔬 |
| F13 | mdsel-enforcer 测试缺失 | 创建 `index.test.ts` | — | S | ✅ |
| F15 | boulder gating 测试 | 修复 F1 后自动解决 | — | — | 🔬 |

### 已有基础

| 文件 | 状态 | 作用 |
|------|:----:|------|
| `src/downstream/patches/boulder-gating-wrapper.ts` | 存在但不完整 | 仅覆盖 Atlas session.idle |
| `src/features/plan-progress-reader/reader.ts` | 已实现 | `readPlanProgress()` 只缺调用 |
| `src/features/boulder-state/` | 已实现 | `readBoulderState()` 可用 |
| `src/features/run-continuation-state/` | 已实现 | retry tracker 可用 |
| `src/downstream/auto-registry.ts` | 已完成 | 扫描引擎就绪 |

### 注意: F3 (.sisyphus 清理) 风险最高

- 368 处 / 79 文件，安全等级 U（Unrecoverable）
- 涉及 atlas agent、boulder-state、continuation-state 等核心模块
- 建议分子任务: 先列出所有引用 → 分类哪些可以改/哪些必须保留 → 分批替换
- 可考虑推迟到 ⑥ verify-and-cleanup

---

## ② migrate-downstream-hooks (✅ 已完成)

**changes 目录**: `changes/migrate-downstream-hooks/`
**验证目录**: `changes/verify-migrate-downstream-hooks/`
**代码状态**: 13 个 manifest 创建完成，4 个双重执行 bug 修复
**验证状态**: tsc 通过, 42 个 manifest 发现, skipManifestNames 16 项 ✅
**合并 commit**: `f32c9c31 feat(registry): add 13 hook manifests and fix 4 double-run hooks`

### 需要写 manifest 的 28 个 Hook

| Hook 名称 | 来源 changes | 代码位置 |
|-----------|-------------|----------|
| skill-suggestion | activate-dormant-hooks | `src/hooks/skill-suggestion/` |
| planning-flow-guide | activate-dormant-hooks | `src/hooks/planning-flow-guide/` |
| tdd-guard | activate-dormant-hooks | `src/hooks/tdd-guard/` |
| failure-counter | activate-dormant-hooks | `src/hooks/failure-counter/` |
| subagent-verification | activate-dormant-hooks | `src/hooks/subagent-verification/` |
| background-compaction | activate-dormant-hooks | `src/hooks/background-compaction/` |
| codebase-assessment | activate-dormant-hooks | `src/hooks/codebase-assessment/` |
| debugging-injector | activate-dormant-hooks | `src/hooks/debugging-injector/` |
| lsp-diagnostics-enforcer | activate-dormant-hooks | `src/hooks/lsp-diagnostics-enforcer/` |
| phase-flow-enforcer | activate-dormant-hooks | `src/hooks/phase-flow-enforcer/` |
| agent-skill-reminder | skill-reminder-system | `src/hooks/agent-skill-reminder/` |
| instinct-learner | skill-reminder / implement-missing | `src/hooks/instinct-learner/` |
| instinct-trigger | implement-missing-features | `src/hooks/instinct-trigger/` |
| L1 lightweight-detection | implement-missing-features | `src/hooks/lightweight-detection/` |
| plan-update-reminder | multi-manus-planning | `src/hooks/plan-update-reminder/` |
| plan-attention-refresher | multi-manus-planning | `src/hooks/plan-attention-refresher/` |
| plan-reorganizer | multi-manus-planning | `src/hooks/plan-reorganizer/` |
| tasks-md-creation-guard | wave-system-enhancements | `src/hooks/tasks-md-creation-guard/` |
| mdsel-reminder | integrate-mdsel-builtin-skill | `src/hooks/mdsel-reminder/` |
| plan-reminder | context-engineering | `src/hooks/plan-reminder/` |
| findings-capture | context-engineering | `src/hooks/findings-capture/` |
| anthropic-context-window-limit-recovery | upstream-sync | `src/hooks/anthropic-context-window-limit-recovery/` |
| auto-slash-command | upstream-sync | `src/hooks/auto-slash-command/` |
| ralph-loop | upstream-sync | `src/hooks/ralph-loop/` |
| unstable-agent-babysitter | upstream-sync | `src/hooks/unstable-agent-babysitter/` |
| anthropic-effort | upstream-sync | `src/hooks/anthropic-effort/` |
| background-notification | test-hooks-real-env | `src/hooks/background-notification/` |
| directory-agents-injector | test-hooks-real-env | `src/hooks/directory-agents-injector/` |

> 已验证 PASS 的 hook（behavior-anchor, skill-auto-injector, secret-scanner 等）也需要迁移 manifest，只是不需要修复。

### 操作

每个 hook: 在 `src/downstream/hooks/<name>/manifest.ts` 中导出 `HookManifest`，引用 `src/hooks/<name>/` 中的 factory。

---

## ③ migrate-downstream-skills-cmds (✅ 已完成)

**changes 目录**: N/A（在 Step 1 auto-registry 期间已完成）
**代码状态**: 18 个 manifest 均已存在且上游已接入
**验证状态**: tsc 通过, discover 函数已接入 ✅

### 已有 manifest 确认

| 类型 | 数量 | 上游接入点 |
|------|:----:|-----------|
| Skills | 9 | `src/plugin/skill-context.ts` → `discoverDownstreamSkills()` |
| Commands | 6 | `src/plugin-handlers/command-config-handler.ts` → `discoverDownstreamCommands()` |
| Agents | 3 | `src/agents/builtin-agents.ts` → `discoverDownstreamAgents()` |

### 9 个 Skill

| Skill 名称 | 来源 |
|-----------|------|
| continuous-learning | implement-missing-features |
| security-audit | implement-missing-features |
| database-optimization | implement-missing-features |
| backend-pattern-go/java/python | implement-missing-features |
| wave-parallel-execution | implement-wave-parallel-worktree |
| mdsel | integrate-mdsel / mdsel-fusion |
| progressive-disclosure-md | todo-fix-and-progressive-disclosure |

### 6 个 Command

| 命令 | 来源 |
|------|------|
| `/evolve` | implement-missing / skill-reminder |
| `/learn` | implement-missing-features |
| `/instinct-status` | implement-missing-features |
| `/instinct-import` | implement-missing-features |
| `/instinct-export` | implement-missing-features |
| `/build-fix` | implement-missing-features |

### 3 个 Agent

| Agent 名称 | 来源 |
|-----------|------|
| Observer | implement-missing-features |
| Hephaestus | agent-consolidation |
| Atlas | agent-consolidation |

---

## ④ fix-remaining-fail-partial (✅ 已完成 + 已验证)

**changes 目录**: `changes/fix-remaining-fail-partial/`
**验证目录**: `changes/verify-fix-remaining-fail-partial/`
**涉及 FAIL**: F8, F9, F11, F12 + PARTIAL P1
**代码状态**: 5 项修复全部完成
**验证状态**: 全部 PASS ✅
**合并 commits**: `28e87c99`, `8d15eb8e`

| FAIL# | 功能 | 修复方式 |
|:-----:|------|----------|
| F8 | MCP Health Checker startup | 在启动流程中调用 `checkAllOnStartup()` — Pattern C wrapper |
| F9 | Commit Size Checker UI | 增强 CLI 反馈机制，确保警告可见 — Pattern C wrapper |
| F11 | relevance-scorer 误报（已解决/PASS） | 实际已被 `context-injector/collector.ts` 使用；此前“未使用”报告为误判，无需代码修复 |
| F12 | Bash 拦截正则 | 补全重定向场景的正则匹配 |
| P1 | start-work 执行模式切换 | 在 `start-work-wave-mode.ts` 中补全 sequential/parallel 选择逻辑 |

---

## ⑤ reform-upstream-registrations (✅ 验证完成)

**changes 目录**: `changes/reform-upstream-registrations/`

### 当前问题

`src/index.ts` 中仍有 ~30 个 hook 通过手动实例化注册，与 auto-registry manifest 并存。
其中 17 个 hook 同时被手动接线 AND manifest 发现，导致**双重执行**。

### 上游接入点状态（7 个全部已接入）

| 上游文件 | 接入方式 | 状态 |
|---------|-----------|:----:|
| `src/index.ts` | `bootstrapDownstreamHooks()` | ✅ |
| `src/plugin/skill-context.ts` | `discoverDownstreamSkills()` | ✅ |
| `src/plugin-handlers/command-config-handler.ts` | `discoverDownstreamCommands()` | ✅ |
| `src/agents/builtin-agents.ts` | `discoverDownstreamAgents()` | ✅ |
| `src/create-tools.ts` | `discoverDownstreamTools()` | ✅ |
| `src/plugin-handlers/mcp-config-handler.ts` | `discoverDownstreamMcps()` | ✅ |
| `src/downstream/runtime-hook-executor.ts` | `extendHookNameSchema()` | ✅ |

### 需要清理的手动接线（index.ts）

目标: 删除 ~30 个手动 hook 实例化 + 删除 skipManifestNames + 让所有 hook 通过 auto-registry 加载。

特殊处理:
- `session-scorer` / `final-audit`: 有非标生命周期（session.stop），需确认 manifest 支持
- `commitSizeChecker`: 使用 wrapper pattern，需确认 manifest 兼容

### 完成标志

- [ ] 7 个文件各只有 1 行下游调用
- [ ] 旧注册行全部删除
- [ ] `bun test` 无新增 regression（基线: 593 fail / 127 errors）
- [ ] `bun run typecheck` 通过

---

## ⑥ verify-and-cleanup

**changes 目录**: `changes/verify-and-cleanup/`

### 任务清单

1. **全量验证**: `bun test` 无新增 regression
2. **类型验证**: `bun run typecheck` 通过
3. **注册验证**: 检查脚本确认 manifest 数量（28 hooks / 9 skills / 6 commands / 3 agents）
4. **.sisyphus 清理**: 368 处引用分批替换（F3 如果 ① 中未处理则在此完成）
5. **回归问题修复**: F14 中的 Model Resolution / TDD 执行 / Windows 路径问题
6. **更新 upstream-safe-design skill**: Pattern D 标记为"已实现"
7. **更新 omo-specialization.md**: 补充实战经验

---

## ⑦ verify-open-code-user-session (✅ 2026-03-19 完成)

**changes 目录**: `changes/verify-open-code-user-session/`
**目标**: 在真实 OpenCode session 中端到端验证 B 类 hook（failure-counter、debugging-injector、codebase-assessment）
**验证状态**: 9/11 PASS, 2 BLOCKED
**代码修复**: 5 个 bug

### 验证结果

| 任务 | 功能 | 状态 |
|------|------|:----:|
| V-1.1 | codebase-assessment 首次 Read 触发 | ✅ PASS |
| V-1.2 | 第二次 Read 不重复注入 | ✅ PASS |
| V-2.1 | failure-counter 第 1 次 task 失败 → AUTO-INJECTED | ✅ PASS |
| V-2.2 | 第 2 次失败 → ORACLE DISPATCH | ✅ PASS |
| V-2.3 | 第 3 次失败 → BLOCKED + 第 4 次被阻止 | ✅ PASS |
| V-2.4 | /reset-failures 重置 | BLOCKED |
| V-2.5 | reset 后回到 first-failure | BLOCKED |
| V-3.1 | debugging-injector lastEditedFile 设置 | ✅ PASS |
| V-3.2 | 第 1 次 Bash 失败不注入 | ✅ PASS |
| V-3.3 | 第 2 次 Bash 失败触发注入 | ✅ PASS |

> V-2.4/V-2.5 BLOCKED 原因: `opencode run` 桥接模式不支持发送斜杠命令（`/reset-failures`），subagent 内部也不允许嵌套调用 `task` 工具。

### 发现并修复的 5 个 Bug

| # | 组件 | Bug | 修复 |
|:-:|------|-----|------|
| 1 | debugging-injector | `FIX_ATTEMPT_TOOLS` 缺少 `apply_patch` | 添加 `apply_patch` + patchText 路径提取 |
| 2 | failure-counter | `output.content` 字段不存在 | 改为 `output.output` |
| 3 | failure-counter | `SUCCESS_PATTERNS` 中 `/task completed/i` 太宽泛 | 改为 `/task completed successfully/i` |
| 4 | codebase-assessment | `substantiveTools` 大小写不匹配 | `"Read"` → `"read"` |
| 5 | background-agent | agent payload 格式错误 | `{ name: xxx }` → 纯字符串 |

### 证据文件

| 文件 | 内容 |
|------|------|
| `evidence/V-1.1-log.txt` | codebase-assessment 日志条目 |
| `evidence/V-2.1-V2.3-combined.txt` | failure-counter 三级升级完整日志 |
| `evidence/V-3.3-debug-stderr.txt` | debugging-injector 9 行调试日志 |
| `findings.md` | 完整验证发现记录 |
| `progress.md` | 执行进度日志 |

---

## ⑧ C 类功能评估 + 待办清单（2026-03-19）

### C 类 Skills 评估结果（10 项全部跳过）

| C 编号 | 名称 | 来源 | 结论 | 原因 |
|:------:|------|------|:----:|------|
| C1 | planning-with-files | `E:\github\planning-with-files` | ❌ 跳过 | creating-changes + plan-update-reminder 已覆盖规划阶段 |
| C2 | context-degradation | `Agent-Skills-for-Context-Engineering` | ❌ 跳过 | 纯知识文档，无可执行组件 |
| C3 | filesystem-context | 同上 | ❌ 跳过 | 理念已内化到现有 plan 系统 |
| C4 | memory-systems | 同上 | ❌ 跳过 | 纯知识文档，框架选型参考 |
| C5 | context-compression | 同上 | ❌ 跳过 | 纯知识文档 |
| C6 | context-optimization | 同上 | ❌ 跳过 | 纯知识文档 |
| C7 | evaluation | 同上 | ❌ 跳过 | 纯知识文档，面向 agent 系统开发者 |
| C8 | advanced-evaluation | 同上 | ❌ 跳过 | 同上 |
| C9 | tool-design | 同上 | ❌ 跳过 | 可作内部参考，不需集成 |
| C11 | plan-reminder hook | 设计文档 | ❌ 跳过 | `plan-update-reminder` hook 已实现（但有缺陷，见下方修复清单） |
| C12 | findings-capture hook | 设计文档 | ❌ 跳过 | `plan-update-reminder` 的 2-Action Rule 已包含（但有缺陷） |

> 源项目 `Agent-Skills-for-Context-Engineering` 已备份到 `vendor/agent-skills/`。
> GitHub 原仓库 13 个 skill 全部是纯知识文档（无 hook/script/自动触发），对终端用户无直接执行价值。

### Hook 修复清单（4 项）

现有 `plan-update-reminder` hook 功能不完整，与 todo 系统相比存在明显差距：

| # | 问题 | 现状 | 目标 |
|:-:|------|------|------|
| H1 | 不监听 apply_patch | 只监听 edit/write，OpenCode 内部用 apply_patch | 加入 apply_patch + patchText 路径提取 |
| H2 | boulder 只有 toast，不能注入聊天 | `output.output +=` 追加到工具输出，agent 可能忽略 | 改用 `output.messages.push()` 直接注入对话上下文 |
| H3 | boulder 没有像 todo 一样的"内容直出" | todo 能在聊天框里直接展示内容让 AI 主动处理，boulder 不行 | boulder 触发时自动读取 tasks.md 当前状态注入上下文 |
| H4 | findings 只在任务结束时写入 | 执行过程中的发现、中间决策、遇到的问题都丢失 | 2-Action Rule 触发时读取 findings.md 注入，让 agent 看到"该补充什么" |

### Module 增强清单（4 项，来自 `changes/50-enhancements/design.md`）

| # | 名称 | 描述 | 复杂度 |
|:-:|------|------|:------:|
| C18 | Rules 系统增强 | 角色感知 + 角色配置 | 复杂 |
| C19 | Context 系统改进 | 意图模式、主动压缩 | 中偏复杂 |
| C20 | Agent 系统增强 | 决策框架、结构化交接 | 中等 |
| C21 | 并行系统改进 | 依赖感知、缓存友好 | 复杂 |

### 建议开发顺序

1. **⑨ 同步上游**（最优先）— 上游 task_sessions 等改动直接解决部分 bug
2. **⑩ hook 修复**（同步后重评估）— 上游未解决的 bug 再修
3. **C18~C21**（module 增强）— 按 C20 → C19 → C18 → C21 顺序

---

## ⑨ sync-upstream-20260319 (⏳ 待执行)

**changes 目录**: `changes/sync-upstream-20260319/`
**目标**: 同步上游 589 个 commits（2619 文件，+58857/-358110 行）
**状态**: 计划已建，待执行真实 merge 后根据实际冲突写解决方案

### 上游关键新功能

| 功能 | Commits | 影响 |
|------|---------|------|
| atlas task_sessions | 5c619437 等 4 个 | 每个 task 独立 session，可跨 continuation 复用 |
| todo-description-override | 55ac653e | 改写 TodoWrite 描述，强制 atomic format |
| todo-continuation 改进 | df7e1ae1 等 | stagnation 检测、dispose 生命周期 |
| atlas 容错 | 521a1f76 | 10 次连续失败才停止 |
| plugin dispose | deaac8cb | 完整 teardown 生命周期 |
| 性能优化 | 5 个 commits | regex 预编译、热路径优化 |

### 7 个热点文件

| 文件 | 变更行数 | 风险 |
|------|---------|:----:|
| skills.ts | -2116 行 | 极高 |
| commands.ts | -439 行 | 高 |
| builtin-agents.ts | 383 行 | 高 |
| index.ts | 330 行 | 极高 |
| hooks.ts schema | 152 行 | 中 |
| mcp/index.ts | 126 行 | 中 |
| tools/index.ts | 30 行 | 低 |

### 执行流程

1. 提交当前进度到 fork
2. 同步 omo-update 目录
3. 创建合并分支，执行 `git merge upstream/dev --no-commit`
4. 根据真实冲突写解决方案
5. 逐个解决冲突，补回下游注册行
6. 构建验证 + 下游功能完整性检查
7. 提交合并

### 同步后需重评估的 Bug

| Bug | 可能被上游解决 | 原因 |
|-----|:---:|------|
| B3: boulder-continuation 只传数字 | ⚠️ | task_sessions 改变了续跑方式 |
| B1: apply_patch 不监听 | ❌ | 上游也没加 |
| B2: output.messages.push 不工作 | ❌ | OpenCode 运行时限制 |
| B7: plan-attention-refresher 失焦 | ❌ | 下游独立 hook |

---

## ⑩ fix-plan-update-reminder-and-boulder-injection (⏳ 待 ⑨ 完成后重评估)

**changes 目录**: `changes/fix-plan-update-reminder-and-boulder-injection/`
**目标**: 修复 plan 注入系统的 8 个 bug，使 boulder 达到与 todo 同等的聊天注入能力
**状态**: 计划已建（8 bug / 7 phase / 14 task），待 ⑨ 同步后重评估

### 已发现的 8 个 Bug

| # | Bug | 位置 | 严重度 |
|:-:|-----|------|:------:|
| B1 | plan-update-reminder 不监听 apply_patch | plan-update-reminder | 高 |
| B2 | output.messages.push() 在 OpenCode 不工作 | debugging-injector + plan-update-reminder | 高 |
| B3 | boulder-continuation 只传数字不传任务内容 | atlas/boulder-continuation-injector | 中 |
| B4 | debugging-injector 注入不可见 | debugging-injector | 高 |
| B5 | /reset-failures 在 opencode run 无法执行 | failure-counter slash command | 中 |
| B7 | plan-attention-refresher 注入前 30 行含已完成任务（失焦） | plan-attention-refresher | 中 |
| B8 | plan-attention-refresher 不监听 apply_patch | plan-attention-refresher | 高 |

### 三层注入架构（现状）

```
Layer 1: plan-attention-refresher (PreToolUse, 60s 冷却)
  → 每次工具调用前注入 tasks.md 内容
  → 问题: 注入前 30 行原文，含已完成任务

Layer 2: plan-update-reminder (PostToolUse, 2-Action Rule)
  → 每次代码修改后提醒更新 findings/tasks/progress
  → 问题: 不监听 apply_patch

Layer 3: boulder-continuation-injector (session.idle, promptAsync)
  → AI 停下来时强制续跑
  → 问题: 只传 "3/12 completed"，不传具体任务
```

### 设计决策

- `experimental.task_system` 保持关闭（内存 task 与 boulder/tasks.md 不集成）
- `new_task_system_enabled` 保持关闭（JSON 小文件模式暂不启用）
- `readIncompleteTasks()` 预留双数据源接口（未来可适配 JSON 模式）
- plan-attention-refresher 改为只注入未完成任务（不再读前 30 行原文）

---

## 前置已完成项

### Step 1: auto-registry 基础设施 ✅

**变更归档**: `changes/archive/2026-03-12-implement-auto-discovery-registry/`
**合并 commits**: `129ef295`, `de5035bc`, `18f09ade`, merge `7d6d6cf3`

| 文件 | 作用 | 状态 |
|------|------|:----:|
| `src/downstream/types.ts` | 6 种 manifest interface | ✅ |
| `src/downstream/auto-registry.ts` | 异步扫描引擎: readdir + dynamic import | ✅ |
| `src/downstream/schema-extensions.ts` | `extendHookNameSchema()` → z.union + z.literal | ✅ |
| 7 个子目录 | hooks/ skills/ commands/ agents/ tools/ mcp/ patches/ | ✅ |

### Step 2: 扫描现有功能 ✅

113 项全部分类完成，verify-* findings 已记录（见上方验证结果索引）。

---

## 关键参考文件

| 文件 | 内容 |
|------|------|
| `docs/未验证新功能.md` | 113 项功能完整清单 + 来源 + 分类 |
| `changes/archive/2026-03-12-implement-auto-discovery-registry/` | auto-registry 实现归档（design.md + tasks.md 30 tasks） |
| `upstream-safe-design` skill | Pattern A/B/C/D/E 方法论 |
| `references/omo-specialization.md` | OMO 项目特化配置 |
| `/e/github/oh-my-opencode-update/` | 融合前完整代码（恢复源） |
| `changes/verify-fix-and-implement-remaining/findings.md` | 18 项验证（16 PASS / 2 FAIL） |
| `changes/verify-todo-fix-and-progressive-disclosure/findings.md` | 16 项验证（7 PASS / 9 FAIL） |
| `changes/verify-integrate-missing-features/findings.md` | 11 项验证（7 PASS / 4 FAIL） |
| `changes/verify-fix-continuation-start-work/findings.md` | 5 项验证（3 PASS / 1 FAIL / 1 PARTIAL） |
| `changes/verify-misc-session-scorer-notepad/findings.md` | 5 项验证（5 PASS） |
| `changes/verify-c5-guideline-anchoring/findings.md` | 4 项验证（4 PASS） |
| `changes/verify-auth/findings.md` | 4 项验证（3 PASS / 1 FAIL） |
| `changes/verify-test-hooks-real-environment3/findings.md` | 1 项验证（1 PASS） |
| `changes/verify-b-class-features/findings.md` | 41 项专项验证（静态/行为验证完成；全量 `bun test` 阻塞结果已记录，并于 2026-03-16 经用户授权跳过） |
| `changes/verify-open-code-user-session/findings.md` | 11 项真实 session 验证（9 PASS / 2 BLOCKED），5 个 bug 修复记录 |
