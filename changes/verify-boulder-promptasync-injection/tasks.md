# Tasks: verify-boulder-promptasync-injection

> 排查并验证 boulder continuation 的 promptAsync 自动注入是否正常工作。
> 用户报告：boulder 弹出 toast "Boulder Continuation" 但不自动继续（停留在输入框）。
> 核心问题：toast 弹出说明进入了 `injectBoulderContinuation`，但 `promptAsync` 可能失败。
> 所有功能必须有 Mode 1 或 Mode 2 真实触发验证，无例外。

---

## 调用链分析

```
session.idle
  → continuation-max-retries-wrapper (promptFailureCount < 5?)
    → boulder-gating-wrapper (inBoulderSession && hasActivePlan?)
      → event-handler.ts (isBoulderSession || isBackgroundTask?)
        → agent 匹配检查 (lastAgent == boulderAgent?)
          → plan 完成检查 (progress.isComplete?)
            → cooldown 检查 (5s)
              → injectBoulderContinuation()
                → showToast ✅ (用户已观察到)
                → resolveRecentPromptContextForSession() ← 可能失败点 1
                → resolveInheritedPromptTools() ← 可能失败点 2
                → promptAsync() ← 可能失败点 3
```

## 排查目标

| 检查点 | 文件:行 | 可能失败原因 |
|--------|---------|-------------|
| resolveRecentPromptContext | recent-model-resolver.ts:19 | session.messages API 返回空或异常 |
| model 解析 | recent-model-resolver.ts:33 | model.providerID/modelID 缺失 |
| resolveInheritedPromptTools | shared/index.ts | tools 格式不兼容 |
| promptAsync 调用 | boulder-continuation-injector.ts:65 | API 签名变更 / session ID 过期 |
| catch 分支 | boulder-continuation-injector.ts:78-86 | promptFailureCount 递增，下次被 max-retries 拦截 |

---

## Session 0: Setup — 日志和环境准备

### Task V-0.1: 确认 atlas hook 已注册并启用 [x]

**Do**:
1. `grep -n "createAtlasHook\|atlas" src/plugin/hooks/create-continuation-hooks.ts | head -20`
2. 确认 atlas hook 在 plugin 初始化中被创建
3. 检查 `~/.config/opencode/oh-my-opencode.json` 中 atlas 未被 disabled

**Acceptance**: atlas hook 已注册，未被 disabled

### Task V-0.1-record: 记录 atlas 注册状态 [ ]

---

### Task V-0.2: 确认 boulder.json 状态正确 [x]

**Do**:
1. `cat .sisyphus/boulder.json`
2. 检查是否有 `session_ids` 字段
3. 检查 `active_plan` 是否指向有效文件
4. 检查 plan 中是否有未完成的 task

**Acceptance**: boulder.json 有 active_plan + session_ids + plan 有未完成 task

**关键排查点**: 如果 `session_ids` 为空或不包含当前 session ID，boulder-gating-wrapper 会直接 return，导致 toast 不弹出。
但用户已观察到 toast → 说明至少进入了 `injectBoulderContinuation`，所以 gating 已通过。

### Task V-0.2-record: 记录 boulder.json 状态 [ ]

---

## Session 1: Mode 1 — 真实 CLI 日志排查 <!-- Mode: 1 -->

> 这是核心排查 session。必须在真实 OpenCode CLI 中操作，通过日志定位 promptAsync 失败原因。

### Task V-1.1: 启动 boulder 并观察日志 [ ] <!-- Mode: 1 -->

**Trigger**: `session.idle` — boulder continuation 全链路
**Do**: [Mode 1]
1. 确保 `.sisyphus/boulder.json` 有 active_plan 且 plan 有未完成 task
2. 启动 CLI: `OPENCODE_DEBUG=1 opencode`（或项目的启动方式）
3. 发送一条简单消息（如 "echo hello"）
4. 等 AI 回复完毕后**静等 30 秒**
5. 观察：
   a. 是否弹出 "Boulder Continuation" toast？
   b. toast 弹出后是否自动发了新消息（promptAsync 成功）？
   c. 还是 toast 弹出后停留在输入框（promptAsync 失败）？
6. 退出 CLI 后**立即检查日志**:
   ```bash
   grep -i "boulder" ~/.opencode/logs/oh-my-opencode.log | tail -30
   ```

**Expected**:
- [ ] 日志中有 `[atlas-hook] Injecting boulder continuation`
- [ ] 日志中有 `[atlas-hook] Boulder continuation injected`（成功）
  - 或有 `[atlas-hook] Boulder continuation failed`（失败）+ error 详情
- [ ] 如果失败，error 字段包含具体原因

**Pass**: promptAsync 成功（日志有 "injected"，CLI 自动继续）
**Fail**: promptAsync 失败（日志有 "failed"，停留在输入框）

**关键证据**: 如果 FAIL，必须抄录日志中 `"Boulder continuation failed"` 后面的 error 字段全文

---

### Task V-1.1-record: 记录 boulder 日志排查结果 [ ]
将 V-1.1 结果追加到 findings.md（日志全文 + 成功/失败判定）和 progress.md。

**⚠️ 降级检测清单**：
- [ ] 我是在真实 CLI 中操作的？
- [ ] 我观察到的是 CLI 行为？
- [ ] 我查看了真实日志文件？

---

### Task V-1.2: 检查 resolveRecentPromptContext 返回值 [ ] <!-- Mode: 1 -->

**Trigger**: 如果 V-1.1 结果为 FAIL，需要进一步排查 model 解析
**Do**: [Mode 1]
1. 在 `src/hooks/atlas/boulder-continuation-injector.ts` 第 62 行后临时添加日志：
   ```typescript
   log(`[${HOOK_NAME}] promptContext`, { model: promptContext.model, tools: !!promptContext.tools })
   ```
2. 重新构建: `bun run build`
3. 重复 V-1.1 操作
4. 检查日志中 promptContext 的内容

**Expected**:
- [ ] promptContext.model 有 providerID 和 modelID
- [ ] 或 promptContext.model 为 undefined（可能导致 promptAsync 失败）

**Pass**: model 解析正常
**Fail**: model 为 undefined 或格式异常

**清理**: 验证后移除临时日志行

---

### Task V-1.2-record: 记录 model 解析排查结果 [ ]
将 V-1.2 结果追加到 findings 和 progress。

---

### Task V-1.3: 检查 promptAsync 参数和 API 调用 [ ] <!-- Mode: 1 -->

**Trigger**: 如果 V-1.2 model 正常但仍失败，排查 promptAsync 本身
**Do**: [Mode 1]
1. 在 `src/hooks/atlas/boulder-continuation-injector.ts` 第 65 行前临时添加：
   ```typescript
   log(`[${HOOK_NAME}] promptAsync params`, {
     sessionID,
     agent: agent ?? "atlas",
     hasModel: !!promptContext.model,
     hasTools: !!inheritedTools,
     promptLength: prompt.length,
   })
   ```
2. 在 catch 块（第 78 行）中添加更详细的错误日志：
   ```typescript
   log(`[${HOOK_NAME}] Boulder continuation failed DETAIL`, {
     errorName: (err as Error)?.name,
     errorMessage: (err as Error)?.message,
     errorStack: (err as Error)?.stack?.split('\n').slice(0, 3).join(' | '),
   })
   ```
3. 重新构建并重复操作
4. 检查日志

**Expected**:
- [ ] 日志显示 promptAsync 的完整参数
- [ ] 错误日志显示具体的 Error name/message/stack

**Pass**: 定位到 promptAsync 失败的具体原因
**Fail**: 仍无法定位（需更深入排查）

**清理**: 验证后移除临时日志行

---

### Task V-1.3-record: 记录 promptAsync 排查结果 [ ]
将 V-1.3 结果追加到 findings 和 progress。

---

### Task V-1.4: 检查 boulder-gating-wrapper 双重检查是否导致阻断 [ ] <!-- Mode: 1 -->

**Trigger**: 备选排查路径 — 如果 toast 实际上也没弹出（用户记忆有误）
**Do**: [Mode 1]
1. 检查日志中是否有：
   - `[atlas-hook] [downstream:boulder-gating] Skipped` → gating wrapper 拦截了
   - `[atlas-hook] Skipped: not boulder or background task session` → event handler 拦截了
   - `[atlas-hook] Skipped: last agent does not match boulder agent` → agent 不匹配
   - `[atlas-hook] Boulder complete` → plan 已完成
   - `[atlas-hook] Skipped: continuation cooldown active` → 5s cooldown
   - `[atlas-hook] Skipped: continuation in backoff after repeated failures` → promptFailureCount >= 2

**Expected**:
- [ ] 定位是哪个检查点拦截了 continuation

**Pass**: 找到被拦截的检查点
**Fail**: 没有任何 "Skipped" 日志（说明根本没收到 session.idle 事件）

---

### Task V-1.4-record: 记录拦截检查点排查结果 [ ]
将 V-1.4 结果追加到 findings 和 progress。

---

## Session 2: Mode 1 — 修复验证（如果发现问题） <!-- Mode: 1 -->

> 如果 Session 1 定位到了具体原因并修复，在此 Session 验证修复效果。

### Task V-2.1: 修复后 boulder continuation 完整验证 [ ] <!-- Mode: 1 -->

**Trigger**: `session.idle` — 修复后的完整链路
**Do**: [Mode 1]
1. 确保修复已应用并重新构建 (`bun run build`)
2. 确保 boulder.json 有 active_plan + session_ids + plan 未完成
3. 启动 CLI
4. 发送消息
5. 等 AI 回复后静等 30 秒

**Expected**:
- [ ] toast 弹出 "Boulder Continuation"
- [ ] **promptAsync 成功**（agent 自动继续下一个 task，无需手动输入）
- [ ] 日志有 `"Boulder continuation injected"` 且无 `"failed"`

**Pass**: toast + 自动继续 + 日志确认 injected
**Fail**: 仍然停留在输入框

---

### Task V-2.1-record: 记录修复验证结果 [ ]
将 V-2.1 结果追加到 findings 和 progress。

**⚠️ 降级检测清单**：
- [ ] 我是在真实 CLI 中操作的？
- [ ] 我观察到 agent 自动继续了？（不是 bun test）
- [ ] 日志中确认 "injected" 而非 "failed"？

---

## Session Final: 汇总

### Task V-3.1: 汇总排查/验证报告 [ ]
- **Do**:
  1. 汇总所有排查结果
  2. 确定根因（model 解析失败 / session ID 不匹配 / API 变更 / gating 拦截 / 其他）
  3. 如有修复，记录修复方案
  4. 更新 progress 为完成

---

## Feature Coverage Index

| Feature | Task ID | Mode | Trigger Action | Observable | 排查目标 |
|---------|---------|:----:|---------------|------------|----------|
| atlas hook 注册确认 | V-0.1 | Setup | 代码检查 | 已注册 | 前置条件 |
| boulder.json 状态 | V-0.2 | Setup | 文件检查 | 有效 | 前置条件 |
| boulder 全链路日志 | V-1.1 | 1 | idle + boulder | injected/failed | 核心排查 |
| model 解析 | V-1.2 | 1 | 临时日志 | promptContext | 失败点 1 |
| promptAsync 参数 | V-1.3 | 1 | 临时日志 | error detail | 失败点 2 |
| gating 拦截检查 | V-1.4 | 1 | 日志搜索 | Skipped 原因 | 备选路径 |
| 修复后验证 | V-2.1 | 1 | idle + boulder | 自动继续 | 修复确认 |
