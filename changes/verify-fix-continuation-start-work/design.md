# Design: verify-fix-continuation-start-work

## Goal

验证 fix-continuation-loop 和 start-work-hardening 引入的 run-continuation-state 和 boulder-state 模块的运行时行为和集成完整性。

## Architecture — 组件依赖关系

```
src/features/run-continuation-state/ (持久化 marker 存储)
  ├─ storage.ts → .sisyphus/run-continuation/{sessionID}.json
  ├─ types.ts → ContinuationMarker { sessionID, sources: { todo|stop → state } }
  └─ constants.ts
      ↓ 被依赖
  src/hooks/todo-continuation-enforcer/handler.ts (写入 "todo" source → active)
  src/hooks/stop-continuation-guard/hook.ts (写入 "stop" source → stopped)
  src/cli/run/continuation-state.ts (读取 marker → 决定是否继续迭代)

src/features/boulder-state/ (计划级元数据)
  ├─ storage.ts → .sisyphus/boulder.json
  ├─ types.ts → BoulderState { active_plan, phase, current_task, wave_execution }
  ├─ retry-tracker.ts → .sisyphus/retry-state.json (cap at 3 retries)
  └─ worktree-manager.ts → git worktree 生命周期管理
      ↓ 被依赖
  src/hooks/start-work/start-work-hook.ts (执行模式选择 + plan worktree)
  src/hooks/plan-attention-refresher/index.ts (读取 active_plan)
  src/hooks/plan-update-reminder/index.ts (读取任务状态)
  src/hooks/atlas/tool-execute-after.ts (读取 boulder state)
  src/hooks/planning-flow-guide/index.ts (phase 检查)
  src/hooks/phase-flow-enforcer/index.ts (phase 流控)
  src/cli/run/continuation-state.ts (读取 boulder state 决定是否继续)
  src/plugin/tool-execute-before.ts (注入 boulder context)
```

## 4 个验证目标详细分析

### 1. run-continuation-state

| 属性 | 值 |
|------|-----|
| 路径 | `src/features/run-continuation-state/` |
| 文件 | constants.ts, index.ts, storage.ts, storage.test.ts, types.ts |
| 存储位置 | `.sisyphus/run-continuation/{sessionID}.json` |
| 核心 API | `setContinuationMarkerSource`, `isContinuationMarkerActive`, `getActiveContinuationMarkerReason` |
| 消费者 | todo-continuation-enforcer, stop-continuation-guard, CLI continuation-state |
| 测试 | `storage.test.ts` ✅ |
| 可观察性 | 文件系统写入（.json）→ agent 可读取验证 |

**CLI 信号链路：**
```
Hook (todo-enforcer) → setContinuationMarkerSource("todo", "active") → .json file
  ↓
CLI (continuation-state.ts) → isContinuationMarkerActive() → hasActiveHookMarker: true
  ↓
CLI 触发下一轮迭代
```

### 2. boulder-state

| 属性 | 值 |
|------|-----|
| 路径 | `src/features/boulder-state/` |
| 文件 | constants.ts, index.ts, storage.ts, retry-tracker.ts, worktree-manager.ts, types.ts + 3 test files |
| 存储位置 | `.sisyphus/boulder.json` (state), `.sisyphus/retry-state.json` (retries) |
| 核心 API | `readBoulderState`, `writeBoulderState`, `incrementRetry`, `isMaxRetries`, `initializeWaveExecution` |
| 消费者 | 10+ hooks 和 CLI |
| 测试 | `storage.test.ts`, `retry-tracker.test.ts`, `worktree-manager.test.ts` ✅ |
| 可观察性 | 文件系统写入 → agent 可读取验证 |

### 3. fix-continuation-loop（bug 修复）

| 属性 | 值 |
|------|-----|
| 问题 | CLI 无限触发 TODO/BOULDER CONTINUATION |
| 根因 | 任务被阻塞（segfault/需用户干预）时仍标记为 active |
| 修复方案 | retry-tracker cap at 3 + ContinuationMutex 防双注入 |
| 验证方式 | 反向触发 — 确认重试 3 次后不再继续 |

### 4. start-work-hardening

| 属性 | 值 |
|------|-----|
| 路径 | `src/hooks/start-work/` |
| 功能 | 强制选择执行模式（Sequential vs Wave）+ 自动创建 plan worktree |
| 依赖 | boulder-state (worktree-manager, storage) |
| 验证方式 | 静态检查（prompt 结构）+ Mode 1（需 CLI 中 /start-work） |

## Key Decisions

1. run-continuation-state 和 boulder-state 优先用 bun test 验证（完善的单元测试已存在）
2. 铁律6：为两个 feature 的调用方（hooks）生成 Mode 2 触发 task
3. fix-continuation-loop 用 retry-tracker 的 bun test 验证上限逻辑
4. start-work-hardening 的交互式选择标记为 Mode 1（需 CLI 环境）
5. boulder-state 的 worktree-manager 验证可在 git 环境中直接测试

## Edge Cases

- ContinuationMarker 文件不存在时的默认行为（应返回 null/inactive）
- boulder.json 被手动删除或损坏时的恢复
- retry-tracker 在 sessionID 变化时的状态隔离
- worktree-manager 在非 git 目录中的 fallback
- 多个 source 同时 active 时 CLI 的处理优先级
