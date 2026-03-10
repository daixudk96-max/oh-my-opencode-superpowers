# Findings: verify-c5-guideline-anchoring

> 每个 Task 完成后追加结果。

## 预审发现（代码探索阶段）

### 组件注册链路

| 组件 | 路径 | 注册位置 | 生命周期 |
|------|------|---------|---------|
| slop-detector | `src/shared/slop-detector.ts` | 被 behavior-anchor 调用 | N/A（纯函数） |
| behavior-anchor | `src/hooks/behavior-anchor/index.ts` | `src/index.ts:208-210` | `tool.execute.after` (`src/index.ts:468-471`) |

### slop-detector 检测规则

| 规则 | 阈值 | 触发方式 |
|------|------|---------|
| 过度注释 | commentThreshold: 0.5 | 注释行 > 50% |
| 冗长解释 | verboseLengthThreshold: 500 | 代码块前文字 > 500 字符 |
| 重复代码 | repetitionThreshold: 0.3 | 重复行 > 30% |

### 关键实现细节

- behavior-anchor 使用 `isHookEnabledLoose`（宽松匹配）实例化
- hook 内部维护 `round` 计数器，每次 tool.execute.after 递增
- 注入条件：`isSlop === true` OR `round % refreshInterval === 0`（默认 10）
- guidelines 直接追加到 `output.output`（agent 可见）

### 已知 changes 状态

- `changes/c5-guideline-anchoring/findings.md` 存在但为空
- `changes/c5-guideline-anchoring/tasks.md` 不存在
- 表明该功能从未被系统化验证过

---

### behavior-anchor Hook 启用状态确认 (Task V-0.1)

- **配置检查**:
    - `.opencode/oh-my-opencode.jsonc`: 未在 `disabled_hooks` 中禁用。
    - `~/.config/opencode/oh-my-opencode.jsonc`: 未在 `disabled_hooks` 中禁用。
- **实例化逻辑**:
    - `src/index.ts` 第 208 行使用 `isHookEnabledLoose("behavior-anchor")` 实例化。
    - `isHookEnabledLoose` 逻辑定义在 `src/index.ts:107`，其行为等同于 `isHookEnabled`，即只要不显式配置在 `disabled_hooks` 中，则默认为启用（返回 `true`）。
- **生命周期连接**:
    - `src/index.ts` 第 468-471 行明确将 `behaviorAnchor?.["tool.execute.after"]` 连接到了插件的 `tool.execute.after` 生命周期。
- **结论**: `behavior-anchor` hook 在当前环境下已被正确实例化并生效（非 null）。

### Task V-1.1: slop-detector — 单元测试 (Findings)
- **Status**: PASS
- **Test Command**: `bun test src/shared/slop-detector.test.ts`
- **Results**: 5 tests passed, 0 failed, 10 expect() calls.
- **Coverage Verified**:
    - [x] Excessive comments (`detecting excessive comments`)
    - [x] Verbose explanations (`detecting verbose explanations`)
    - [x] Repetitive code (`detecting repetitive code`)
- **Additional Verification**:
    - [x] Periodic guideline anchoring (injects every 5 rounds)
    - [x] Sensitivity configuration (custom thresholds support)
- **Observations**: The `slop-detector` effectively identifies patterns based on the provided `SlopConfig`. Periodic injection ensures guidelines are reinforced even in "clean" sessions.
### Task V-2.4: behavior-anchor — 正向触发（重复代码检测） (Findings)
- **Status**: PASS
- **Test File**: `E:/github/oh-my-opencode-merge/.sisyphus/worktrees/verify-c5-guideline-anchoring/test-slop-repetitive.ts`
- **Method**: Created a TypeScript file with 7 identical `console.log("hello");` lines out of 10 non-empty lines (70% repetition), exceeding the 30% threshold.
- **Trigger Verified**:
    - [x] `write` tool execution triggered the `slop-detector` inside the `behavior-anchor` hook.
    - [x] Slop detector correctly identified "repetitive code" pattern.
    - [x] Guidelines were appended to the `write` tool success message.
- **Injected Content**:
    ```text
    ---
    [BEHAVIOR ANCHOR]
    You are producing output that may contain slop patterns. Adhere to these guidelines:
    - Minimize comments - code should be self-documenting
    - Be concise - avoid verbose explanations before code
    - Avoid repetitive patterns - each line should add unique value
    - Match the codebase's existing style
    ---
    ```
- **Observations**: The `slop-detector`'s `repetitionThreshold` of 0.3 was easily triggered by the repetitive `console.log` statements. The cleanup was performed immediately after verification.

### Task V-2.5: behavior-anchor — refreshInterval 机制验证 (Findings)
- **Status**: PASS
- **Method**: Executed 10 consecutive `ls` commands through a single `bash` call to increment the internal round counter.
- **Trigger Verified**:
    - [x] The 10th tool call (the 10th `ls` or the completion of the `bash` call if counted as rounds) triggered the periodic injection.
    - [x] Verified that the `behavior-anchor` guidelines were appended to the tool output.
    - [x] Injection occurred despite NO slop patterns being present in the command or output.
- **Injected Content**:
    ```text
    ---
    [BEHAVIOR ANCHOR]
    You are producing output that may contain slop patterns. Adhere to these guidelines:
    - Minimize comments - code should be self-documenting
    - Be concise - avoid verbose explanations before code
    - Avoid repetitive patterns - each line should add unique value
    - Match the codebase's existing style
    ---
    ```
- **Observations**: The `refreshInterval` mechanism successfully provides a "periodic reminder" to the agent every 10 rounds, ensuring continuous alignment with behavior guidelines even in clean sessions.

### Task V-2.3: behavior-anchor — 正向触发（冗长解释检测） (Findings)
- **Status**: PASS
- **Test File**: `E:/github/oh-my-opencode-merge/.sisyphus/worktrees/verify-c5-guideline-anchoring/verbose.txt`
- **Method**: Created a text file with a verbose preamble (>500 characters) before the first code block.
- **Trigger Verified**:
    - [x] `read` tool output for the verbose file triggered the `slop-detector` inside the `behavior-anchor` hook.
    - [x] Slop detector correctly identified "verbose explanations" pattern.
    - [x] Guidelines were appended to the `read` tool result.
- **Injected Content**:
    ```text
    ---
    [BEHAVIOR ANCHOR]
    You are producing output that may contain slop patterns. Adhere to these guidelines:
    - Minimize comments - code should be self-documenting
    - Be concise - avoid verbose explanations before code
    - Avoid repetitive patterns - each line should add unique value
    - Match the codebase's existing style
    ---
    ```
- **Observations**: The `slop-detector` counts characters before the first triple backtick code block. The test file had ~1000 characters of explanation text, which effectively triggered the anchor.
