# Findings: integrate-rtk-token-compression

> **2-Action Rule**: After every 2 browser/view operations, save findings here.

## Requirements

- 在 OMO hook 系统中集成 rtk 命令重写
- 跨平台兼容（Windows + macOS + Linux）
- 可通过配置启用/禁用
- 不影响现有 hooks

## Research Findings

### OMO Hook 系统架构

- **Finding**: OMO 通过 `createHooks` → `createCoreHooks`/`createContinuationHooks`/`createSkillHooks` 注册 hooks
- **Source**: `src/create-hooks.ts`
- **Details**:
  - hooks 在 `src/plugin/tool-execute-before.ts` 中按顺序 dispatch
  - `tool.execute.before` 接口: `(input, output) => Promise<void> | void`
  - `input`: `{ tool: string, sessionID, callID }` (只读)
  - `output`: `{ args: Record<string, unknown>, message?: string }` (可变)

### 参考实现: non-interactive-env-hook.ts

- **Finding**: 最佳参考模式——拦截 bash 命令，修改 `output.args.command`
- **Source**: `src/hooks/non-interactive-env/non-interactive-env-hook.ts`
- **Pattern**:
  ```typescript
  "tool.execute.before": async (input, output) => {
    if (input.tool.toLowerCase() !== "bash") return;
    const command = output.args.command as string | undefined;
    if (!command) return;
    // 修改命令
    output.args.command = `${prefix} ${command}`;
  }
  ```

### rtk rewrite 行为

- **Finding**: `rtk rewrite "<cmd>"` 返回重写后的命令字符串
- **Source**: rtk 功能测试
- **Behavior**:
  - 有 filter: 返回 `rtk <cmd>`
  - 无 filter: 返回原命令
  - 已有 rtk 前缀: 不重复包装

### 三层 Token 优化协同

- **Finding**: rtk + truncator + compaction 三层互补
- **Analysis**:
  - **rtk** (命令层): 压缩输出格式 (60-99%)
  - **truncator** (输出层): 截断过长输出
  - **compaction** (上下文层): 78% 阈值压缩对话
  - 三者无冲突，效果叠加

## Technical Decisions

| Decision | Choice | Rationale | Alternatives |
|----------|--------|-----------|-------------|
| Hook 模式 | tool.execute.before | OMO 标准模式 | tool.execute.after (已晚) |
| 执行顺序 | after non-interactive-env | 环境变量先设置再 rtk 包装 | 最前面 (会被环境变量覆盖) |
| rtk 检测 | 启动时检测并缓存 | 避免每次 IO | 每次检测 (性能差) |
| 默认启用 | true | batteries-included 理念 | false (需用户手动开) |

## Resources

- OMO 源码: `/e/github/oh-my-opencode-merge/`
- 参考 hook: `src/hooks/non-interactive-env/non-interactive-env-hook.ts`
- rtk GitHub: https://github.com/rtk-ai/rtk
