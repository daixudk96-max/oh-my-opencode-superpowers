# Learnings: fix-b-class-fail-hooks

- 2026-03-16: For hook state deduplication, mark the session only after the final side effect succeeds; otherwise transient failures become sticky and block legitimate retries.
- 2026-03-17: The debugging-injector hook now ships enabled by default, so any future assertions or regressions must target the default config path rather than relying on manual overrides.
- 2026-03-17: Added a dedicated default-config test file so the default-enabled behavior is verified without pushing the main hook test suite past the 200 LOC modularity limit.
