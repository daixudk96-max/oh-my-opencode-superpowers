# Tasks: add-contract-lock-workflow

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Phase 1: tdd-guard Extension

### Task 1.1: Add .contract.ts to tdd-guard test patterns <!-- Risk: Tier-3 -->

**Description:**
Extend tdd-guard's TypeScript test patterns to recognize `.contract.ts` files as test files.

**Files:**
- Modify: `src/hooks/tdd-guard/constants.ts` — add `/\.contract\.tsx?$/` to testPatterns
- Modify: `src/hooks/tdd-guard/tdd-guard.test.ts` — add test cases

**Status:** ✅ Complete

---

## Phase 2: contract-lock-preparer Downstream Hook

### Task 2.1: Create contract-lock-preparer hook manifest <!-- Risk: Tier-2 -->

**Description:**
Create downstream hook directory, manifest.ts, and index.ts with factory function.

**Files:**
- Create: `src/downstream/hooks/contract-lock-preparer/manifest.ts`
- Create: `src/hooks/contract-lock-preparer/index.ts`

**Status:** ✅ Complete

---

### Task 2.2: Implement contract-lock-preparer detection logic <!-- Risk: Tier-3 -->

**Description:**
Implement detection: read tasks.md, check Contract Lock fields, check contracts/ directory, inject reminder if missing.

**Files:**
- Modify: `src/hooks/contract-lock-preparer/index.ts`
- Create: `src/hooks/contract-lock-preparer/contract-lock-preparer.test.ts`

**Status:** ✅ Complete

---

### Task 2.3: Regenerate downstream registry <!-- Risk: Tier-1 -->

**Description:**
Run `script/generate-registry.ts` to include new hook.

**Status:** ✅ Complete

---

## Phase 3: contract-lock-writer Skill

### Task 3.1: Create contract-lock-writer skill <!-- Risk: Tier-0 -->

**Description:**
Write `~/.claude/skills/contract-lock-writer/SKILL.md` with contract test generation instructions.

**Status:** ✅ Complete
