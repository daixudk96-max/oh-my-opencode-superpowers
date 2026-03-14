# Design: Exclude Externally Managed Hooks

## Goal
Resolve runtime hook factory errors by preventing the downstream auto-registry from attempting to initialize hooks that require complex dependencies and are already explicitly managed by the upstream hook creation system.

## Architecture
The downstream auto-registry (`bootstrapDownstreamHooks`) discovers all hook manifests. We will intercept this process and filter out specific hooks.

1.  **Exclude List Definition:** Define a constant `EXTERNALLY_MANAGED_HOOKS` (a `Set<string>`) within `bootstrapDownstreamHooks`.
2.  **Filtration:** During the iteration over discovered manifests, check if the `manifest.name` exists in `EXTERNALLY_MANAGED_HOOKS`. If it does, `continue` to the next iteration.
3.  **Logging:** Log a debug message when a hook is skipped, indicating that it is externally managed.

## Tech Stack
- TypeScript
- Node.js / Bun

## File Structure Changes
- **Modified:** `src/downstream/runtime-hook-executor.ts` - Add the `EXTERNALLY_MANAGED_HOOKS` set and the filtering logic inside the `bootstrapDownstreamHooks` loop.

## Key Decisions
- **Hardcoded Exclude List:** We chose a hardcoded exclude list inside `runtime-hook-executor.ts` because the set of legacy, complex-dependency hooks is small and well-known (e.g., `background-notification`, `background-compaction`, `unstable-agent-babysitter`).
- **Skip, Don't Fail:** When an externally managed hook is encountered by the downstream system, it simply skips it without throwing an error, acknowledging that another part of the system is responsible for it.

## Edge Cases
- **Hook Name Changes:** If an externally managed hook's name changes, the exclude list must be updated. This is mitigated by the fact that these are core system hooks whose names rarely change.

## Open Questions
- Are there any other hooks beyond the known 3-4 that are also doubly registered and failing? (Will confirm during task execution).