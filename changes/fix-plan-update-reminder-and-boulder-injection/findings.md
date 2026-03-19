# Findings: Fix plan-update-reminder & Boulder Injection

## Requirements

### From Verification Session (⑦)
- plan-update-reminder only monitors `edit`/`write`, misses `apply_patch` used by OpenCode inner agent
- Reminder uses `output.output +=` (toast-level), not `output.messages.push()` (chat injection)
- Boulder system lacks todo-equivalent "content direct display" — no tasks.md/findings.md content in reminders
- Findings only written at task completion, not during execution

### Reference Implementations
- **debugging-injector**: Uses `output.messages.push({ role: "system", content: ... })` for tool-level injection
- **todo-continuation-enforcer**: Uses `ctx.client.session.promptAsync()` for session-level injection with full todo list content
- **planning-with-files**: Uses `cat task_plan.md | head -30` PreToolUse hook to re-inject plan into context

## Research Findings

### Injection Method Comparison
| Method | API | Visibility | Use Case |
|--------|-----|-----------|----------|
| `output.output +=` | Tool output append | Low (footnote) | Current plan-update-reminder (broken) |
| `output.messages.push()` | System message injection | Medium (system msg) | debugging-injector (working) |
| `ctx.client.session.promptAsync()` | New chat turn | High (forces response) | todo-continuation (working) |

### Decision (v2 修订): 不使用 output.messages.push()
- V-3.3 验证证明 OpenCode 运行时不读取 `output.messages`，注入内容不可见
- 改为两层策略：
  - boulder-continuation-injector 用 `promptAsync`（session.idle 时，低频）
  - plan-update-reminder 保持 `output.output +=`（tool 调用时，高频但轻量）

### Existing Utilities Available
- `getPlanProgress(planPath)` → `{ total, completed, isComplete, phases? }` (boulder-state/storage.ts)
- `getFirstIncompleteTask(planPath)` → task name string (boulder-state/storage.ts)
- `readBoulderState(directory)` → `{ active_plan, plan_name, ... }` (boulder-state/storage.ts)

## Technical Decisions

1. **主修复在 boulder-continuation-injector，不在 plan-update-reminder** — promptAsync 是唯一确认有效的强制注入方式
2. **只传未完成任务，防止失焦** — 与 todo-continuation 只传未完成 todo 的做法一致
3. **未完成任务超过 10 个时截断** — 避免 prompt 膨胀
4. **Reuse boulder-state utilities** — 不需要重新解析 tasks.md
5. **20-line findings tail limit** — 防止上下文膨胀，给 AI 足够信息知道已记录什么
6. **atlas 已有 promptAsync 注入** — 不需要新建注入通道，只需增强注入内容

## 新发现

### atlas boulder-continuation 已有 promptAsync 注入
- `src/hooks/atlas/boulder-continuation-injector.ts` 在 session.idle 时用 `promptAsync` 注入
- 但注入内容只有数字 `[Status: 3/12 completed, 9 remaining]`
- 让 AI 自己去 Read tasks.md，浪费一轮工具调用
- 修复方向：在 prompt 中直接包含未完成任务列表 + findings 尾部

### output.messages.push() 在 OpenCode 中不工作
- V-3.3 验证证明：debugging-injector 的 `output.messages.push()` 执行了但内容不可见
- OpenCode 运行时不读取 `output.messages`
- 因此 plan-update-reminder 不能用此方式，保持 `output.output +=`

### 失焦问题解决方案
- 只传 `- [ ]` 未完成任务，不传 `- [x]` 已完成任务
- 超过 10 个未完成任务时截断
- 与 todo-continuation 只传未完成 todo 的做法一致
