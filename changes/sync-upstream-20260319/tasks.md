# Tasks: Sync Upstream 20260319

> 589 commits, 2619 files, 7 hotspot files
> 策略：快照 → merge → 补回 → 验证 → 修复

---

## Phase 1: 快照下游状态

### Task 1.1: 生成下游快照文件
- **Files**: 新建 `changes/sync-upstream-20260319/downstream-snapshot.json`
- **Action**:
  1. 提取 `src/index.ts` 中所有 `isHookEnabledLoose` 行（行号+内容）
  2. 提取 `src/index.ts` 中所有下游 import 语句
  3. 提取 `src/features/builtin-skills/skills.ts` 中所有下游 skill 条目
  4. 提取 `src/features/builtin-commands/commands.ts` 中所有下游命令
  5. 提取 `src/agents/builtin-agents.ts` 中所有下游 agent
  6. 提取 `src/tools/index.ts` 中所有下游 tool 导出
  7. 提取 `src/mcp/index.ts` 中所有下游 MCP 服务
  8. 列出所有下游独立目录（src/hooks/*/、src/downstream/、src/shared/）
  9. 记录当前 `bun run build` 状态
  10. 记录 `grep -c "isHookEnabledLoose" src/index.ts` 的数量
- **Acceptance**:
  - downstream-snapshot.json 包含上述所有数据
  - 每个热点文件的下游行都有行号和完整内容
- **Risk**: 低
- **结果记录**: 快照文件路径 + 下游注册行总数 + 下游独立目录数

---

## Phase 2: 执行 Merge

### Task 2.1: 创建合并分支并执行 merge
- **Files**: git 操作
- **Action**:
  1. `git stash`（保存当前未提交修改）
  2. `git checkout -b sync/upstream-20260319`
  3. `git merge upstream/dev --no-commit`
  4. 记录冲突文件列表
- **Acceptance**:
  - 分支 `sync/upstream-20260319` 已创建
  - merge 已执行（可能有冲突待解决）
  - 冲突文件列表已记录
- **Risk**: 高
- **Dependencies**: Task 1.1
- **结果记录**: 冲突文件数量 + 冲突文件列表

### Task 2.2: 解决 index.ts 冲突
- **Files**: `src/index.ts`
- **Action**:
  1. 接受上游版本为基础
  2. 从快照中按 3 区域补回下游代码：
     - import 区域：补回下游 hook 的 import
     - 创建区域：补回 `isHookEnabledLoose(...)` 创建语句
     - 生命周期注入：补回 chat.message / tool.execute.before / tool.execute.after 中的下游 hook 调用
  3. 确保上游新增的 dispose 生命周期不被破坏
- **Acceptance**:
  - 所有下游 hook 注册行已补回
  - 上游新增功能（dispose、compaction context）保留
  - `isHookEnabledLoose` 数量 ≥ 快照值
- **Risk**: 极高
- **Dependencies**: Task 2.1
- **结果记录**: 补回的注册行数量 + 上游新增的生命周期事件

### Task 2.3: 解决 skills.ts 冲突
- **Files**: `src/features/builtin-skills/skills.ts`
- **Action**:
  1. 先看上游新版本结构（可能改为懒加载或拆分文件）
  2. 接受上游版本
  3. 在正确位置追加下游 skill 条目
- **Acceptance**:
  - 上游新结构保留
  - 下游 skill 全部追加到正确位置
- **Risk**: 极高
- **Dependencies**: Task 2.1
- **结果记录**: 上游 skills.ts 新结构说明 + 下游 skill 追加位置

### Task 2.4: 解决 commands.ts / builtin-agents.ts / tools/index.ts / mcp/index.ts 冲突
- **Files**: 4 个热点文件
- **Action**:
  1. 逐个接受上游版本
  2. 从快照补回下游注册行
- **Acceptance**:
  - 4 个文件的下游注册行全部补回
- **Risk**: 高
- **Dependencies**: Task 2.1
- **结果记录**: 每个文件补回的行数

### Task 2.5: 解决 hooks.ts schema 冲突
- **Files**: `src/config/schema/hooks.ts`
- **Action**:
  1. 接受上游版本（不在 enum 中补回下游条目）
  2. 确认下游 hook 统一用 `isHookEnabledLoose` 绕过
- **Acceptance**:
  - 上游 hooks.ts 完整保留
  - 无下游 enum 条目（全部走 loose 路径）
- **Risk**: 中
- **Dependencies**: Task 2.1
- **结果记录**: 上游新增的 hook enum 值列表

### Task 2.6: 处理上游改了的共享 hook（atlas / todo-continuation）
- **Files**: `src/hooks/atlas/`, `src/hooks/todo-continuation-enforcer/`, `src/features/boulder-state/`
- **Action**:
  1. atlas：接受上游版本（包含 task_sessions），检查下游是否有自定义修改需要补回
  2. todo-continuation：接受上游版本（包含 stagnation 检测、dispose），检查下游修改
  3. boulder-state：接受上游版本（包含 TaskSessionState），检查下游修改
- **Acceptance**:
  - 上游 task_sessions 机制完整保留
  - 上游 todo-continuation 改进完整保留
  - 下游自定义修改（如有）已补回
- **Risk**: 高
- **Dependencies**: Task 2.1
- **结果记录**: 上游 atlas/todo/boulder 的新功能清单 + 下游需补回的修改

---

## Phase 3: 验证

### Task 3.1: 构建验证
- **Files**: 无新文件
- **Action**:
  1. `bun run build`
  2. 修复编译错误（如有）
  3. 检查下游独立目录全部存在
  4. 检查 `isHookEnabledLoose` 数量 ≥ 快照值
  5. 检查下游 skill 数量 ≥ 快照值
- **Acceptance**:
  - build 通过
  - 所有下游独立目录存在
  - 注册行数量 ≥ 快照值
- **Risk**: 高
- **Dependencies**: Task 2.2 ~ 2.6
- **结果记录**: build 状态 + 下游注册行对比（快照 vs 合并后）

### Task 3.2: 生成验证报告
- **Files**: 新建 `changes/sync-upstream-20260319/verification-report.md`
- **Action**:
  1. 按 omo-sync-details.md 的验证脚本执行
  2. 对比快照 vs 合并后的所有指标
  3. 列出丢失项（如有）
- **Acceptance**:
  - 验证报告完整
  - 所有丢失项已列出并有修复方案
- **Risk**: 低
- **Dependencies**: Task 3.1
- **结果记录**: 验证报告路径 + 丢失项数量

---

## Phase 4: 修复 + 提交

### Task 4.1: 修复丢失项
- **Files**: 视验证报告而定
- **Action**:
  1. 按验证报告逐项修复
  2. 重新 build 确认
- **Acceptance**:
  - 所有丢失项已修复
  - build 通过
- **Risk**: 中
- **Dependencies**: Task 3.2
- **结果记录**: 修复的项目列表

### Task 4.2: 提交合并
- **Files**: git 操作
- **Action**:
  1. `git commit -m "sync: merge upstream 20260319 (589 commits), preserve downstream features"`
  2. `git stash pop`（恢复之前的未提交修改）
  3. 更新 boulder.json
- **Acceptance**:
  - 合并已提交
  - 工作区干净
- **Risk**: 低
- **Dependencies**: Task 4.1
- **结果记录**: commit hash + 最终 build 状态

---

## Phase 5: 同步后重新评估 Bug

### Task 5.1: 重新评估 fix-plan-update-reminder-and-boulder-injection 的 8 个 bug
- **Files**: `changes/fix-plan-update-reminder-and-boulder-injection/tasks.md`
- **Action**:
  1. 检查上游 task_sessions 是否解决了 B3（boulder-continuation 只传数字）
  2. 检查上游 todo-description-override 是否影响 plan-attention-refresher 的设计
  3. 更新 bug 清单，标记已被上游解决的项
  4. 调整剩余 bug 的修复方案
- **Acceptance**:
  - 每个 bug 都有明确的"已解决/仍需修复"状态
  - 剩余 bug 的修复方案已适配上游新架构
- **Risk**: 低
- **Dependencies**: Task 4.2
- **结果记录**: bug 重新评估结果表

---

## 互斥说明

本同步计划与 `fix-plan-update-reminder-and-boulder-injection` 计划的关系：
- 本计划优先执行（先同步再修 bug）
- 同步完成后，部分 bug 可能已被上游解决
- Task 5.1 负责重新评估并更新 bug 修复计划
