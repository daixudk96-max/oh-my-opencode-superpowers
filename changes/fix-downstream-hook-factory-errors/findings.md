# Findings

## Requirements
- Fix runtime errors caused by incorrect dependency injection into hook factories (`bootstrapDownstreamHooks`).
- Specifically address errors related to `backgroundManager` and `pluginConfig` being undefined.
- Prevent double-registration of hooks that exist in both the manual upstream system and the downstream auto-registry.

## Research Findings
- The core issue is that certain complex hooks (`background-notification`, `background-compaction` [aka preemptive-compaction], `unstable-agent-babysitter`, `atlas`) are manually instantiated in files like `create-continuation-hooks.ts` with their correct dependencies.
- However, because they *also* have manifests in the `src/hooks` directory, the downstream auto-registry picks them up and tries to initialize them again using `manifest.factory(hookFactoryContext as never)`. Since `hookFactoryContext` lacks the specialized dependencies, they crash.
- User preferred the simpler "Exclude List" approach over refactoring the entire Dependency Injection context, as it directly solves the double-registration problem without requiring widespread changes to factory signatures.

## Technical Decisions
- Implement an `EXTERNALLY_MANAGED_HOOKS` exclude list in `src/downstream/runtime-hook-executor.ts` to skip auto-registering hooks that are already handled by the legacy manual initialization.

## Issues Encountered
- (To be updated during execution)

## Resources
- Related files: `src/downstream/runtime-hook-executor.ts`