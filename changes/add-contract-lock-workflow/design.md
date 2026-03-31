# Design: add-contract-lock-workflow

## Goal

Enable contract-first TDD by generating .contract.ts files at plan time and enforcing them during execution, all through upstream-safe mechanisms.

## Architecture

Three independent, upstream-safe components that together close the contract enforcement gap:

1. **contract-lock-writer skill** — A Claude skill (`~/.claude/skills/`) that reads tasks.md + docs/, generates `.contract.ts` files in `changes/<name>/contracts/`, and verifies they fail (red phase). Invoked by Sonnet-level agents before execution begins.

2. **contract-lock-preparer hook** — A downstream hook (`src/downstream/hooks/`) that intercepts tool operations during `/start-work` flow. When it detects tasks.md has Contract Lock fields but no `contracts/` directory exists, it injects a reminder message to run the contract-lock-writer skill first.

3. **tdd-guard .contract.ts recognition** — Extends tdd-guard's `LANGUAGE_PATTERNS.typescript.testPatterns` and `isTestFile()` to recognize `.contract.ts` files as test files, so tdd-guard allows editing them and counts them toward enforcement.

Data flow:
```
creating-changes skill (plan time)
  → tasks.md with Contract Lock fields + 必読文件 paths
  → contract-lock-writer skill generates contracts/*.contract.ts
  → /start-work triggers contract-lock-preparer hook (safety net)
  → executing agent implements code
  → tdd-guard recognizes .contract.ts as tests → enforces TDD gate
```

## Tech Stack

- Runtime: Node.js / Bun (existing project runtime)
- Testing: Bun test with co-located `*.test.ts` files
- Skill: Markdown (SKILL.md) — no runtime code
- Hook: TypeScript factory pattern (createXXX)

## File Structure

```
~/.claude/skills/contract-lock-writer/
├── SKILL.md                              # New: skill definition

src/downstream/hooks/contract-lock-preparer/
├── manifest.ts                           # New: hook registration

src/hooks/contract-lock-preparer/
├── index.ts                              # New: hook factory + handler
├── contract-lock-preparer.test.ts        # New: test suite

src/hooks/tdd-guard/
├── constants.ts                          # Modify: add .contract.ts to testPatterns
├── tdd-guard.test.ts                     # Modify: add .contract.ts test cases
```

## Key Decisions

1. **Decision**: Skill lives in `~/.claude/skills/` not in project
   - **Why**: S-level upstream safety (100% sync survival), and skills are user-scoped configuration
   - **Trade-off**: Not version-controlled with the project

2. **Decision**: Downstream hook injects reminder, does not block
   - **Why**: Blocking /start-work on missing contracts is too aggressive; the user might intentionally skip contracts for non-code tasks
   - **Trade-off**: Enforcement is advisory, not mandatory at hook level (tdd-guard handles hard enforcement)

3. **Decision**: Extend existing tdd-guard rather than creating a separate contract-guard hook
   - **Why**: tdd-guard already has the full enforcement pipeline (tier detection, blocking, test execution). Adding .contract.ts recognition is a 1-line change vs duplicating the entire enforcement system.
   - **Trade-off**: Couples contract concept to tdd-guard

4. **Decision**: Contract tests in `changes/<name>/contracts/` not alongside source
   - **Why**: Keeps contracts co-located with the plan (they're plan-time artifacts), separate from execution-time test files
   - **Trade-off**: Non-standard test location requires tdd-guard path awareness
