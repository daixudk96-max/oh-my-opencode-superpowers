# Design: integrate-rtk-token-compression

## Goal

将 rtk token 压缩能力集成到 oh-my-opencode-merge 的 hook 系统中，在命令执行层自动拦截并压缩，实现 60-99% 的 token 节省。

## Architecture

```
OpenCode Agent 发起 Bash 工具调用
  → OMO plugin dispatch (tool-execute-before.ts)
  → hook 链顺序执行:
      1. non-interactive-env-hook  (加 GIT_EDITOR=: 等环境变量)
      2. rtk-rewrite-hook          (加 rtk 前缀) ← 新增
      3. write-existing-file-guard (文件写入保护)
      4. ...其他 hooks
  → 命令执行
  → rtk 压缩后的输出返回
  → tool-output-truncator 进一步截断（如需要）
```

### 数据流

```
input.tool === "bash"
  → output.args.command = "git status"
  → rtk-rewrite-hook:
      → execSync("rtk rewrite \"git status\"")
      → 返回 "rtk git status"
      → output.args.command = "rtk git status"
  → 命令执行: rtk git status
  → 压缩后的输出（~65% token 节省）
```

### 与现有优化的协同

```
                    命令层                    输出层
                ┌─────────────┐        ┌──────────────────┐
Bash command →  │ rtk-rewrite │  →  →  │ tool-output-     │  → LLM
                │ (60-99%     │        │ truncator        │
                │  格式压缩)  │        │ (长度截断)       │
                └─────────────┘        └──────────────────┘
                                            ↓
                                  ┌──────────────────┐
                                  │ preemptive-      │
                                  │ compaction       │
                                  │ (78% 阈值压缩)  │
                                  └──────────────────┘
```

三层优化互补：rtk 压缩格式 → truncator 截长度 → compaction 压上下文。

## Tech Stack

- **Language**: TypeScript (符合 OMO 代码规范)
- **子进程**: Node.js `child_process.execSync`
- **配置**: Zod schema 验证
- **Testing**: Bun test

## File Structure

```
src/hooks/
├── rtk-rewrite/
│   └── rtk-rewrite-hook.ts        # New: hook 实现
src/create-hooks.ts                 # Modify: 注册 rtk hook
```

## Key Decisions

1. **Decision**: 仿照 `non-interactive-env-hook.ts` 模式
   - **Why**: 已验证的 tool.execute.before 修改 output.args.command 模式
   - **Trade-off**: 无，最佳实践

2. **Decision**: 放在 non-interactive-env 之后执行
   - **Why**: non-interactive-env 先加环境变量前缀（如 `GIT_EDITOR=:`），rtk 再包装完整命令
   - **Trade-off**: 无，执行顺序自然合理

3. **Decision**: 启动时一次性检测 rtk 可用性并缓存
   - **Why**: 避免每次命令都检测（`which`/`where` 有 IO 开销）
   - **Trade-off**: 用户在会话中安装 rtk 不会立即生效（可接受）

4. **Decision**: 配置默认启用 (`rtk.enabled: true`)
   - **Why**: 符合 OMO "batteries-included" 理念；rtk 不存在时自动跳过无副作用
   - **Trade-off**: 首次运行会有一次 `which rtk` 检测开销

## Edge Cases

- **rtk 未安装**: 启动时检测 `which rtk` / `where rtk.exe`，缓存结果，不可用则永久跳过
- **命令已有 rtk 前缀**: `rtk rewrite` 自身处理，不重复包装
- **命令链 (`&&`, `||`)**: 委托 `rtk rewrite` 处理
- **non-interactive-env 已修改命令**: rtk 包装完整命令字符串，不冲突
- **空命令**: 跳过处理
- **配置禁用**: `rtk.enabled: false` 时 hook 直接 return

## Open Questions

- [ ] OMO 是否有 hook 级别的启用/禁用配置模式？→ 可在 hook 内部判断
- [ ] rtk rewrite 在 Windows 上的 .exe 后缀是否需要显式指定？→ `which`/`where` 会自动处理
