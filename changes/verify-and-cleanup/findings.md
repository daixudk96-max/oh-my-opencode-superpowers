
## Legacy Path Migration (Task 2.3)
- Successfully updated prompt strings, log messages, and comments from `.sisyphus/` to `changes/` for all change-management related artifacts.
- Updated core hooks (`prometheus-md-only`, `write-existing-file-guard`, `start-work`) to support the new `changes/` directory structure while maintaining backward compatibility for legacy `.sisyphus/plans/` where appropriate.
- Robust path matching was implemented using regex to handle cross-platform separators.
- Verified that system data (e.g., `boulder.json`) remains in `.sisyphus/` as intended.
- Fixed duplicated plan names in `findPrometheusPlans` by implementing a deduplication Map prioritizing the new format.
- All relevant tests in `src/hooks/start-work/`, `src/hooks/prometheus-md-only/`, `src/hooks/write-existing-file-guard/`, and `src/agents/momus.test.ts` are passing.
- Completed cleanup of D-class (Documentation/Comments) references in command templates (`status.ts`, `revert.ts`).
- Standardized prompt templates across Prometheus and Atlas to use `changes/{name}/tasks.md` and `changes/{name}/proposal.md`.
- Verified that all B/D class references are cleared from `src/`, with remaining `.sisyphus` matches limited to Category A (runtime) or explicit legacy support/testing.
- Fixed a bug where identical plans found in both `changes/` and `.sisyphus/plans/` were listed as multiple plans.
- Validated all fixes with targeted test runs.
- Confirmed that `isSisyphusPath` utility now correctly handles both legacy and new paths.
