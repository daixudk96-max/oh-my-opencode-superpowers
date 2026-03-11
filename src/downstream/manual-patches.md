# Manual Patches (U-level): `.sisyphus` cleanup backlog

This file tracks U-level upstream-touching cleanup items that are **not suitable for wrapper-based migration** and must be handled via upstream PRs or manual follow-up after sync.

## Scope

- Goal: reduce legacy `.sisyphus/*` path coupling where `changes/*` is the canonical plan/change workspace.
- Source: static scan for `\.sisyphus` references in `src/`.
- Rule: runtime behavior first, prompts/templates second, tests/docs last.

## Priority legend

- **P0 (High)**: runtime logic/path constants impacting behavior
- **P1 (Medium)**: prompts/templates/policies that steer agent behavior
- **P2 (Low)**: tests/docs/comments, verify-only updates

---

## P0 — Runtime path behavior (apply first)

| File | Line(s) | Current | Recommended action |
|---|---:|---|---|
| `src/hooks/start-work/index.ts` | 17 | `PROMETHEUS_PLANS_DIR = ".sisyphus/plans"` | Introduce dual-path resolver (prefer `changes/*/tasks.md`, fallback legacy). |
| `src/hooks/start-work/start-work-hook.ts` | 203 | Error copy points to `.sisyphus/plans/` | Update runtime messaging to canonical `changes/` path. |
| `src/features/run-continuation-state/constants.ts` | 1 | Marker dir fixed to `.sisyphus/run-continuation` | Add configurable/dual-path storage abstraction. |
| `src/features/boulder-state/constants.ts` | 5 | `BOULDER_DIR = ".sisyphus"` | Keep for state if required, but document split: plans in `changes/`, state in `.sisyphus/` (or migrate state too). |
| `src/hooks/prometheus-md-only/path-policy.ts` | 28 | Requires `.sisyphus` path match | Expand allowlist to canonical `changes/**.md` plan docs (with controlled scope). |
| `src/hooks/prometheus-md-only/hook.ts` | 50,57,65,75 | Enforcement/messages tied to `.sisyphus/*.md` | Align policy text and checks with new canonical path rules. |
| `src/hooks/write-existing-file-guard/hook.ts` | 201,203 | Special-case allow for `.sisyphus/**` overwrite | Re-evaluate allowlist to prevent over-broad bypass; scope by file purpose. |

---

## P1 — Agent prompts & behavioral templates

| File | Line(s) | Current | Recommended action |
|---|---:|---|---|
| `src/agents/atlas/default.ts` | 89,135,140,163-165,217,338-339 | Plan/notepad/task instructions use `.sisyphus/*` | Migrate instructions to `changes/{plan}/...` equivalents; keep legacy fallback note if needed. |
| `src/agents/atlas/gpt.ts` | 124,161,174-175,246,317-318 | Same `.sisyphus` guidance | Same migration as above. |
| `src/agents/atlas/gemini.ts` | 106,143,156-157,233,304-305 | Same `.sisyphus` guidance | Same migration as above. |
| `src/agents/atlas/agent.ts` | 131 | TODO path guidance references `.sisyphus/plans` | Replace with `changes/*/tasks.md`. |
| `src/hooks/atlas/verification-reminders.ts` | 46,62,71 | Reminder text/tools target `.sisyphus` plans/notepads | Update reminder templates to canonical `changes/` paths. |
| `src/hooks/atlas/system-reminder-templates.ts` | 9,19-20,39,174,188,194 | Hard policy boundary centered on `.sisyphus/` | Rewrite boundaries for new writable/read-only policy split. |
| `src/agents/prometheus/gpt.ts` | 32,74-75,130,203,269,296,311-312,318,350,395,401,435,440 | Prompt and workflow text anchored to `.sisyphus/plans|drafts|evidence` | Migrate generated plan/draft/evidence paths to `changes/`-based structure and matching cleanup instructions. |
| `src/agents/prometheus/gemini.ts` | 20,66,144,173,204,258,281,294-295,300,305 | Same path assumptions | Same migration as above. |
| `src/agents/prometheus/identity-constraints.ts` | 48-49,112-124,150,174,214,233 | Output constraints enforce `.sisyphus` only | Update hard constraints to canonical destination policy. |
| `src/agents/prometheus/interview-mode.ts` | 316,322,327 | Draft writes in `.sisyphus/drafts` | Switch to `changes/{name}/draft.md` or agreed draft target. |
| `src/agents/prometheus/plan-template.ts` | 10,84,249,258,290,298 | Template emits `.sisyphus/plans|evidence` | Update template outputs and QA evidence location. |
| `src/agents/prometheus/plan-generation.ts` | 30,94,113,186 | Plan generation target `.sisyphus/plans` | Update task text and completion messages. |
| `src/agents/prometheus/behavioral-summary.ts` | 15,22,27-28,69 | Cleanup and role boundary mention `.sisyphus/*` | Align with canonical plan/draft paths and role limits. |
| `src/hooks/keyword-detector/ultrawork/planner.ts` | 14,19,25-26 | Planner instructions limit writes to `.sisyphus/` | Update to new planning directory policy. |
| `src/agents/momus.ts` | 31,109,114-115,119,130-134,154,171,173,185,245 | Legacy `.sisyphus/plans/*.md` still accepted and documented | Keep temporary compatibility but clearly demote and set deprecation removal checkpoint. |

---

## P2 — Tests/docs/comments (follow after behavior alignment)

| File | Line(s) | Current | Recommended action |
|---|---:|---|---|
| `src/hooks/prometheus-md-only/index.test.ts` | multiple (191+ etc.) | Tests assert `.sisyphus`-only behavior | Update tests after policy migration; keep legacy compatibility tests if required. |
| `src/hooks/start-work/index.test.ts` | multiple (30,164...) | Fixtures use `.sisyphus/plans` | Update fixture expectations once resolver finalized. |
| `src/cli/run/completion-continuation.test.ts` | 41,61-62,79-80 | Legacy plan dir fixture | Update with canonical plan path behavior. |
| `src/hooks/write-existing-file-guard/index.test.ts` | 248-249 | `.sisyphus` overwrite allow test | Rebaseline with refined allowlist behavior. |
| `src/hooks/phase-flow-enforcer/index.ts` | 33 | Comment references `.sisyphus/boulder.json` | Keep or revise according to state-file migration decision. |
| `src/hooks/phase-flow-enforcer/index.test.ts` | 114 | Test fixture path `.sisyphus/boulder.json` | Rebaseline if state location changes. |

---

## Suggested rollout

1. **Upstream PR A (P0)**: path resolution + enforcement logic updates.
2. **Upstream PR B (P1)**: agent prompts/templates/policies.
3. **Upstream PR C (P2)**: tests/docs cleanup.

## Notes

- This backlog intentionally records manual/upstream-touching items only.
- Wrapper-compatible behavior fixes remain under `src/downstream/patches/` and should not be mixed into this file.
