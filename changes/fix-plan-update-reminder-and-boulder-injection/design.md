# Design: Fix plan-update-reminder & Boulder Injection (修订版 v2)

## Goal

修复 boulder 系统的两层注入机制，使其达到与 todo 系统同等的"内容感知"能力：
1. **session.idle 层**（atlas/boulder-continuation-injector）：注入未完成任务列表 + findings 上下文
2. **tool 调用层**（plan-update-reminder）：加 apply_patch 支持，保持 output.output += 方式

## 关键发现（影响设计的事实）

### output.messages.push() 在 OpenCode 中不工作
V-3.3 验证证明：debugging-injector 的 `output.messages.push()` 执行了，但注入内容从未出现在 AI 对话流中。OpenCode 运行时不读取 `output.messages`。

因此：
- **不能用 `output.messages.push()`** 作为注入方式
- **`output.output +=`** 在 Claude Code 原生环境有效（AI 能看到工具输出追加内容）
- **`ctx.client.session.promptAsync()`** 是唯一确认有效的"强制注入"方式（todo-continuation 和 atlas 都在用）

### boulder 和 todo 的互斥关系（已正确实现）
- boulder 激活时 → atlas 接管 session.idle，todo-continuation 不触发
- boulder 未激活时 → todo-continuation 正常工作
- 互斥通过 `readBoulderState()` + `session_ids` 检查实现，无需修改

### 当前 boulder-continuation 注入内容太弱
只传数字 `[Status: 3/12 completed, 9 remaining]`，让 AI 自己去 Read tasks.md。
应该像 todo 一样直接传未完成任务列表，避免浪费一轮工具调用。

## Architecture

### 修复前（当前状态）

```
session.idle → atlas → boulder-continuation-injector
  → promptAsync("Continue working. [Status: 3/12]")
  → AI 收到后要自己 Read tasks.md 才知道做什么 ← 浪费一轮

tool.execute.after → plan-update-reminder
  → output.output += "请更新 tasks.md"
  → 只监听 edit/write，不监听 apply_patch ← 在 OpenCode 不触发
```

### 修复后（目标状态）

```
session.idle → atlas → boulder-continuation-injector
  → 读取 tasks.md，提取 - [ ] 未完成任务
  → 读取 findings.md 最后 20 行
  → promptAsync("Continue. 未完成任务:\n- [ ] Task 5\n- [ ] Task 6\n\n最近发现:\n...")
  → AI 直接看到要做什么，不需要额外 Read ← 省一轮

tool.execute.after → plan-update-reminder
  → 监听 edit/write/apply_patch
  → output.output += "请更新 tasks.md/findings.md"（保持现有方式）
  → 至少在 Claude Code 环境有效
```

### 关于"失焦"问题的设计
只注入未完成任务（`- [ ]`），不注入已完成任务（`- [x]`）。
这样 AI 的注意力集中在"下一步做什么"，不会被已完成内容分散。

### File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/atlas/boulder-continuation-injector.ts` | Modify | 注入时读取 tasks.md 未完成任务 + findings.md 尾部 |
| `src/hooks/atlas/plan-content-reader.ts` | Create | 读取 tasks.md/findings.md 的工具函数 |
| `src/hooks/plan-update-reminder/index.ts` | Modify | 加 apply_patch 支持 |
| `src/hooks/plan-update-reminder/constants.ts` | Create | 提取 MONITORED_TOOLS 常量 |
| `src/hooks/plan-update-reminder/__tests__/` | Modify | 更新测试 |
| `src/hooks/atlas/__tests__/` | Modify | 更新 boulder-continuation 测试 |

### Key Decisions

1. **boulder-continuation 用 promptAsync + 内容注入（主修复）**
   - 这是唯一确认有效的强制注入方式
   - 只在 session.idle 时触发，不会频繁
   - 直接传未完成任务列表，省去 AI 自己 Read 的一轮

2. **plan-update-reminder 保持 output.output +=（辅助提醒）**
   - 在 Claude Code 环境有效
   - 在 OpenCode 环境效果有限，但至少不会出错
   - 不值得为此引入 promptAsync（太频繁）

3. **只传未完成任务，不传已完成任务**
   - 防止 AI "失焦"
   - 格式：逐行列出 `- [ ] Task name`
   - 如果未完成任务超过 10 个，只传前 10 个 + "...and N more"

4. **findings.md 限制最后 20 行**
   - 防止上下文膨胀
   - 给 AI 足够信息知道"已经记录了什么"

## Tech Stack

- Runtime: Bun (existing)
- Testing: Vitest (existing)
- No new dependencies

## Edge Cases

1. **No boulder state active** → Skip entirely (existing behavior, unchanged)
2. **tasks.md doesn't exist** → 只传基本 prompt，不含任务列表
3. **findings.md doesn't exist** → prompt 中说 "findings.md 尚未创建"
4. **Subagent session** → Skip (existing behavior, unchanged)
5. **apply_patch with multiple files** → Extract first file path only
6. **Markdown files edited** → plan-update-reminder skip (existing EXCLUDED_PATTERNS)
7. **未完成任务 > 10 个** → 只传前 10 个 + 省略提示
8. **output.messages.push 在 OpenCode 不工作** → 已知限制，不使用此方式
