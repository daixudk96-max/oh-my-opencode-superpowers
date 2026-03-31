# Findings: add-contract-lock-workflow

## Requirements

- Contract tests (.contract.ts) must be generated at PLAN TIME, not execution time
- tdd-guard must recognize .contract.ts files as test files
- A downstream hook must remind users to generate contracts before execution
- A standalone skill must enable Sonnet-level agents to write contract tests
- All changes must be upstream-safe (S-level or downstream-owned)

## Research Findings

### tdd-guard Test Pattern System
- `LANGUAGE_PATTERNS.typescript.testPatterns` had 3 patterns: `.test.tsx?`, `.spec.tsx?`, `__tests__/`
- Adding `.contract.tsx?` was a single regex addition. `isTestFile()` already iterates all patterns.

### Downstream Hook Registration
- Hooks registered via `manifest.ts` in `src/downstream/hooks/<name>/`, discovered by `script/generate-registry.ts`
- Pattern: create directory + manifest.ts + index.ts, then regenerate registry

### Hook Message Injection Pattern
- Hooks inject messages via `output.messages.push({ role: "system", content: "..." })`

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Skill location | `~/.claude/skills/` | S-level upstream safety |
| Hook behavior | Advisory reminder | Too aggressive to block all ops |
| tdd-guard approach | Extend existing patterns | 1-line change vs new hook |
| Contract location | `changes/<name>/contracts/` | Co-located with plan |
