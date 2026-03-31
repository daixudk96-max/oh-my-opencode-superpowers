# Proposal: add-contract-lock-workflow

## Problem Statement

When creating-changes generates a plan (tasks.md), the plan specifies Contract Lock fields and required reading files, but there is no mechanism to actually generate the contract test files (.contract.ts) before execution begins. Prometheus (the planner) is restricted to markdown-only output and cannot write TypeScript files. Additionally, tdd-guard does not recognize .contract.ts files as test files, so even if contract tests exist, they cannot serve as enforcement gates during implementation.

This creates a gap: plans reference contracts that don't exist, and the execution phase has no hard gate to enforce interface compliance.

## Proposed Solution

Three-part solution, all downstream-safe (100% upstream sync survival):

1. **contract-lock-writer skill** (~/.claude/skills/): Standalone skill that reads tasks.md + docs/, generates contract test files in changes/<name>/contracts/, and verifies they fail (since no implementation exists yet). Called by Sonnet-level agents.

2. **contract-lock-preparer downstream hook** (src/downstream/hooks/): Detects /start-work flow, checks if tasks.md has Contract Lock fields but contracts/ directory is missing, and injects a reminder to run the contract-lock-writer skill first.

3. **tdd-guard extension**: Extend test file recognition to include .contract.ts files so tdd-guard can block edits when contract tests are failing.

- Key approach: Skill + downstream hook + tdd-guard pattern extension
- Scope: contract test generation workflow only; no changes to Prometheus, delegate-task, or core execution
- Estimated effort: small

## Success Criteria

- [ ] contract-lock-writer skill exists and can generate .contract.ts files from tasks.md
- [ ] /start-work detects missing contracts/ and reminds user to run the skill
- [ ] tdd-guard recognizes .contract.ts as test files
- [ ] All changes survive upstream sync (S-level safety)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Skill not called before /start-work | Medium | Medium | contract-lock-preparer hook reminds |
| Contract tests too strict/wrong | Low | Medium | Contracts can be updated if design changes |
| tdd-guard false positives from .contract.ts | Low | Low | Only match files in changes/*/contracts/ |

## Alternatives Considered

### Option 1: Skill + Hook + tdd-guard (Recommended)
- **Pros**: All S-level safe, modular, each part works independently
- **Cons**: Three separate deliverables
- **Why chosen**: Maximum upstream safety, fits existing architecture

### Option 2: Modify start-work.ts directly
- **Pros**: Single file change
- **Cons**: D-level (Deadly) - 0% survival on upstream sync
- **Why not chosen**: Violates upstream-safe-design iron laws

### Option 3: Full runtime evidence-first system (old plan)
- **Pros**: Comprehensive enforcement
- **Cons**: Massive over-engineering (8 tasks, 12+ files) for a workflow discipline problem
- **Why not chosen**: Contract Lock + docs already solve the problem at plan level

## Dependencies

- creating-changes skill (already updated with Contract Lock + docs templates)
- tdd-guard hook (downstream-owned, safe to modify)
- src/downstream/hooks/ auto-discovery mechanism (already exists)
