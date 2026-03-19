# Tasks: Fix plan-update-reminder & Boulder Injection (修订版 v3 — 全量 Bug 修复)

## 完整 Bug 清单

| # | Bug | 严重度 | 修复阶段 |
|:-:|-----|:------:|:--------:|
| B1 | plan-update-reminder 不监听 apply_patch | 高 | Phase 3 |
| B2 | output.messages.push() 在 OpenCode 不工作（影响 debugging-injector + plan-update-reminder） | 高 | Phase 4 |
| B3 | boulder-continuation 只传数字不传任务内容 | 中 | Phase 2 |
| B4 | debugging-injector 注入不可见（同 B2 根因） | 高 | Phase 4 |
| B5 | /reset-failures 在 opencode run 环境无法执行 | 中 | Phase 5 |
| B6 | atlas/todo 互斥依赖共享状态需调优 | 中 | 不修（见说明） |
| B7 | plan-attention-refresher 注入前 30 行原文（含已完成任务），导致 AI 失焦 | 高 | Phase 3.5 |
| B8 | plan-attention-refresher 不监听 apply_patch | 中 | Phase 3.5 |

### B6 不修的理由
当前互斥机制已正确工作：
- boulder 激活 → atlas 管 session.idle，todo-continuation 不触发（通过 readBoulderState + session_ids 检查）
- boulder 未激活 → todo-continuation 正常工作，plan-update-reminder 不触发（检查 boulder state）
- plan-update-reminder 只在 boulder 激活时的 tool.execute.after 触发，跟 atlas 的 session.idle 不冲突
- 两者触发时机不同（tool.after vs session.idle），天然互斥，无需额外逻辑

---

## Phase 1: 基础设施 `pending`

### Task 1.1: 创建 plan-content-reader 工具函数
- **Files**: Create `src/hooks/atlas/plan-content-reader.ts`
- **Risk**: Medium
- **Fixes**: B3 基础设施
- **Description**: 创建读取 tasks.md 未完成任务列表和 findings.md 尾部的工具函数。供 boulder-continuation-injector、plan-attention-refresher 和 debugging-injector 共用。设计为双数据源接口：默认读 tasks.md（grep `- [ ]`），预留 `new_task_system_enabled` 时读 `.sisyphus/tasks/T-*.json` 的分支（当前只实现 tasks.md 分支，JSON 分支留 TODO 注释）。
- **Acceptance Criteria**:
  - `readIncompleteTasks(tasksPath: string, config?: Partial<OhMyOpenCodeConfig>)` → 返回 `- [ ]` 行的数组，最多 10 条
  - 函数签名预留 config 参数，内部有 `if (config?.new_task_system_enabled)` 分支（当前 throw "not implemented"）
  - `readFindingsTail(findingsPath: string, lines?: number)` → 返回最后 N 行字符串
  - `resolveChangePaths(directory: string)` → 从 boulder.json 解析 tasks.md/findings.md 绝对路径
  - 文件不存在时返回 null，不抛异常
  - 空文件返回空数组/空字符串
- **TDD Tests**:
  - tasks.md 有 12 个任务（5 完成 7 未完成）→ 返回 7 个未完成
  - tasks.md 有 15 个未完成 → 只返回前 10 个 + 溢出标记
  - findings.md 50 行 → 只返回最后 20 行
  - 文件不存在 → 返回 null
  - 空文件 → 返回空
- **结果记录**: 记录 API 签名、边界情况处理

### Task 1.2: 提取 plan-update-reminder 常量
- **Files**: Create `src/hooks/plan-update-reminder/constants.ts`, Modify `src/hooks/plan-update-reminder/index.ts`
- **Risk**: Low
- **Fixes**: B1 基础设施
- **Description**: 提取 `HOOK_NAME`、`EXCLUDED_PATTERNS`，新增 `MONITORED_TOOLS = ["edit", "write", "apply_patch"]`
- **Acceptance Criteria**:
  - constants.ts 导出 HOOK_NAME, EXCLUDED_PATTERNS, MONITORED_TOOLS
  - index.ts 从 ./constants 导入
  - Build 通过
- **TDD Tests**:
  - MONITORED_TOOLS 包含 "edit", "write", "apply_patch"
- **结果记录**: 记录导出符号列表

---

## Phase 2: boulder-continuation 内容注入（修复 B3） `pending`

### Task 2.1: 在 boulder-continuation-injector 中注入未完成任务列表
- **Files**: Modify `src/hooks/atlas/boulder-continuation-injector.ts`
- **Risk**: Medium
- **Fixes**: B3
- **Dependencies**: Task 1.1
- **Description**: 在 `injectBoulderContinuation` 中调用 `readIncompleteTasks()`，将未完成任务逐行列出在 prompt 中。只传 `- [ ]` 的任务，不传 `- [x]` 的。超过 10 个只传前 10 个。
- **Acceptance Criteria**:
  - promptAsync 的 prompt 包含未完成任务列表
  - 格式：每行一个 `- [ ] Task name`
  - 超过 10 个时显示 `...and N more tasks`
  - tasks.md 不存在时回退到原有行为（只传数字）
- **TDD Tests**:
  - 7 个未完成任务 → prompt 包含 7 行 `- [ ]`
  - 15 个未完成任务 → prompt 包含 10 行 + "...and 5 more"
  - tasks.md 不存在 → prompt 只有 Status 行
  - 全部完成 → 不注入（atlas event-handler 已处理此情况）
- **结果记录**: 记录 prompt 格式变化、测试结果

### Task 2.2: 在 boulder-continuation-injector 中注入 findings.md 上下文
- **Files**: Modify `src/hooks/atlas/boulder-continuation-injector.ts`
- **Risk**: Medium
- **Fixes**: B3
- **Dependencies**: Task 1.1
- **Description**: 调用 `readFindingsTail()` 读取 findings.md 最后 20 行，追加到 prompt 中。
- **Acceptance Criteria**:
  - promptAsync 的 prompt 包含 findings 尾部
  - 标签：`## Recent Findings (last 20 lines)`
  - findings.md 不存在时显示 "findings.md 尚未创建，请在发现重要信息时创建"
  - 限制 20 行
- **TDD Tests**:
  - findings.md 50 行 → prompt 包含最后 20 行
  - findings.md 不存在 → prompt 包含"尚未创建"提示
  - findings.md 为空 → prompt 包含"暂无记录"
- **结果记录**: 记录 findings 注入格式

---

## Phase 3: plan-update-reminder apply_patch 支持（修复 B1） `pending`

### Task 3.1: plan-update-reminder 加入 apply_patch 监听
- **Files**: Modify `src/hooks/plan-update-reminder/index.ts`
- **Risk**: Low (debugging-injector 已验证的模式)
- **Fixes**: B1
- **Dependencies**: Task 1.2
- **Description**: 在 tool.execute.before 和 tool.execute.after 中加入 apply_patch 支持。从 patchText 提取文件路径。保持 output.output += 方式不变。
- **Acceptance Criteria**:
  - tool.execute.before 对 apply_patch 触发
  - 从 patchText 提取文件路径（`*** Update File:` / `*** Add File:` regex）
  - tool.execute.after 对 apply_patch 生成提醒
  - 现有 edit/write 行为不变
- **TDD Tests**:
  - apply_patch `*** Add File: src/foo.ts` → 触发提醒
  - apply_patch `*** Update File: src/bar.ts` → 触发提醒
  - apply_patch 无 patchText → 不崩溃
  - apply_patch 修改 .md 文件 → 跳过（EXCLUDED_PATTERNS）
  - edit 工具 → 行为不变
- **结果记录**: 记录 regex 模式、测试通过数

---

## Phase 3.5: plan-attention-refresher 修复（修复 B7 + B8） `pending`

### Task 3.5.1: plan-attention-refresher 改为只注入未完成任务
- **Files**: Modify `src/hooks/plan-attention-refresher/index.ts`
- **Risk**: Medium
- **Fixes**: B7
- **Dependencies**: Task 1.1
- **Description**: 当前 `readFirstLines(tasksPath, 30)` 读取 tasks.md 前 30 行原文，包含已完成的 `- [x]` 和未完成的 `- [ ]` 混在一起。如果前 30 行全是已完成任务（Phase 1 做完了），AI 看到的全是已完成内容，完全失焦。改为调用 `readIncompleteTasks()` 只注入未完成任务列表。
- **Acceptance Criteria**:
  - 不再使用 `readFirstLines()`，改用 `readIncompleteTasks()`
  - 注入内容只包含 `- [ ]` 的任务，不包含 `- [x]`
  - 超过 10 个只显示前 10 个 + 溢出标记
  - 保留 60 秒冷却机制
  - tasks.md 不存在时跳过（不注入）
  - 注入格式改为：`[PLAN CONTEXT - {plan_name}]\nIncomplete tasks:\n- [ ] ...\n[/PLAN CONTEXT]`
- **TDD Tests**:
  - tasks.md 有 12 个任务（5 完成 7 未完成）→ 只注入 7 个未完成
  - tasks.md 前 30 行全是已完成 → 仍能注入后面的未完成任务（不再受 30 行限制）
  - 全部完成 → 注入 "All tasks completed"
  - tasks.md 不存在 → 不注入
  - 60 秒内重复触发 → 跳过
- **结果记录**: 记录注入内容变化、失焦问题是否解决

### Task 3.5.2: plan-attention-refresher 加入 apply_patch 监听
- **Files**: Modify `src/hooks/plan-attention-refresher/index.ts`
- **Risk**: Low
- **Fixes**: B8
- **Description**: 当前 TRIGGER_TOOLS 只有 `["write", "edit", "bash", "read"]`，不包含 `apply_patch`。加入 apply_patch 支持。
- **Acceptance Criteria**:
  - TRIGGER_TOOLS 包含 "apply_patch"
  - apply_patch 触发时正常注入未完成任务
  - 现有 write/edit/bash/read 行为不变
- **TDD Tests**:
  - apply_patch 工具 → 触发注入
  - edit 工具 → 行为不变
  - 60 秒冷却对 apply_patch 同样生效
- **结果记录**: 记录 TRIGGER_TOOLS 变更

---

## Phase 4: debugging-injector 注入方式修复（修复 B2 + B4） `pending`

### Task 4.1: debugging-injector 从 messages.push 改为 output.output 注入
- **Files**: Modify `src/hooks/debugging-injector/index.ts`
- **Risk**: Medium
- **Fixes**: B2, B4
- **Description**: V-3.3 验证证明 `output.messages.push()` 在 OpenCode 不工作。将 debugging-injector 的注入方式从 `output.messages.push()` 改为 `output.output +=`。虽然可见性降低，但至少在 Claude Code 原生环境有效，比完全不可见好。同时在注入内容前加 `\n\n---\n[AUTO-INJECTED: SYSTEMATIC DEBUGGING]\n` 前缀，提高辨识度。
- **Acceptance Criteria**:
  - debugging-injector 使用 `output.output +=` 而非 `output.messages.push()`
  - 注入内容有明确的 `[AUTO-INJECTED]` 前缀
  - 原有的 failure threshold 逻辑不变
  - 原有的 apply_patch 文件路径提取不变
- **TDD Tests**:
  - failure count 达到阈值 → output.output 包含 debugging skill 内容
  - output.messages 不再被修改
  - 注入内容包含 `[AUTO-INJECTED: SYSTEMATIC DEBUGGING]` 前缀
- **结果记录**: 记录注入方式变更、前后对比

### Task 4.2: 添加 output.messages.push 不工作的文档注释
- **Files**: Modify `src/hooks/debugging-injector/index.ts`, Modify `src/hooks/plan-update-reminder/index.ts`
- **Risk**: Low
- **Fixes**: B2（文档化已知限制）
- **Description**: 在两个 hook 的代码中添加注释，说明 `output.messages.push()` 在 OpenCode 运行时不工作的已知限制，防止未来开发者再次使用此方式。
- **Acceptance Criteria**:
  - debugging-injector 有注释说明 messages.push 限制
  - plan-update-reminder 有注释说明 messages.push 限制
  - 注释包含 V-3.3 验证的引用
- **结果记录**: 记录注释位置

---

## Phase 5: /reset-failures 环境适配（修复 B5） `pending`

### Task 5.1: 为 failure-counter 添加非斜杠命令的重置方式
- **Files**: Modify `src/hooks/failure-counter/index.ts` 或相关文件
- **Risk**: Medium
- **Fixes**: B5
- **Description**: `/reset-failures` 在 `opencode run` 环境无法执行（CLI 不暴露斜杠命令工具）。添加替代重置方式：通过环境变量 `RESET_FAILURE_COUNT=true` 或通过 boulder.json 的特殊字段触发重置。
- **Acceptance Criteria**:
  - 在 opencode run 环境中可以重置 failure counter
  - 原有 `/reset-failures` 斜杠命令在 Claude Code 环境仍然有效
  - 新增至少一种非斜杠命令的重置方式
  - 重置后 counter 归零，日志记录重置事件
- **TDD Tests**:
  - 环境变量 RESET_FAILURE_COUNT=true → counter 重置为 0
  - 环境变量不存在 → 不影响正常行为
  - 重置后下一次 failure 从 0 开始计数
- **结果记录**: 记录新增重置方式、测试结果

---

## Phase 6: 测试与构建 `pending`

### Task 6.1: 更新全部测试套件
- **Files**: Modify `src/hooks/atlas/__tests__/*.test.ts`, Modify `src/hooks/plan-update-reminder/__tests__/*.test.ts`, Modify `src/hooks/debugging-injector/__tests__/*.test.ts`
- **Risk**: Low
- **Dependencies**: Tasks 2.1, 2.2, 3.1, 4.1, 5.1
- **Description**: 更新所有受影响 hook 的测试。
- **Acceptance Criteria**:
  - boulder-continuation 测试验证 prompt 包含未完成任务 + findings
  - plan-update-reminder 测试覆盖 apply_patch
  - debugging-injector 测试验证 output.output 注入（非 messages.push）
  - failure-counter 测试覆盖新重置方式
  - `vitest --run` 全部通过
- **结果记录**: 记录测试数量、通过/失败

### Task 6.2: 构建与集成验证
- **Files**: None (build only)
- **Risk**: Low
- **Dependencies**: Task 6.1
- **Description**: `bun run build` 验证无 TypeScript 错误。验证 bundle 包含所有修改。
- **Acceptance Criteria**:
  - `bun run build` 成功
  - bundle 包含 plan-content-reader、MONITORED_TOOLS、output.output 注入
  - 无 output.messages.push 残留（grep 确认）
- **结果记录**: 记录构建输出、bundle 验证结果

---

## 互斥关系说明（设计决策，非 Bug）

### 三层注入架构（boulder 激活时）
```
Layer 1: plan-attention-refresher (PreToolUse, 60s 冷却)
  → 每次工具调用前注入未完成任务列表
  → 让 AI 始终"记得"当前要做什么

Layer 2: plan-update-reminder (PostToolUse, 2-Action Rule)
  → 每次代码修改后提醒更新 findings/tasks/progress
  → 让 AI 及时记录发现

Layer 3: boulder-continuation-injector (session.idle)
  → AI 停下来时通过 promptAsync 强制续跑
  → 注入未完成任务 + findings 上下文
```

### plan-update-reminder 何时触发？
- **只在 boulder 激活时触发**（检查 `readBoulderState()`）
- boulder 未激活 → 不触发，todo-continuation 正常工作
- subagent session → 不触发（有 `subagentSessions.has()` 检查）

### plan-attention-refresher 何时触发？
- **只在 boulder 激活时触发**（检查 `readBoulderState()`）
- 60 秒冷却，不会每次都触发
- subagent session → 不触发

### atlas 和 todo-continuation 的互斥
- boulder 激活 → atlas 管 session.idle 续跑，todo-continuation 不触发
- boulder 未激活 → todo-continuation 正常工作
- 通过 `readBoulderState()` + `session_ids` 检查实现，已正确工作

### 两个禁用 todo 的实验性功能
项目有两个独立的禁用 todo 机制：

**1. `experimental.task_system: true`**
- 通过 `tasks-todowrite-disabler` hook 拦截 TodoRead/TodoWrite
- 替代：Claude Code 内置 TaskCreate/TaskUpdate（内存 task，跨会话丢失）
- 不涉及文件拆分

**2. `new_task_system_enabled: true`**
- 启用 `src/features/claude-tasks/` 文件持久化 task 系统
- 每个 task 一个独立 JSON 文件：`.sisyphus/tasks/T-{uuid}.json`
- 跨会话持久化，有锁机制

**决策：两个都保持关闭。** 原因：
- task_system 的内存 task 跟 boulder/tasks.md 不集成
- new_task_system 的小文件模式跟 plan-attention-refresher/boulder-continuation 的 tasks.md 读取逻辑不兼容
- 打开任一个都需要三个 hook 全部改造
- 当前 todo + boulder/tasks.md 体系已正确互斥工作

**预留适配**：`readIncompleteTasks()` 设计为双数据源接口，未来打开 new_task_system 时只需实现 `readFromTaskFiles()` 分支
