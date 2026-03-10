# Tasks: integrate-rtk-token-compression

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Phase 1: Hook 实现

### Task 1.1: 创建 rtk-rewrite hook <!-- Risk: Tier-3 -->

**Description:**
在 OMO 的 hook 系统中实现 rtk 命令重写 hook，使用 `tool.execute.before` 事件拦截 Bash 工具调用，参照 `non-interactive-env-hook.ts` 模式。

**Files:**
- Create: `src/hooks/rtk-rewrite/rtk-rewrite-hook.ts`

**Acceptance Criteria:**
- [ ] 实现 `tool.execute.before` 接口，匹配 `input.tool.toLowerCase() === "bash"`
- [ ] 从 `output.args.command` 提取命令字符串
- [ ] 调用 `child_process.execSync("rtk rewrite \"<command>\"")` 获取重写结果
- [ ] 将重写结果写回 `output.args.command`
- [ ] 启动时检测 `rtk` 可用性（`which rtk` / `where rtk.exe`），结果缓存
- [ ] rtk 不可用时静默跳过，不影响命令执行
- [ ] 跨平台兼容（Windows `.exe` 后缀自动处理）
- [ ] 空命令跳过，已有 `rtk` 前缀的命令跳过

**TDD Test Cases:**
1. **Test**: git status 被重写
   - **Given**: tool.execute.before 触发，command = "git status"
   - **When**: hook 执行
   - **Then**: output.args.command = "rtk git status"

2. **Test**: 非 bash 工具被忽略
   - **Given**: input.tool = "edit"
   - **When**: hook 执行
   - **Then**: output.args.command 未修改

3. **Test**: rtk 不可用时直通
   - **Given**: rtk 不在 PATH
   - **When**: hook 执行
   - **Then**: output.args.command 未修改，无异常

4. **Test**: 空命令跳过
   - **Given**: output.args.command = ""
   - **When**: hook 执行
   - **Then**: output.args.command 仍为 ""

5. **Test**: 已有 rtk 前缀不重复
   - **Given**: command = "rtk git status"
   - **When**: hook 执行
   - **Then**: output.args.command 未修改

**Edge Cases:**
- 命令链 (`&&`, `||`, `;`) → 委托给 `rtk rewrite`
- `rtk rewrite` 超时 → catch error，直通
- `rtk rewrite` 返回与原命令相同 → 不修改（避免无意义的重写）

**Dependencies:** None

---

### Task 1.2: 注册 hook 到 OMO hook 系统 <!-- Risk: Tier-2 -->

**Description:**
将 rtk-rewrite hook 注册到 `createCoreHooks` 中，确保正确的执行顺序。

**Files:**
- Modify: `src/create-hooks.ts` — 导入并注册 rtk-rewrite hook

**Acceptance Criteria:**
- [ ] rtk hook 在 `createCoreHooks` 中注册
- [ ] 执行顺序：non-interactive-env → rtk-rewrite → 其他 hooks
- [ ] 不影响现有 hook 的执行

**TDD Test Cases:**
1. **Test**: hook 出现在 core hooks 列表中
   - **Given**: createCoreHooks() 被调用
   - **When**: 返回 hooks 数组
   - **Then**: 包含 rtk-rewrite hook

2. **Test**: hook 在 non-interactive-env 之后
   - **Given**: hooks 数组
   - **When**: 检查 rtk-rewrite 位置
   - **Then**: 索引大于 non-interactive-env

**Edge Cases:**
- createCoreHooks 参数变化 → hook 构造函数适配

**Dependencies:** Task 1.1

---

## Phase 2: 配置与文档

### Task 2.1: 添加配置项 <!-- Risk: Tier-1 -->

**Description:**
在 OMO 配置 schema 中添加 rtk 相关配置项。

**Files:**
- Modify: OMO 配置 schema 文件 — 添加 `rtk` 配置段

**Acceptance Criteria:**
- [ ] `rtk.enabled` (boolean, 默认 true)
- [ ] `rtk.path` (string, 可选, 指定 rtk 可执行文件路径)
- [ ] Zod schema 验证通过
- [ ] hook 读取配置并据此决定是否执行

**TDD Test Cases:**
1. **Test**: 默认配置启用 rtk
   - **Given**: 无自定义配置
   - **When**: 读取 rtk.enabled
   - **Then**: true

2. **Test**: 用户禁用 rtk
   - **Given**: 配置 `"rtk": { "enabled": false }`
   - **When**: hook 检查
   - **Then**: 跳过执行

3. **Test**: 自定义 rtk 路径
   - **Given**: 配置 `"rtk": { "path": "/usr/local/bin/rtk" }`
   - **When**: hook 调用 rtk
   - **Then**: 使用指定路径

**Edge Cases:**
- 配置的路径不存在 → 回退到 PATH 搜索 → 不可用则跳过

**Dependencies:** Task 1.1

---

### Task 2.2: 编写文档 <!-- Risk: Tier-0 -->

**Description:**
编写 rtk 集成的用户文档。

**Files:**
- Create: `changes/integrate-rtk-token-compression/README.md`

**Acceptance Criteria:**
- [ ] 前置要求（如何安装 rtk）
- [ ] 配置说明
- [ ] 验证方法（如何确认 rtk 生效）
- [ ] 禁用方法
- [ ] Token 节省预期表格

**Dependencies:** Task 2.1

---

## Phase 3: 测试

### Task 3.1: 端到端测试 <!-- Risk: Tier-3 -->

**Description:**
在 OMO 环境中端到端验证 rtk hook 集成。

**Files:**
- Create: `changes/integrate-rtk-token-compression/e2e-test.md`

**Acceptance Criteria:**
- [ ] OMO 启动时 rtk hook 正确注册
- [ ] Bash 命令被 rtk 重写
- [ ] 禁用配置后 hook 不生效
- [ ] 与 non-interactive-env、tool-output-truncator 无冲突
- [ ] `rtk gain` 显示 token 节省统计

**Dependencies:** Task 1.2, Task 2.1

---

### Task 3.2: 向 oh-my-opencode-merge 提交 PR <!-- Risk: Tier-2 -->

**Description:**
将实现作为 PR 提交到 oh-my-opencode-merge 仓库。

**Files:**
- 所有 Phase 1 + Phase 2 中创建/修改的文件

**Acceptance Criteria:**
- [ ] PR 包含完整实现和测试
- [ ] 符合 OMO 代码规范（TypeScript, ESM）
- [ ] PR 描述包含 token 节省数据

**Dependencies:** Task 3.1

---

## Legend

- `[ ]` = Pending
- `[x]` = Complete
- `[~]` = In Progress
- `[-]` = Skipped

## Risk Tiers

| Tier | Description | TDD Requirement |
|------|-------------|-----------------|
| **0** | Always allowed (docs, comments) | None |
| **1** | Allowed with logging | None, logged |
| **2** | Require failing test OR exemption | Test or exemption |
| **3** | Strict TDD (core logic) | Mandatory test first |
