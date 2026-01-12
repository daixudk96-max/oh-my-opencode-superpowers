# Oh-My-OpenCode Todo-Continuation 修复记录

## 问题描述

### 问题 1: TODO 列表未清空导致反复提醒
当 TODO 列表中还存在未完成任务时，`session.idle` 事件触发后会在 2 秒倒计时结束后注入 `[SYSTEM REMINDER - TODO CONTINUATION]` 提示。当 API 响应较慢或正在流式输出时，系统可能误判为"空闲"状态，导致：
- 聊天记录崩溃
- 反复弹出提醒
- 无法正常输出内容

### 问题 2: API 速率较慢或中断时反复弹出 SYSTEM REMINDER
当 API 被中断或响应缓慢时，`session.idle` 事件会过早触发，导致：
- 在 API 还未输出完成时就被打断
- 反复触发 `[SYSTEM REMINDER - TODO CONTINUATION]`

## 分析结果

### v3.0.0-beta.5 已包含的修复
1. `9bfe7d8` - 倒计时结束后重新验证 TODO 状态（防止过期数据注入）
2. `8b99133` - 添加 500ms 宽限期防止倒计时误取消
3. `f6b066e` - 用事件顺序检测替代基于时间的冷却
4. `a49fbee` - 更新消息模拟结构，移除不可靠的中止错误处理测试
5. `isLastAssistantMessageAborted()` - 检测最后的助手消息是否被中止

### 未合并到 beta.5 的修复
- `ae7fc37` (分支 `fix/todo-continuation-interactive-bash`) - `interactive_bash` 执行后跳过 5 秒的 TODO 检查，防止误触发

## 修复步骤

### 1. 克隆仓库
```bash
git clone https://github.com/code-yeongyu/oh-my-opencode.git oh-my-opencode-debug
cd oh-my-opencode-debug
```

### 2. 检出最新 beta 版本并创建补丁分支
```bash
git checkout v3.0.0-beta.5 -b local-beta5-patched
```

### 3. 手动应用 interactive_bash 修复
由于 cherry-pick 存在冲突，手动应用以下修改到 `src/hooks/todo-continuation-enforcer.ts`:

#### 3.1 添加 `lastInteractiveBashAt` 到 SessionState 接口
```typescript
interface SessionState {
  countdownTimer?: ReturnType<typeof setTimeout>
  countdownInterval?: ReturnType<typeof setInterval>
  isRecovering?: boolean
  countdownStartedAt?: number
  lastInteractiveBashAt?: number  // 新增
}
```

#### 3.2 添加防抖常量
```typescript
const COUNTDOWN_SECONDS = 2
const TOAST_DURATION_MS = 900
const COUNTDOWN_GRACE_PERIOD_MS = 500
const INTERACTIVE_BASH_DEBOUNCE_MS = 5000  // 新增
```

#### 3.3 在 session.idle 处理中添加防抖检查
```typescript
// 在 state.isRecovering 检查之后添加
if (state.lastInteractiveBashAt) {
  const timeSinceInteractiveBash = Date.now() - state.lastInteractiveBashAt
  if (timeSinceInteractiveBash < INTERACTIVE_BASH_DEBOUNCE_MS) {
    log(`[${HOOK_NAME}] Skipped: recent interactive_bash usage`, { sessionID, timeSinceInteractiveBash })
    return
  }
}
```

#### 3.4 在 tool.execute.after 事件中跟踪 interactive_bash
```typescript
if (event.type === "tool.execute.before" || event.type === "tool.execute.after") {
  const sessionID = props?.sessionID as string | undefined
  const toolName = props?.tool as string | undefined
  if (sessionID) {
    cancelCountdown(sessionID)
    // Track interactive_bash usage for debounce
    if (toolName?.toLowerCase() === "interactive_bash" && event.type === "tool.execute.after") {
      const state = getState(sessionID)
      state.lastInteractiveBashAt = Date.now()
      log(`[${HOOK_NAME}] Tracked interactive_bash execution`, { sessionID })
    }
  }
  return
}
```

### 4. 构建项目
```bash
bun install
bun run build
```

### 5. 配置 OpenCode 使用本地版本
编辑 `~/.opencode/package.json`:
```json
{
  "dependencies": {
    "oh-my-opencode": "C:/github/oh-my-opencode-debug"
  }
}
```

然后运行:
```bash
cd ~/.opencode
bun install
```

### 6. 验证安装
```bash
cat ~/.opencode/node_modules/oh-my-opencode/package.json | head -10
# 应显示 version: "3.0.0-beta.5"
```

## 当前状态

- **基础版本**: v3.0.0-beta.5
- **本地分支**: `local-beta5-patched`
- **额外修复**: 
  1. interactive_bash 5秒防抖
  2. recovery complete 5秒延迟（防止 compaction 后 continue 与 TODO continuation 冲突）
- **安装位置**: `~/.opencode/node_modules/oh-my-opencode`

## 修复问题 3: Compaction 后 continue 与 TODO continuation 冲突

### 问题
当 session compaction（上下文压缩）完成后，系统会发送 "continue" 恢复会话。但 `markRecoveryComplete` 立即清除 `isRecovering` 标志，导致：
1. `session.idle` 触发时 `isRecovering = false`
2. todo-continuation 开始 2 秒倒计时
3. 倒计时结束后注入 `[SYSTEM REMINDER - TODO CONTINUATION]`
4. 与 "continue" 恢复流程冲突

### 解决方案
修改 `markRecoveryComplete` 函数，延迟 5 秒后再清除 `isRecovering` 标志：

#### 3.5 添加 recoveryCompleteTimer 到 SessionState
```typescript
interface SessionState {
  countdownTimer?: ReturnType<typeof setTimeout>
  countdownInterval?: ReturnType<typeof setInterval>
  isRecovering?: boolean
  countdownStartedAt?: number
  lastInteractiveBashAt?: number
  recoveryCompleteTimer?: ReturnType<typeof setTimeout>  // 新增
}
```

#### 3.6 添加延迟常量
```typescript
const RECOVERY_COMPLETE_DELAY_MS = 5000  // 新增
```

#### 3.7 修改 markRecoveryComplete 函数
```typescript
const markRecoveryComplete = (sessionID: string): void => {
  const state = sessions.get(sessionID)
  if (state) {
    // Clear any existing recovery complete timer
    if (state.recoveryCompleteTimer) {
      clearTimeout(state.recoveryCompleteTimer)
    }
    // Delay clearing isRecovering to allow "continue" prompt to execute
    state.recoveryCompleteTimer = setTimeout(() => {
      const currentState = sessions.get(sessionID)
      if (currentState) {
        currentState.isRecovering = false
        currentState.recoveryCompleteTimer = undefined
      }
    }, RECOVERY_COMPLETE_DELAY_MS)
  }
}
```

这样在 compaction/recovery 完成后的 5 秒内，todo-continuation 不会触发。

## 相关分支（供参考）

| 分支 | 描述 | 状态 |
|------|------|------|
| `origin/fix/todo-continuation-race-condition` | 竞态条件修复 + hybrid abort detection | 大部分已合并到 beta.5 |
| `origin/fix/todo-continuation-interactive-bash` | interactive_bash 防抖 | 手动合并到本地 |

## 回滚方法

如需回滚到官方版本:
```bash
cd ~/.opencode
echo '{"dependencies": {"@opencode-ai/plugin": "1.1.13"}}' > package.json
bun install
```

## 更新本地构建

当修改源代码后，需要重新构建:
```bash
cd C:/github/oh-my-opencode-debug
bun run build
cd ~/.opencode
bun install --force
```
