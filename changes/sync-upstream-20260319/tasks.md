# Tasks: Sync Upstream 20260319

> 43 个冲突文件，71 个冲突块，5 种模式
> 工作目录：`E:\github\oh-my-opencode-update`
> 策略：按模式分批解决，模式 A（批量）→ C（快速）→ E（快速）→ D（测试）→ B（核心，最后最难）

---

## Phase 0: 快照下游状态

### Task 0.1: 生成下游快照
- **Files**: 新建 `changes/sync-upstream-20260319/downstream-snapshot.md`
- **Action**:
  1. 在 `oh-my-opencode-update` 中（merge 进行中状态），用 `git show HEAD:path` 提取 HEAD 侧的关键文件内容
  2. 记录 `src/index.ts` 中所有 `isHookEnabledLoose` 行
  3. 记录 `src/hooks/index.ts` 中所有下游 hook 导出
  4. 记录 `src/features/builtin-skills/skills.ts` 中所有下游 skill 条目
  5. 记录 `src/features/builtin-commands/commands.ts` 中所有下游命令
  6. 列出所有下游独立目录
- **Acceptance**: 快照文件包含所有下游注册点的完整清单
- **Risk**: 低

---

## Phase 1: 模式 A — 上游模块化重构（16 个文件）

> 策略：全部接受 upstream 的 re-export 结构。上游已有实现文件（`./hook.ts` 等），
> HEAD 的内联实现与上游实现文件内容基本一致（只是位置不同）。
> 检查是否有下游专属修改需要补到上游实现文件中。

### Task 1.1: 解决 9 个 hook index.ts 冲突
- **Files**:
  - `src/hooks/atlas/index.ts`
  - `src/hooks/ralph-loop/index.ts`
  - `src/hooks/start-work/index.ts`
  - `src/hooks/rules-injector/index.ts`
  - `src/hooks/prometheus-md-only/index.ts`
  - `src/hooks/keyword-detector/index.ts`
  - `src/hooks/interactive-bash-session/index.ts`
  - `src/hooks/anthropic-context-window-limit-recovery/index.ts`
  - `src/hooks/compaction-context-injector/index.ts`
- **Action**:
  1. 对每个文件：检查上游是否有对应的 `./hook.ts` 或 `./xxx-hook.ts`
  2. 接受 upstream 版本（re-export）
  3. 对比 HEAD 实现 vs 上游实现文件，标记下游专属修改
  4. 如有下游专属修改，补到上游实现文件中
- **Acceptance**: 所有 9 个文件无冲突标记，上游 re-export 结构保留
- **Risk**: 低（模式统一，批量处理）

### Task 1.2: 解决 3 个 tools 冲突
- **Files**:
  - `src/tools/background-task/tools.ts`
  - `src/tools/delegate-task/executor.ts`
  - `src/tools/lsp/constants.ts`
- **Action**: 同上，接受 upstream 模块化结构
- **Acceptance**: 3 个文件无冲突
- **Risk**: 低

### Task 1.3: 解决 3 个 features/cli 冲突
- **Files**:
  - `src/features/opencode-skill-loader/loader.ts`
  - `src/features/opencode-skill-loader/skill-content.ts`
  - `src/cli/index.ts`
- **Action**: 接受 upstream 模块化结构
- **Acceptance**: 3 个文件无冲突
- **Risk**: 低

### Task 1.4: 解决 cli/install.ts 冲突
- **Files**: `src/cli/install.ts`
- **Action**: 接受 upstream 的 `runTuiInstaller`/`runCliInstaller` 结构
- **Acceptance**: 无冲突
- **Risk**: 低

---

## Phase 2: 模式 C — 小幅分歧（11 个文件）

### Task 2.1: 解决 shared 目录冲突（7 个文件）
- **Files**:
  - `src/shared/index.ts` — 合并两侧导出（HEAD 的 context-detector + upstream 新增）
  - `src/shared/model-availability.ts` — 接受 upstream import + 保留下游 config 路径
  - `src/shared/model-requirements.ts` — 接受 upstream model fallback，检查下游是否需要保留
  - `src/shared/model-resolution-pipeline.ts` — 合并过滤逻辑
  - `src/shared/session-utils.ts` — 接受 upstream `getAgentConfigKey`
  - `src/shared/tmux/tmux-utils.ts` — 保留 HEAD 的 `isInsideTmux` + 接受 upstream pane helpers
  - `src/hooks/prometheus-md-only/constants.ts` — 保留注释，接受 upstream 常量
- **Acceptance**: 7 个文件无冲突
- **Risk**: 低

### Task 2.2: 解决其他小幅冲突（4 个文件）
- **Files**:
  - `src/features/opencode-skill-loader/async-loader.ts` — 合并 import
  - `src/features/background-agent/manager.ts` — 合并 notification 逻辑
  - `src/tools/delegate-task/constants.ts` — 合并 agent 模型映射 + 接受 planFamily
  - `.gitignore` — 合并 ignore 规则（保留 `.sisyphus/`，接受 `!.sisyphus/rules/`）
- **Acceptance**: 4 个文件无冲突
- **Risk**: 低

---

## Phase 3: 模式 E — CLI/Doctor（2 个文件）

### Task 3.1: 解决 doctor 冲突
- **Files**:
  - `src/cli/doctor/index.ts` — 接受 upstream `runDoctor`
  - `src/cli/doctor/types.ts` — 接受 upstream `SystemInfo`/`ToolsSummary`
- **Acceptance**: 2 个文件无冲突
- **Risk**: 低

---

## Phase 4: 模式 D — 测试文件（6 个文件）

### Task 4.1: 解决 hook 测试冲突
- **Files**:
  - `src/hooks/ralph-loop/index.test.ts`（5 块）— 接受 upstream 完成检测语义
  - `src/hooks/compaction-context-injector/index.test.ts`（1 块）— 接受 upstream mock
- **Acceptance**: 测试文件无冲突
- **Risk**: 中（需要理解语义变化）

### Task 4.2: 解决 tools/features 测试冲突
- **Files**:
  - `src/tools/delegate-task/tools.test.ts`（11 块）— 接受 upstream 重写
  - `src/shared/model-availability.test.ts`（2 块）— 接受 upstream env 简化
  - `src/features/builtin-skills/skills.test.ts`（1 块）— 接受 upstream playwright 测试
  - `src/features/builtin-commands/commands.test.ts`（1 块）— 保留两侧测试
- **Acceptance**: 测试文件无冲突
- **Risk**: 中

---

## Phase 5: 模式 B — 核心注册文件（8 个文件，最高风险）

> 这些文件需要最仔细的处理：接受 upstream 结构 + 补回下游功能注册

### Task 5.1: 解决 src/config/schema.ts
- **Files**: `src/config/schema.ts`（1 块）
- **Action**:
  1. 接受 upstream 的模块化 schema（从 `./schema/*` re-export）
  2. 确认下游 hook 不需要 schema enum 条目（走 isHookEnabledLoose）
- **Acceptance**: schema.ts 无冲突，上游模块化结构保留
- **Risk**: 中

### Task 5.2: 解决 src/hooks/index.ts
- **Files**: `src/hooks/index.ts`（2 块）
- **Action**:
  1. 接受 upstream 导出集（包含新 hook：hashline-enhancer、json-error-recovery）
  2. 追加所有下游 hook 导出（TDD guard、debugging injector、failure counter、planning flow 等）
  3. 确保新/旧 hook 都能被 `src/index.ts` 导入
- **Acceptance**: 所有上游 + 下游 hook 都有导出
- **Risk**: 中

### Task 5.3: 解决 src/features/builtin-commands/types.ts + commands.ts
- **Files**:
  - `src/features/builtin-commands/types.ts`（1 块）
  - `src/features/builtin-commands/commands.ts`（4 块）
- **Action**:
  1. types.ts：接受 upstream 命令联合类型 + 追加下游命令名
  2. commands.ts：接受 upstream 结构（含 handoff 等新命令），追加下游命令（status、revert、instincts、build-fix、learn 等）
  3. 合并 argument hints
- **Acceptance**: 上游 + 下游命令完整保留
- **Risk**: 高

### Task 5.4: 解决 src/features/builtin-skills/skills.ts
- **Files**: `src/features/builtin-skills/skills.ts`（1 块）
- **Action**:
  1. 接受 upstream 的模块化导入结构（从 `./skills/` 导入）
  2. 追加下游 skill 条目到正确位置
  3. 保留下游缓存逻辑（如果 upstream 没有等效功能）
- **Acceptance**: 所有上游 + 下游 skill 保留
- **Risk**: 极高

### Task 5.5: 解决 src/agents/sisyphus.ts
- **Files**: `src/agents/sisyphus.ts`（2 块）
- **Action**:
  1. 合并两侧 prompt：保留下游 "先检查 skills" + 接受上游 "意图表述" + "并行化"
  2. 确保两套规则不冲突
- **Acceptance**: prompt 包含两侧关键指令
- **Risk**: 中

### Task 5.6: 解决 src/plugin-handlers/config-handler.ts
- **Files**: `src/plugin-handlers/config-handler.ts`（1 块）
- **Action**:
  1. 保留 HEAD 的详细 config 组装逻辑（skill/agent 发现、权限调整）
  2. 接受 upstream 的简化日志风格
- **Acceptance**: config 组装逻辑完整
- **Risk**: 中

### Task 5.7: 解决 src/index.ts（最复杂）
- **Files**: `src/index.ts`（6 块）
- **Action**:
  1. 理解上游工厂模式（`createHooks`、`createManagers`、`createTools`、`createPluginInterface`）
  2. 接受 upstream 版本为基础
  3. 在工厂模式框架内补回：
     - 下游 hook 的 import
     - `isHookEnabledLoose(...)` 创建语句
     - 各生命周期事件中的下游 hook 调用（chat.message / tool.execute.before / tool.execute.after）
  4. 保留上游新增功能（dispose、compaction context、experimental hook exposure）
  5. 确保 `isHookEnabledLoose` 数量 ≥ 快照值
- **Acceptance**:
  - 所有下游 hook 注册行补回
  - 上游新功能保留
  - TypeScript 编译通过
- **Risk**: 极高
- **Dependencies**: Task 5.1 ~ 5.6（先解决其他核心文件，最后处理 index.ts）

---

## Phase 6: 验证 + 提交

### Task 6.1: 构建验证
- **Action**:
  1. `bun run build`
  2. 修复编译错误
  3. 检查 `isHookEnabledLoose` 数量 ≥ 快照值
  4. 检查下游独立目录完整
- **Acceptance**: build 通过
- **Risk**: 高

### Task 6.2: 运行测试
- **Action**:
  1. `bun run test`（或 vitest）
  2. 修复失败测试
- **Acceptance**: 测试通过
- **Risk**: 中

### Task 6.3: 生成验证报告 + 提交
- **Action**:
  1. 对比快照 vs 合并后指标
  2. 提交 merge commit
  3. 更新路线图
- **Acceptance**: merge 已提交，验证报告完整
- **Risk**: 低

---

## Phase 7: 同步后重新评估 Bug

### Task 7.1: 重新评估 fix-plan-update-reminder-and-boulder-injection 的 8 个 bug
- **Action**:
  1. 检查上游 task_sessions 是否解决了 B3（boulder-continuation 只传数字）
  2. 检查上游 todo-description-override 是否影响 plan-attention-refresher
  3. 更新 bug 清单
- **Acceptance**: 每个 bug 有明确状态
- **Risk**: 低
- **Dependencies**: Task 6.3

---

## 执行顺序总结

```
Phase 0 (快照)
  → Phase 1 (模式A: 16文件, 批量处理)
  → Phase 2 (模式C: 11文件, 快速合并)
  → Phase 3 (模式E: 2文件, 快速)
  → Phase 4 (模式D: 6文件, 测试)
  → Phase 5 (模式B: 8文件, 核心, 最后最难)
  → Phase 6 (验证+提交)
  → Phase 7 (bug 重评估)
```

先易后难，确保每个 Phase 后都可以做增量 `git add`。
