# Design: verify-agent-consolidation-atlas

## Goal

验证 agent-consolidation 引入的 Hephaestus Agent 和 Atlas Agent 在运行时的注册、实例化、路由和行为。

## Architecture — Agent 注册链路

```
src/agents/hephaestus.ts (Hephaestus prompt + factory)
src/agents/atlas/agent.ts (Atlas prompt + factory + 模型路由)
  ↓
src/agents/builtin-agents.ts (注册表 agentSources)
  Line 34: hephaestus: createHephaestusAgent
  Line 43: atlas: createAtlasAgent
  ↓
src/agents/builtin-agents/hephaestus-agent.ts (模型 fallback 链 + 配置解析)
src/agents/builtin-agents/atlas-agent.ts (模型 fallback 链 + 配置解析)
  ↓
src/index.ts:60-197 (OhMyOpenCodePlugin → createBuiltinAgents 动态加载)
  ↓
.opencode/oh-my-opencode.jsonc (运行时模型配置)
  hephaestus → gcl/gemini-3-flash-preview-high
  atlas → gcl/gemini-3-flash-preview-high
```

## 2 个 Agent 详细分析

### 1. Hephaestus Agent

| 属性 | 值 |
|------|-----|
| 路径 | `src/agents/hephaestus.ts` |
| 注册 | `src/agents/builtin-agents.ts:34` |
| 配置 | `src/agents/builtin-agents/hephaestus-agent.ts` |
| 人设 | Senior Staff Engineer — "自主深度工作者" |
| 核心策略 | "Do NOT Ask — Just Do"：禁止请求确认、禁止提前停止 |
| 执行模型 | EXPLORE → PLAN → DECIDE → EXECUTE → VERIFY（5 阶段） |
| 并行能力 | 使用 explore/librarian 子代理 (`run_in_background=true`) |
| 完成保证 | `<turn_end_self_check>` — 100% 解决，需 lsp_diagnostics + test + build |
| maxTokens | 32000 |
| temperature | 默认值 |
| 颜色 | `#D97706`（琥珀色） |
| 测试 | **无** |
| 可观察性 | delegate_task 输出可见 → agent 可观察 |
| 验证模式 | Mode 2 正向 — 派发任务，观察自主执行 |

### 2. Atlas Agent

| 属性 | 值 |
|------|-----|
| 路径 | `src/agents/atlas/` (6 个文件) |
| 注册 | `src/agents/builtin-agents.ts:43` |
| 配置 | `src/agents/builtin-agents/atlas-agent.ts` |
| 人设 | Master Orchestrator — 禁止写代码 |
| 核心策略 | "YOU ARE NOT AN IMPLEMENTER. YOU DO NOT WRITE CODE. EVER." |
| 模型路由 | `getAtlasPromptSource` — GPT / Gemini / Claude 各有专用 prompt |
| QA 协议 | 4-Phase: Read Code → Automated Verify → Hands-on QA → Gate Decision |
| 工具限制 | 只能用 task() / Read / lsp_diagnostics / bash — 禁止 Edit/Write |
| temperature | 0.1 |
| 颜色 | `#10B981`（翠绿色） |
| 触发条件 | Todo list path 或 多任务需多代理编排 |
| Hook | `src/hooks/atlas/index.ts`（任务委派循环引导） |
| 测试 | **无** |
| 可观察性 | 委派输出可见 → agent 可观察 |
| 验证模式 | Mode 2 正向 + 静态检查 |

### 3. agent-consolidation 变更内容

| 变更 | 描述 | 验证方式 |
|------|------|---------|
| 废弃 Implementer Agent | 将 3-phase TDD 纪律合并到 Sisyphus-Junior | 静态检查（grep 残留引用） |
| 术语迁移 | `sisyphus_task` → `delegate_task` | 静态检查（grep 全局） |
| Hook 更新 | failure-counter, planning-flow-guide, atlas hook 中的术语 | 静态检查 |

## Key Decisions

1. Hephaestus 和 Atlas 用 Mode 2 正向触发（通过 delegate_task 派发简单任务）
2. Atlas 多模型路由用静态检查 + bun test 验证 `getAtlasPromptSource` 逻辑
3. agent-consolidation 术语迁移用 Grep 全局搜索验证
4. "Do NOT Ask" 和 "禁止写代码" 等行为约束标记为 AGENT_INVISIBLE（只能在完整会话中观察）

## Edge Cases

- 模型配置无效时 Agent 是否有 fallback
- Atlas 收到只需一步的简单任务时是否仍走 QA 协议
- Hephaestus 子代理（explore/librarian）不可用时的行为
- delegate_task 工具不存在时 Agent 实例化是否失败
