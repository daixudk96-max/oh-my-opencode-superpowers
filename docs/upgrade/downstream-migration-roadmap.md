# 下游功能融合路线图

> 从 auto-registry 基础设施建好到全部功能融合完成的完整步骤。
> 创建时间: 2026-03-11
> 最后更新: 2026-03-15 (①~⑥ 全部完成, next: Step 7/8)

---

## 当前状态总览

| 指标 | 数值 |
|------|------|
| 下游功能总数 | 113 项（`docs/未验证新功能.md`） |
| 已验证（PASS/FAIL/PARTIAL） | 66 项（50 / 15 / 1） |
| B 类（代码在，未验证，需迁移） | 22 项 |
| C 类（从未实现） | 25 项 |
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
| **合计** | **42** | **15** | **1** | **58** |

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
| 已验证 PASS | 42 | 代码 + 注册均正常 |
| 已验证 FAIL | 15 | 已在 ①④ 中修复 |
| 已验证 PARTIAL | 1 | 已在 ④ 中修复 |
| B 类（代码在，未验证） | 41 | 原 30 + C→B 重分类 11 项 |
| C 类（真正未实现） | 14 | 9 context-engineering + 2 hooks + 4 modules（原 25 - 11 重分类） |
| **总计** | **113** | |

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
⑤ reform-upstream-registrations (✅ 代码审计通过, auto-registry dist 环境待修复)
  ↓
⑥ verify-and-cleanup (✅ .sisyphus 清理 + 回归修复 + 构建通过)
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
