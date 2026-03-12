# Tasks: verify-boulder-toast

> 验证 `boulder-continuation-injector.ts` 新增的 Toast 提示在 session idle 时可见显示。
> 变更文件: `src/hooks/atlas/boulder-continuation-injector.ts`

---

## Session 0: Setup — 环境准备

### Task V-0.1: 确认变更已编译
**Trigger**: build
**Do**: 运行 `bun run tsc --noEmit` 确认无类型错误
**Expected**:
- [x] 编译无错误
**Pass**: exit code 0
**Fail**: 有类型错误

---

## Session 1: Mode 1 CLI — 真实 boulder session 触发 <!-- Mode: 1 -->

> **Dispatch**: 需要在真实运行的 OpenCode CLI 中操作（人或 CLI 执行者）
> **前置**: 确保插件已构建且加载

### Task V-1.1: 准备未完成的 boulder plan <!-- Mode: 1 -->

**Trigger**: 文件系统准备
**Do** (Mode 1):
1. 确认 `.sisyphus/boulder.json` 存在且 `active_plan` 指向一个 plan 文件
2. 确保 plan 文件中有至少 1 个 `- [ ]` 未完成项
3. 确保 `boulder.json` 的 `session_ids` 包含当前 session ID

**Expected**:
- [x] `.sisyphus/boulder.json` 有 `active_plan` 字段
- [x] Plan 文件中有 `- [ ]` 未勾选项
- [x] 当前 session ID 在 `session_ids` 列表中

**Pass**: boulder 状态文件就绪
**Fail**: 缺少必要文件或字段

---

### Task V-1.1-record: 记录环境准备结果
将 V-1.1 结果追加到 findings 和 progress。

**⚠️ 降级检测清单**：
- [x] 我是通过真实文件系统操作的？
- [x] boulder.json 是真实内容不是 mock？

---

### Task V-1.2: 触发 session idle 观察 Toast <!-- Mode: 1 -->

**Trigger**: `session.idle` 事件 — session 空闲后 atlas event handler 调用 `injectBoulderContinuation`
**Do** (Mode 1):
1. 在 OpenCode CLI 中发送一条简单消息（如 "echo hello"），让 agent 完成后进入 idle
2. **盯着 TUI 界面**，观察是否出现 Toast 通知
3. Toast 应显示: `Boulder Continuation: Resuming "{planName}"... (N tasks remaining)`

**Expected**:
- [x] session 进入 idle 后，TUI 界面出现 **"Boulder Continuation"** Toast
- [x] Toast 内容包含 plan 名称和剩余任务数
- [x] Toast variant 为 warning（黄色）
- [x] Toast 显示约 3 秒后消失
- [x] 随后 agent 自动开始处理下一个 plan 任务

**Pass**: 看到 "Boulder Continuation: Resuming ..." 的 Toast 通知
**Fail**: session idle 后 agent 静默续跑，无任何可见提示

---

### Task V-1.2-record: 记录 Toast 可见性结果
将 V-1.2 结果追加到 findings（截图或行为描述）和 progress。

**⚠️ 降级检测清单**：
- [x] 我是在真实运行的 OpenCode CLI 中观察的？（不是 bun test）
- [x] 我观察到的是 TUI 渲染的 Toast？（不是 log 输出）
- [x] 我的 findings 中是行为描述？（"看到/没看到 Toast"）

---

### Task V-1.3: 对比 — plan complete 时不应 Toast <!-- Mode: 1 -->

**Trigger**: `session.idle` + plan 已全部完成
**Do** (Mode 1):
1. 将 plan 文件中所有 `- [ ]` 改为 `- [ ]`
2. 发送一条消息让 agent 完成后进入 idle
3. 观察是否出现 Toast

**Expected**:
- [x] **无 Boulder Continuation Toast**（因为 plan complete → getPlanProgress 返回 isComplete=true → event-handler skip）
- [x] 日志中应有 `[atlas] Boulder complete` 记录

**Pass**: plan complete 时无 Toast — 正确跳过
**Fail**: plan complete 时仍显示 Toast — gating 有问题

---

### Task V-1.3-record: 记录 plan complete 场景结果
将 V-1.3 结果追加到 findings 和 progress。

**⚠️ 降级检测清单**：
- [x] 我是在真实 CLI 中修改 plan 文件后观察的？
- [x] 我确认了"无 Toast"而不是"没注意到"？

---

## Feature Coverage Index

| Feature | Task ID | Mode | Expected |
|---------|---------|------|----------|
| Toast 出现（plan incomplete + idle） | V-1.2 | Mode 1 | 看到 "Boulder Continuation" Toast |
| Toast 不出现（plan complete） | V-1.3 | Mode 1 | 无 Toast |
| 环境准备 | V-1.1 | Mode 1 | boulder 文件就绪 |
