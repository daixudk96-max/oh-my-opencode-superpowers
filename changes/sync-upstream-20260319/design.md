# Design: Sync Upstream 20260319

## Goal

将 589 个上游 commits 合并到下游 dev 分支，保留所有下游功能。

## 上游关键变更分析

### 高影响变更（直接解决我们的 bug）

| 变更 | Commits | 影响 |
|------|---------|------|
| atlas task_sessions | 5c619437, 8859da5f, 8adf6a2c, 3c7e6a39 | 每个 task 独立 session，可复用 |
| todo-description-override | 55ac653e | 改写 TodoWrite 描述，强制 atomic format |
| todo-continuation 改进 | df7e1ae1, 09cfd0b4, 1669c837 | stagnation 检测、dispose 生命周期 |
| atlas 容错 | 521a1f76 | 10 次连续失败才停止 |
| 熔断器重构 | d48ea025, 5d5755f2, 1fdce01f | 滑动窗口 → 连续调用检测 |
| 性能优化 | c2f7d059, 90aa3a30, c5c7ba4e, 7a96a167, 2da19fe6 | regex 预编译、热路径优化 |
| plugin dispose | deaac8cb | 完整 teardown 生命周期 |

### 结构性变更（需要特别处理）

| 文件 | 变更量 | 说明 |
|------|--------|------|
| skills.ts | -2116 行 | 上游可能将 skill 定义移到别处或改为懒加载 |
| index.ts | 330 行变更 | 生命周期事件重构 + dispose |
| commands.ts | -439 行 | 命令模板精简 |
| builtin-agents.ts | 383 行变更 | agent 工厂重构 |
| hooks.ts schema | 152 行变更 | enum 值变更 |

## 冲突热点预判

### 极高风险（需手动合并）

1. **src/index.ts** — 下游在 3 个生命周期事件中注册了大量 hook
   - 策略：接受上游版本 → 按 import/创建/注入 3 区域补回下游代码

2. **src/features/builtin-skills/skills.ts** — 上游删了 2116 行
   - 策略：先看上游新结构，再在正确位置追加下游 skill

3. **src/config/schema/hooks.ts** — 上游 enum 变更
   - 策略：接受上游版本，下游用 isHookEnabledLoose 绕过

### 高风险

4. **src/features/builtin-commands/commands.ts** — 上游精简了命令
5. **src/agents/builtin-agents.ts** — 上游重构了 agent 工厂
6. **src/tools/index.ts** — 上游改了 tool 导出
7. **src/mcp/index.ts** — 上游改了 MCP 服务

### 中风险（上游改了我们也改了的 hook）

8. **src/hooks/atlas/** — 上游加了 task_sessions，我们有自己的修改
9. **src/hooks/todo-continuation-enforcer/** — 上游大量改进
10. **src/features/boulder-state/** — 上游加了 TaskSessionState

### 无风险（下游独立文件）

- src/hooks/debugging-injector/ — 下游独立
- src/hooks/failure-counter/ — 下游独立
- src/hooks/plan-attention-refresher/ — 下游独立
- src/hooks/plan-update-reminder/ — 下游独立
- src/hooks/plan-reorganizer/ — 下游独立
- src/hooks/planning-flow-guide/ — 下游独立
- src/downstream/ — 下游独立
- src/shared/ — 下游独立

## 合并策略

### Phase 1: 快照
- 记录 index.ts 中所有 isHookEnabledLoose 行
- 记录 skills.ts 中所有下游 skill
- 记录 commands.ts 中所有下游命令
- 记录 builtin-agents.ts 中所有下游 agent
- 列出所有下游独立目录

### Phase 2: Merge
- 创建分支 `sync/upstream-20260319`
- `git merge upstream/dev --no-commit`
- 逐个处理冲突

### Phase 3: 补回下游
- 按快照补回所有下游注册行
- 验证下游独立文件完整

### Phase 4: 构建验证
- `bun run build`
- 检查下游 hook 注册数量

## 同步后需要重新评估的 Bug

同步完成后，以下 bug 需要重新评估（上游可能已修复）：

| Bug | 可能被上游修复 | 原因 |
|-----|:---:|------|
| B1: apply_patch 不监听 | ❌ | 上游也没加 apply_patch 支持 |
| B2: output.messages.push 不工作 | ❌ | 这是 OpenCode 运行时限制 |
| B3: boulder-continuation 只传数字 | ⚠️ | task_sessions 改变了续跑方式 |
| B4: debugging-injector 注入不可见 | ❌ | 同 B2 |
| B5: /reset-failures 环境适配 | ❌ | 下游独立功能 |
| B7: plan-attention-refresher 失焦 | ❌ | 下游独立 hook |
| B8: plan-attention-refresher 无 apply_patch | ❌ | 下游独立 hook |
