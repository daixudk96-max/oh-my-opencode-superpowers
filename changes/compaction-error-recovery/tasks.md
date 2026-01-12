# Tasks: compaction-error-recovery

## Phase 1: Research & Design

- [x] 1.1 Analyze opencode core compaction flow (compaction.ts, processor.ts)
- [x] 1.2 Identify error detection points and event types
- [x] 1.3 Document the failure chain: API timeout → error → no continue

## Phase 2: Implementation

- [x] 2.1 Create `src/hooks/compaction-error-recovery/index.ts` skeleton
- [x] 2.2 Implement `session.error` event listener for compaction errors
- [x] 2.3 Add compaction error detection logic (check if error occurred during compaction)
- [x] 2.4 Implement toast notification for user feedback
- [x] 2.5 Add retry mechanism with configurable delay (default 10s)
- [x] 2.6 Implement graceful fallback (send manual continue prompt)

## Phase 3: Integration

- [x] 3.1 Export hook from `src/hooks/index.ts`
- [x] 3.2 Integrate hook in `src/index.ts`
- [x] 3.3 Add hook name in `src/config/schema.ts`

## Phase 4: Build & Test

- [x] 4.1 Build the plugin
- [x] 4.2 Reinstall in `~/.opencode`
- [ ] 4.3 Manual test with slow API scenario

---

**Legend**:
- `[ ]` = Pending
- `[x]` = Complete
- `[~]` = In Progress
- `[-]` = Skipped
