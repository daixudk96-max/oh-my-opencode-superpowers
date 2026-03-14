# Findings: verify-boulder-promptasync-injection

> 排查 boulder continuation promptAsync 自动注入失败问题。
> 用户报告：toast "Boulder Continuation" 弹出但不自动继续（停留在输入框）。
> 对比：todo-continuation 可以正常自动继续。

## Atlas Hook Registration Verification (2026-03-14)
- `atlas` hook is explicitly registered in `src/plugin/hooks/create-continuation-hooks.ts` (lines 11, 23, 106-116).
- `atlas` hook is not present in `disabled_hooks` in `~/.config/opencode/oh-my-opencode.jsonc`.
- Conclusion: `atlas` hook is registered and active, supporting boulder continuation.

---
