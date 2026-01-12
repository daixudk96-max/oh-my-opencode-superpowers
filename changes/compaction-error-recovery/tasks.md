# Tasks: compaction-error-recovery

## Phase 1: Research & Design

- [x] 1.1 Analyze opencode core compaction flow (compaction.ts, processor.ts)
- [x] 1.2 Identify error detection points and event types
- [x] 1.3 Document the failure chain: API timeout → error → no continue

## Phase 2: Implementation

- [ ] 2.1 Create `src/hooks/compaction-error-recovery/index.ts` skeleton
- [ ] 2.2 Implement `session.error` event listener for compaction errors
- [ ] 2.3 Add compaction error detection logic (check if error occurred during compaction)
- [ ] 2.4 Implement toast notification for user feedback
- [ ] 2.5 Add retry mechanism with configurable delay (default 10s)
- [ ] 2.6 Implement graceful fallback (send manual continue prompt)

## Phase 3: Integration

- [ ] 3.1 Export hook from `src/hooks/index.ts`
- [ ] 3.2 Integrate hook in `src/index.ts`
- [ ] 3.3 Add configuration option in `OhMyOpenCodeConfig`

## Phase 4: Build & Test

- [ ] 4.1 Build the plugin
- [ ] 4.2 Reinstall in `~/.opencode`
- [ ] 4.3 Manual test with slow API scenario

---

**Legend**:
- `[ ]` = Pending
- `[x]` = Complete
- `[~]` = In Progress
- `[-]` = Skipped
