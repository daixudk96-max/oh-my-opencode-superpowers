# Learnings: sync-upstream-20260320

## 2026-03-20 - Task 5.1 follow-up Atlas read-only gotcha

- Atlas prompt follow-up 的真正回归点不是所有 `changes/.../tasks.md` 读取示例都必须使用同一个占位符，而是 prompt 是否明确把 plan 标成 `READ ONLY`，以及是否还残留任何允许编辑/勾选 plan checkbox 的说明。
- 因此测试应强断言 `- Plan: \`changes/{name}/tasks.md\` (READ ONLY)` 和“禁止编辑 checkbox”语义；对于 `Read("changes/{name}/tasks.md")` / `Read("changes/{plan-name}/tasks.md")` 这类读取示例，允许两种 downstream placeholder 共存更稳妥。

- Ralph-loop completion transcript parsing should treat unreadable files and malformed JSONL lines as non-fatal by returning `null`/`false` from tiny helpers, which preserves completion scanning without reintroducing empty catches or extra log noise.
