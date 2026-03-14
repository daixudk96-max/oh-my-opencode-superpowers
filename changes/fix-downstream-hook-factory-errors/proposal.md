# Proposal: Fix Downstream Hook Factory Errors

## Problem Statement
When upstream adds a new hook or skill, and downstream also adds a new one, both need to be able to start simultaneously without errors. Currently, `bootstrapDownstreamHooks` rigidly passes `hookFactoryContext` (typed as `PluginInput`) to all hook factories. However, certain hooks (e.g., `background-notification`, `preemptive-compaction`, `unstable-agent-babysitter`) require specific dependencies like `BackgroundManager` or `pluginConfig`.

These specific hooks are already correctly managed and registered by the "old" upstream system (e.g., in `create-continuation-hooks.ts`), which properly injects the required dependencies. The issue occurs because the downstream automated registry *also* tries to load these hooks via their downstream manifests without providing the needed dependencies. This double-registration attempt results in runtime crashes, specifically errors like `manager.handleEvent is not a function` or `pluginConfig.agents is undefined`.

## Proposed Solution
Instead of over-engineering a complex unified dependency injection context, we will simply prevent the downstream auto-registry from attempting to initialize hooks that are already explicitly managed by the upstream system. We will define an exclude list (`EXTERNALLY_MANAGED_HOOKS`) in `bootstrapDownstreamHooks`. Any hook whose name is in this list will be skipped by the downstream bootstrapper, allowing the upstream system to handle it correctly with its required dependencies.

## Success Criteria
- Logs no longer show `manager.handleEvent is not a function`.
- Logs no longer show `pluginConfig.agents is undefined`.
- Logs no longer show `options.backgroundManager is undefined`.
- Both upstream and downstream hooks can start simultaneously without errors.
- Double-registration of hooks like `background-notification` is prevented.
- No new regressions are introduced in tests (`bun test`).

## Risk Assessment
- **Risk:** We might accidentally exclude a hook that *should* be managed downstream, causing it not to load at all.
- **Mitigation:** The exclude list will be strictly limited to hooks we have verified are already being loaded and injected with dependencies in `create-*-hooks.ts`.

## Alternatives Considered
- **Extend HookFactoryContext:** Modify `HookFactoryContext` and all hook manifests to expect correct dependencies. Rejected because it requires touching many files, modifies factory signatures unnecessarily, and doesn't solve the core issue of double-registration where the same logic is executed twice. The exclude list is simpler and keeps existing hook implementations intact.