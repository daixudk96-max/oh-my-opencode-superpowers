# Change: compaction-error-recovery

> Workaround for compaction failures caused by slow API responses

## Why

When API responses are slow or timeout during compaction:
1. Compaction process fails silently
2. Auto-continue message is not sent (because `processor.message.error` exists)
3. Model cannot read the compaction summary
4. TODO list becomes invisible to the model
5. User's "continue" command has no response

This is a core opencode issue, but we can implement a workaround in oh-my-opencode.

## What Changes

Add error recovery mechanism for compaction failures:
1. Listen to `session.error` events during compaction
2. Detect compaction-related errors
3. Implement retry logic or graceful degradation
4. Ensure session can continue even after compaction failure

## Impact

- **Affected specs**: None (new feature)
- **Affected code**: 
  - `src/hooks/compaction-error-recovery/index.ts` (new)
  - `src/index.ts` (integration)
- **Risk tier**: 1 (low risk - additive change, no modification to existing logic)

## Success Criteria

- [ ] Compaction errors are detected and logged
- [ ] Session can continue after compaction failure
- [ ] User is notified of compaction failure via toast
- [ ] Retry mechanism attempts compaction again after delay
- [ ] Graceful fallback if retry also fails
