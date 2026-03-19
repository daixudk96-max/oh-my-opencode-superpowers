# Findings: Sync Upstream 20260319

## 上游变更概览

- **Commits**: 589
- **Files changed**: 2619
- **Insertions**: 58,857
- **Deletions**: 358,110（净删除 ~30 万行，上游做了大规模清理/重构）

## 真实冲突分析（基于 oh-my-opencode-update 已有 merge）

**冲突总数**: 43 个文件

### 冲突模式分类

#### 模式 A: 上游模块化重构（内联实现 → re-export）— 16 个文件

上游将 hook/tool 的 `index.ts` 从完整实现改为只做 re-export（`export { createXxxHook } from "./hook"`），实现代码移到独立文件。HEAD 仍是内联实现。

| 文件 | 冲突块数 | 说明 |
|------|:--------:|------|
| `src/hooks/atlas/index.ts` | 1 | HEAD=完整实现, upstream=re-export |
| `src/hooks/ralph-loop/index.ts` | 1 | 同上 |
| `src/hooks/start-work/index.ts` | 1 | 同上 |
| `src/hooks/rules-injector/index.ts` | 1 | 同上 |
| `src/hooks/prometheus-md-only/index.ts` | 1 | 同上 |
| `src/hooks/keyword-detector/index.ts` | 1 | 同上 |
| `src/hooks/interactive-bash-session/index.ts` | 1 | 同上 |
| `src/hooks/anthropic-context-window-limit-recovery/index.ts` | 1 | 同上 |
| `src/hooks/compaction-context-injector/index.ts` | 1 | 同上 |
| `src/tools/background-task/tools.ts` | 1 | HEAD=内联, upstream=模块化导出 |
| `src/tools/delegate-task/executor.ts` | 1 | HEAD=内联, upstream=re-export |
| `src/tools/lsp/constants.ts` | 1 | HEAD=内联常量, upstream=re-export |
| `src/features/opencode-skill-loader/loader.ts` | 1 | HEAD=内联, upstream=模块化 |
| `src/features/opencode-skill-loader/skill-content.ts` | 1 | HEAD=内联, upstream=模块化 |
| `src/cli/index.ts` | 1 | HEAD=完整CLI, upstream=`runCli()` |
| `src/cli/install.ts` | 2 | HEAD=丰富安装器, upstream=`runTuiInstaller` |

**解决策略**: 接受 upstream 的 re-export 结构。检查上游是否已有对应的实现文件（`./hook.ts`、`./xxx-hook.ts`）。如果 HEAD 有下游专属修改（如 atlas 的自定义逻辑），在上游实现文件的基础上补回。

#### 模式 B: 核心注册文件（下游扩展 vs 上游重构）— 8 个文件

这些是最高风险的文件，两侧都有大量改动。

| 文件 | 冲突块数 | HEAD 特点 | Upstream 特点 |
|------|:--------:|-----------|--------------|
| `src/index.ts` | 6 | 手动 hook 注册 + isHookEnabledLoose | 工厂模式 createHooks/createManagers |
| `src/hooks/index.ts` | 2 | 导出大量下游 hook | 精简导出 + 新 hook |
| `src/features/builtin-skills/skills.ts` | 1 | 内联 skill 定义 + 缓存 | 从 `./skills/` 模块导入 |
| `src/features/builtin-commands/commands.ts` | 4 | 扩展命令列表 | 精简命令集 |
| `src/features/builtin-commands/types.ts` | 1 | 大量命令名联合类型 | 精简 8 个命令 |
| `src/agents/sisyphus.ts` | 2 | "先检查 skills" 步骤 | "意图表述" + 并行化规则 |
| `src/config/schema.ts` | 1 | 内联 zod schema | 从 `./schema/*` 模块导出 |
| `src/plugin-handlers/config-handler.ts` | 1 | 详细日志 + config 组装 | 精简日志 |

**解决策略**: 接受 upstream 结构为基础，逐一补回下游注册行（hook imports、skill 条目、command 条目）。`src/index.ts` 最复杂，需要理解上游工厂模式后插入下游 hook 调用。

#### 模式 C: 小幅分歧（import/export/常量）— 11 个文件

| 文件 | 冲突块数 | 说明 |
|------|:--------:|------|
| `src/shared/index.ts` | 1 | HEAD=1 个导出, upstream=大量新导出 |
| `src/shared/model-availability.ts` | 1 | import 路径差异 |
| `src/shared/model-requirements.ts` | 1 | model fallback 列表差异 |
| `src/shared/model-resolution-pipeline.ts` | 2 | 过滤逻辑差异 |
| `src/shared/session-utils.ts` | 1 | agent 检查方式差异 |
| `src/shared/tmux/tmux-utils.ts` | 1 | HEAD=isInsideTmux, upstream=pane-dimensions |
| `src/hooks/prometheus-md-only/constants.ts` | 1 | 注释差异 |
| `src/features/opencode-skill-loader/async-loader.ts` | 1 | import 差异 |
| `src/features/background-agent/manager.ts` | 1 | notification 差异 |
| `src/tools/delegate-task/constants.ts` | 2 | agent 模型映射 + 新增 planFamily |
| `.gitignore` | 1 | ignore 规则合并 |

**解决策略**: 多数接受 upstream + 保留下游专属导出/常量。逐文件快速合并。

#### 模式 D: 测试文件分歧 — 6 个文件

| 文件 | 冲突块数 | 说明 |
|------|:--------:|------|
| `src/hooks/ralph-loop/index.test.ts` | 5 | 完成检测语义差异 |
| `src/hooks/compaction-context-injector/index.test.ts` | 1 | mock 结构差异 |
| `src/tools/delegate-task/tools.test.ts` | 11 | mock/prompt 全面改写 |
| `src/shared/model-availability.test.ts` | 2 | env 变量处理差异 |
| `src/features/builtin-skills/skills.test.ts` | 1 | upstream 新增 playwright 测试 |
| `src/features/builtin-commands/commands.test.ts` | 1 | HEAD=ralph-loop 测试, upstream=handoff 测试 |

**解决策略**: 接受 upstream 测试 + 追加下游专属测试。对于语义冲突（ralph-loop 完成检测），以 upstream 行为为准。

#### 模式 E: CLI/Doctor — 2 个文件

| 文件 | 冲突块数 | 说明 |
|------|:--------:|------|
| `src/cli/doctor/index.ts` | 1 | HEAD=runDoctorWithTests, upstream=runDoctor |
| `src/cli/doctor/types.ts` | 1 | HEAD=DoctorOptions, upstream=SystemInfo |

**解决策略**: 接受 upstream 的新 doctor 结构。

## 冲突块总计

| 模式 | 文件数 | 冲突块总数 | 风险 |
|------|:------:|:---------:|:----:|
| A: 模块化重构 | 16 | 17 | 低-中 |
| B: 核心注册 | 8 | 18 | 极高 |
| C: 小幅分歧 | 11 | 13 | 低 |
| D: 测试 | 6 | 21 | 中 |
| E: CLI/Doctor | 2 | 2 | 低 |
| **合计** | **43** | **71** | — |

## 关键发现

1. **上游最大变化是模块化重构**：16 个文件是同一个模式（内联 → re-export），解决方式统一
2. **核心注册文件（模式 B）占 80% 的风险**：特别是 `src/index.ts`（6 块）和 `commands.ts`（4 块）
3. **上游新工厂模式**：`createHooks`、`createManagers`、`createTools`、`createPluginInterface` 取代手动注册
4. **下游 hook 注册不在 schema enum 中**：统一走 `isHookEnabledLoose`，不影响 config/schema 冲突

## 技术决策

- 接受上游版本为基础，补回下游注册行（不拒绝上游变更）
- hooks.ts schema 不补回下游 enum（用 isHookEnabledLoose 绕过）
- 模式 A 全部接受 upstream re-export
- 同步完成后重新评估 fix-plan-update-reminder 的 8 个 bug
