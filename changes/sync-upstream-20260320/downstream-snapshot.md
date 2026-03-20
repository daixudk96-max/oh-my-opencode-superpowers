# Downstream snapshot for sync-upstream-preserve-downstream Phase 1

Generated from `git show HEAD:path` against the downstream `HEAD` side during the in-progress `git merge upstream/dev --no-commit`.

## Scope

- Repository: `E:/github/oh-my-opencode-merge`
- Snapshot date: 2026-03-20
- Source of truth: downstream `HEAD` tree only
- Comparison baseline for downstream-only detection: `upstream/dev`

## 1. `src/index.ts` registration snapshot

- Total `isHookEnabledLoose` occurrences in `HEAD:src/index.ts`: **0**

### `isHookEnabledLoose` occurrences

No `isHookEnabledLoose` references exist in downstream `HEAD:src/index.ts`. Current downstream integration uses `bootstrapDownstreamHooks(...)` and the returned `downstreamHooks` runner methods instead.

### Downstream hook registration / runtime wiring lines

```ts
9: import { bootstrapDownstreamHooks } from "./downstream/runtime-hook-executor";
53: 	const downstreamHooks = await bootstrapDownstreamHooks({
118: 			await downstreamHooks.runChatMessage(input as never, output as never);
122: 			await downstreamHooks.runUserPromptSubmit(
162: 			await downstreamHooks.runEvent(input as never);
172: 			await downstreamHooks.runToolExecuteBefore(
182: 			await downstreamHooks.runToolExecuteAfter(
200: 			await downstreamHooks.runExperimentalSessionCompacting(_input, output);
```

## 2. `src/hooks/index.ts` downstream hook exports

### All hook export lines in downstream HEAD

```ts
1: export { createTodoContinuationEnforcer, type TodoContinuationEnforcer } from "./todo-continuation-enforcer";
2: export { createContextWindowMonitorHook } from "./context-window-monitor";
3: export { createSessionNotification } from "./session-notification";
4: export { createSessionRecoveryHook, type SessionRecoveryHook, type SessionRecoveryOptions } from "./session-recovery";
5: export { createCommentCheckerHooks } from "./comment-checker";
6: export { createToolOutputTruncatorHook } from "./tool-output-truncator";
7: export { createDirectoryAgentsInjectorHook } from "./directory-agents-injector";
8: export { createDirectoryReadmeInjectorHook } from "./directory-readme-injector";
9: export { createEmptyTaskResponseDetectorHook } from "./empty-task-response-detector";
10: export { createAnthropicContextWindowLimitRecoveryHook, type AnthropicContextWindowLimitRecoveryOptions } from "./anthropic-context-window-limit-recovery";
12: export { createThinkModeHook } from "./think-mode";
13: export { createModelFallbackHook, setPendingModelFallback, clearPendingModelFallback, type ModelFallbackState } from "./model-fallback/hook";
14: export { createClaudeCodeHooksHook } from "./claude-code-hooks";
15: export { createRulesInjectorHook } from "./rules-injector";
16: export { createBackgroundNotificationHook } from "./background-notification"
17: export { createAutoUpdateCheckerHook } from "./auto-update-checker";
19: export { createAgentUsageReminderHook } from "./agent-usage-reminder";
20: export { createAgentSkillReminderHook } from "./agent-skill-reminder";
21: export { createKeywordDetectorHook } from "./keyword-detector";
22: export { createNonInteractiveEnvHook } from "./non-interactive-env";
23: export { createInteractiveBashSessionHook } from "./interactive-bash-session";
25: export { createThinkingBlockValidatorHook } from "./thinking-block-validator";
26: export { createCategorySkillReminderHook } from "./category-skill-reminder";
27: export { createRalphLoopHook, type RalphLoopHook } from "./ralph-loop";
28: export { createAutoSlashCommandHook } from "./auto-slash-command";
29: export { createEditErrorRecoveryHook } from "./edit-error-recovery";
30: export { createPrometheusMdOnlyHook } from "./prometheus-md-only";
31: export { createSisyphusJuniorNotepadHook } from "./sisyphus-junior-notepad";
32: export { createNoSisyphusGptHook } from "./no-sisyphus-gpt";
33: export { createNoHephaestusNonGptHook } from "./no-hephaestus-non-gpt";
34: export { createTaskResumeInfoHook } from "./task-resume-info";
35: export { createStartWorkHook } from "./start-work";
36: export { createAtlasHook } from "./atlas";
37: export { createDelegateTaskRetryHook } from "./delegate-task-retry";
38: export { createQuestionLabelTruncatorHook } from "./question-label-truncator";
41: export { createTddGuardHook, type TddGuardHookContext, type TddGuardHookOptions, type TddGuardConfig } from "./tdd-guard";
44: export { createDebugInjectorHook, type DebugInjectorConfig } from "./debugging-injector";
47: export { createFailureCounterHook, type FailureCounterConfig } from "./failure-counter";
50: export { createSkillSuggestionHook } from "./skill-suggestion";
53: export { createSkillAutoTriggerHook } from "./skill-auto-trigger";
56: export { createPlanningFlowGuideHook } from "./planning-flow-guide";
59: export { createPlanReorganizerHook } from "./plan-reorganizer";
62: export { createPlanUpdateReminderHook } from "./plan-update-reminder";
65: export { createPlanAttentionRefresherHook } from "./plan-attention-refresher";
68: export { createSubagentVerificationHook } from "./subagent-verification";
74: export { createCodebaseAssessmentHook } from "./codebase-assessment";
77: export { createLspDiagnosticsEnforcerHook } from "./lsp-diagnostics-enforcer";
80: export { createPhaseFlowEnforcerHook } from "./phase-flow-enforcer";
83: export { createMdselReminderHook } from "./mdsel-reminder";
86: export { createMdselEnforcerHook } from "./mdsel-enforcer";
88: export { createObservationRecorderHook } from "./observation-recorder";
89: export { createObserverDetectorHook } from "./observer-detector";
90: export { createInstinctTriggerHook } from "./instinct-trigger";
91: export { createInstinctLearnerHook } from "./instinct-learner";
92: export { createPatternExtractionHook } from "./pattern-extraction";
93: export { createNotepadWriteGuardHook } from "./notepad-write-guard";
94: export { createObservationWriteGuardHook } from "./observation-write-guard";
95: export { createSecretScannerHook } from "./secret-scanner";
96: export { createSkillAutoInjectorHook } from "./skill-auto-injector";
97: export { createBehaviorAnchorHook } from "./behavior-anchor";
98: export { createVerbosityControllerHook } from "./verbosity-controller";
99: export { createPhaseRulesInjectorHook } from "./phase-rules-injector";
100: export { createKnowledgeInjectionHook } from "./knowledge-injection";
101: export { createProjectContextInjectorHook } from "./project-context-injector";
102: export { createPrContextInjectorHook } from "./pr-context-injector";
105: export { createStopContinuationGuardHook, type StopContinuationGuard } from "./stop-continuation-guard";
106: export { createCompactionContextInjector } from "./compaction-context-injector/hook";
107: export type { SummarizeContext } from "./compaction-context-injector";
108: export { createCompactionTodoPreserverHook } from "./compaction-todo-preserver";
109: export { createUnstableAgentBabysitterHook } from "./unstable-agent-babysitter";
110: export { createPreemptiveCompactionHook } from "./preemptive-compaction";
111: export { createRuntimeFallbackHook, type RuntimeFallbackHook, type RuntimeFallbackOptions } from "./runtime-fallback";
112: export { createTasksTodowriteDisablerHook } from "./tasks-todowrite-disabler";
113: export { createWriteExistingFileGuardHook } from "./write-existing-file-guard";
114: export { createTasksMdCreationGuardHook } from "./tasks-md-creation-guard";
115: export { createHashlineReadEnhancerHook } from "./hashline-read-enhancer";
116: export { createJsonErrorRecoveryHook } from "./json-error-recovery";
117: export { createReadImageResizerHook } from "./read-image-resizer";
118: export { createCommitSizeChecker } from "./pre-tool-use/commit-size-checker";
119: export { createFinalAuditHook } from "./stop/final-audit-hook";
```

### Downstream-only exports vs `upstream/dev`

- `DebugInjectorConfig`
- `FailureCounterConfig`
- `SummarizeContext`
- `TddGuardConfig`
- `TddGuardHookContext`
- `TddGuardHookOptions`
- `createAgentSkillReminderHook`
- `createBehaviorAnchorHook`
- `createCodebaseAssessmentHook`
- `createCommitSizeChecker`
- `createDebugInjectorHook`
- `createFailureCounterHook`
- `createFinalAuditHook`
- `createInstinctLearnerHook`
- `createInstinctTriggerHook`
- `createKnowledgeInjectionHook`
- `createLspDiagnosticsEnforcerHook`
- `createMdselEnforcerHook`
- `createMdselReminderHook`
- `createNotepadWriteGuardHook`
- `createObservationRecorderHook`
- `createObservationWriteGuardHook`
- `createObserverDetectorHook`
- `createPatternExtractionHook`
- `createPhaseFlowEnforcerHook`
- `createPhaseRulesInjectorHook`
- `createPlanAttentionRefresherHook`
- `createPlanReorganizerHook`
- `createPlanUpdateReminderHook`
- `createPlanningFlowGuideHook`
- `createPrContextInjectorHook`
- `createProjectContextInjectorHook`
- `createSecretScannerHook`
- `createSkillAutoInjectorHook`
- `createSkillAutoTriggerHook`
- `createSkillSuggestionHook`
- `createSubagentVerificationHook`
- `createTasksMdCreationGuardHook`
- `createTddGuardHook`
- `createVerbosityControllerHook`

## 3. `src/features/builtin-commands/commands.ts` downstream command entries

### All command entry keys in downstream HEAD

```ts
36: 	"init-deep": {
47: 	"ralph-loop": {
60: 	"ulw-loop": {
73: 	"cancel-ralph": {
79: 	refactor: {
88: 	"start-work": {
105: 	"stop-continuation": {
112: 	handoff: {
129: 	status: {
135: 	revert: {
146: 	"instinct-import": {
157: 	"instinct-export": {
168: 	evolve: {
181: 	"instinct-status": {
188: 	"build-fix": {
195: 	learn: {
```

### Downstream-only command keys vs `upstream/dev`

- `build-fix`
- `evolve`
- `instinct-export`
- `instinct-import`
- `instinct-status`
- `learn`
- `revert`
- `status`

## 4. `src/features/boulder-state/types.ts` downstream types

```ts
11: export type PhaseStatus = "idle" | "planning" | "reviewing" | "executing" | "awaiting_user" | "completed" | "failed" | "blocked"
16: export type WorktreeStatus = "pending" | "ready" | "in_progress" | "completed" | "failed" | "cleaned"
22: export type TaskPhaseStatus = "complete" | "in_progress" | "pending"
27: export interface TaskPhaseInfo {
41: export interface WaveWorktree {
65: export interface WaveExecutionState {
80: export interface BoulderState {
125: export interface PlanProgress {
```

## 5. `src/features/boulder-state/storage.ts` downstream functions

```ts
25: export function getBoulderFilePath(directory: string): string {
29: export function readBoulderState(directory: string): BoulderState | null {
51: export function writeBoulderState(
70: export function appendSessionId(
90: export function clearBoulderState(directory: string): boolean {
110: export function findPrometheusPlans(directory: string): string[] {
163: function parsePhaseStatus(
190: function extractPhaseName(headerLine: string): string {
202: export function getPlanProgress(planPath: string): PlanProgress {
275: export function getFirstIncompleteTask(planPath: string): string | null {
311: export function getPlanName(planPath: string): string {
326: export function createBoulderState(
347: export function updatePhaseStatus(
377: export function incrementFailureCount(
397: export function resetFailureCount(directory: string): BoulderState | null {
414: export function getCurrentPhase(directory: string): PhaseStatus {
422: export function canCallPlanningAgents(directory: string): boolean {
430: export function isExecutingPhase(directory: string): boolean {
439: export function markBoulderComplete(directory: string): BoulderState | null {
```

## 6. `src/config/schema/hooks.ts` downstream hook schema entries

### Full `HookNameSchema` enum block in downstream HEAD

```ts
4: export const HookNameSchema = z.enum([
5: 	"todo-continuation-enforcer",
6: 	"context-window-monitor",
7: 	"session-recovery",
8: 	"session-notification",
9: 	"comment-checker",
10: 	"tool-output-truncator",
11: 	"question-label-truncator",
12: 	"directory-agents-injector",
13: 	"directory-readme-injector",
14: 	"empty-task-response-detector",
15: 	"think-mode",
16: 	"model-fallback",
17: 	"anthropic-context-window-limit-recovery",
18: 	"preemptive-compaction",
19: 	"rules-injector",
20: 	"background-notification",
21: 	"auto-update-checker",
22: 	"startup-toast",
23: 	"keyword-detector",
24: 	"agent-usage-reminder",
25: 	"non-interactive-env",
26: 	"interactive-bash-session",
27: 
28: 	"thinking-block-validator",
29: 	"ralph-loop",
30: 	"category-skill-reminder",
31: 
32: 	"compaction-context-injector",
33: 	"compaction-todo-preserver",
34: 	"claude-code-hooks",
35: 	"auto-slash-command",
36: 	"edit-error-recovery",
37: 	"json-error-recovery",
38: 	"delegate-task-retry",
39: 	"prometheus-md-only",
40: 	"sisyphus-junior-notepad",
41: 	"no-sisyphus-gpt",
42: 	"no-hephaestus-non-gpt",
43: 	"start-work",
44: 	"atlas",
45: 	"unstable-agent-babysitter",
46: 	"task-resume-info",
47: 	"stop-continuation-guard",
48: 	"tasks-todowrite-disabler",
49: 	"runtime-fallback",
50: 	"write-existing-file-guard",
51: 	"secret-scanner",
52: 	// TDD-EXEMPT: reason="Adding tasks-md-creation-guard to hook schema"
53: 	"tasks-md-creation-guard",
54: 	"anthropic-effort",
55: 	"hashline-read-enhancer",
56: 	"read-image-resizer",
57: 	// TDD-EXEMPT: Schema update verified by src/config/schema.test.ts
58: 	"plan-reorganizer",
59: 	"plan-update-reminder",
60: 	"plan-attention-refresher",
61: ]);
```

### Downstream-only hook schema entries vs `upstream/dev`

- `plan-attention-refresher`
- `plan-reorganizer`
- `plan-update-reminder`
- `secret-scanner`
- `tasks-md-creation-guard`

## 7. Downstream-only directories

### Requested directories status

- `src/downstream/` — exists in HEAD: yes; downstream-only vs upstream/dev: yes
- `src/hooks/failure-counter/` — exists in HEAD: yes; downstream-only vs upstream/dev: yes
- `src/hooks/tdd-guard/` — exists in HEAD: yes; downstream-only vs upstream/dev: yes
- `src/hooks/debugging-injector/` — exists in HEAD: yes; downstream-only vs upstream/dev: yes
- `src/hooks/planning-flow/` — exists in HEAD: no; downstream-only vs upstream/dev: no
- `src/features/boulder-state/` — exists in HEAD: yes; downstream-only vs upstream/dev: no

### All `src/` directories present only in downstream HEAD

- `src/downstream/`
- `src/downstream/agents/`
- `src/downstream/agents/atlas/`
- `src/downstream/agents/hephaestus/`
- `src/downstream/agents/observer/`
- `src/downstream/commands/`
- `src/downstream/commands/build-fix/`
- `src/downstream/commands/evolve/`
- `src/downstream/commands/instinct-export/`
- `src/downstream/commands/instinct-import/`
- `src/downstream/commands/instinct-status/`
- `src/downstream/commands/learn/`
- `src/downstream/hooks/`
- `src/downstream/hooks/agent-skill-reminder/`
- `src/downstream/hooks/anthropic-context-window-limit-recovery/`
- `src/downstream/hooks/anthropic-effort/`
- `src/downstream/hooks/auto-slash-command/`
- `src/downstream/hooks/background-compaction/`
- `src/downstream/hooks/background-notification/`
- `src/downstream/hooks/behavior-anchor/`
- `src/downstream/hooks/codebase-assessment/`
- `src/downstream/hooks/comment-checker/`
- `src/downstream/hooks/commit-size-checker/`
- `src/downstream/hooks/debugging-injector/`
- `src/downstream/hooks/directory-agents-injector/`
- `src/downstream/hooks/failure-counter/`
- `src/downstream/hooks/final-audit/`
- `src/downstream/hooks/instinct-learner/`
- `src/downstream/hooks/instinct-trigger/`
- `src/downstream/hooks/knowledge-injection/`
- `src/downstream/hooks/lsp-diagnostics-enforcer/`
- `src/downstream/hooks/mdsel-enforcer/`
- `src/downstream/hooks/mdsel-reminder/`
- `src/downstream/hooks/notepad-write-guard/`
- `src/downstream/hooks/observation-recorder/`
- `src/downstream/hooks/observation-write-guard/`
- `src/downstream/hooks/observer-detector/`
- `src/downstream/hooks/pattern-extraction/`
- `src/downstream/hooks/phase-flow-enforcer/`
- `src/downstream/hooks/phase-rules-injector/`
- `src/downstream/hooks/plan-attention-refresher/`
- `src/downstream/hooks/plan-reorganizer/`
- `src/downstream/hooks/plan-update-reminder/`
- `src/downstream/hooks/planning-flow-guide/`
- `src/downstream/hooks/pr-context-injector/`
- `src/downstream/hooks/project-context-injector/`
- `src/downstream/hooks/ralph-loop/`
- `src/downstream/hooks/secret-scanner/`
- `src/downstream/hooks/session-scorer/`
- `src/downstream/hooks/sisyphus-junior-notepad/`
- `src/downstream/hooks/skill-auto-injector/`
- `src/downstream/hooks/skill-auto-trigger/`
- `src/downstream/hooks/skill-suggestion/`
- `src/downstream/hooks/subagent-verification/`
- `src/downstream/hooks/tasks-md-creation-guard/`
- `src/downstream/hooks/tdd-guard/`
- `src/downstream/hooks/unstable-agent-babysitter/`
- `src/downstream/hooks/verbosity-controller/`
- `src/downstream/mcp/`
- `src/downstream/patches/`
- `src/downstream/skills/`
- `src/downstream/skills/backend-pattern-go/`
- `src/downstream/skills/backend-pattern-java/`
- `src/downstream/skills/backend-pattern-python/`
- `src/downstream/skills/continuous-learning/`
- `src/downstream/skills/database-optimization/`
- `src/downstream/skills/mdsel/`
- `src/downstream/skills/progressive-disclosure-md/`
- `src/downstream/skills/security-audit/`
- `src/downstream/skills/wave-parallel-execution/`
- `src/downstream/tools/`
- `src/features/builtin-commands/presets/`
- `src/features/builtin-skills/archiving-changes/`
- `src/features/builtin-skills/backend-pattern-go/`
- `src/features/builtin-skills/backend-pattern-java/`
- `src/features/builtin-skills/backend-pattern-python/`
- `src/features/builtin-skills/brainstorming/`
- `src/features/builtin-skills/codex-mcp-collaboration/`
- `src/features/builtin-skills/collaborating-with-codex/`
- `src/features/builtin-skills/collaborating-with-codex/scripts/`
- `src/features/builtin-skills/collaborating-with-gemini/`
- `src/features/builtin-skills/collaborating-with-gemini/scripts/`
- `src/features/builtin-skills/continuous-learning/`
- `src/features/builtin-skills/continuous-learning/hooks/`
- `src/features/builtin-skills/continuous-learning/references/`
- `src/features/builtin-skills/continuous-learning/references/evolved/`
- `src/features/builtin-skills/continuous-learning/references/evolved/drafts/`
- `src/features/builtin-skills/continuous-learning/references/evolved/published/`
- `src/features/builtin-skills/continuous-learning/references/observations/`
- `src/features/builtin-skills/creating-changes/`
- `src/features/builtin-skills/database-optimization/`
- `src/features/builtin-skills/dispatching-parallel-agents/`
- `src/features/builtin-skills/evolve/`
- `src/features/builtin-skills/executing-plans/`
- `src/features/builtin-skills/finishing-a-development-branch/`
- `src/features/builtin-skills/mdsel/`
- `src/features/builtin-skills/mdsel/cli-src/`
- `src/features/builtin-skills/mdsel/cli-src/cli/`
- `src/features/builtin-skills/mdsel/cli-src/cli/commands/`
- `src/features/builtin-skills/mdsel/cli-src/cli/utils/`
- `src/features/builtin-skills/mdsel/cli-src/lexer/`
- `src/features/builtin-skills/mdsel/cli-src/output/`
- `src/features/builtin-skills/mdsel/cli-src/parser/`
- `src/features/builtin-skills/mdsel/cli-src/resolver/`
- `src/features/builtin-skills/mdsel/cli-src/selector/`
- `src/features/builtin-skills/mdsel/cli-src/utils/`
- `src/features/builtin-skills/progressive-disclosure-md/`
- `src/features/builtin-skills/receiving-code-review/`
- `src/features/builtin-skills/requesting-code-review/`
- `src/features/builtin-skills/security-audit/`
- `src/features/builtin-skills/subagent-driven-development/`
- `src/features/builtin-skills/systematic-debugging/`
- `src/features/builtin-skills/test-driven-development/`
- `src/features/builtin-skills/using-git-worktrees/`
- `src/features/builtin-skills/verification-before-completion/`
- `src/features/builtin-skills/wave-parallel-execution/`
- `src/features/builtin-skills/writing-skills/`
- `src/features/plan-progress-reader/`
- `src/features/plan-reorganizer/`
- `src/features/session-catchup/`
- `src/features/session-scorer/`
- `src/features/verification/`
- `src/hooks/agent-skill-reminder/`
- `src/hooks/behavior-anchor/`
- `src/hooks/codebase-assessment/`
- `src/hooks/debugging-injector/`
- `src/hooks/failure-counter/`
- `src/hooks/instinct-learner/`
- `src/hooks/instinct-trigger/`
- `src/hooks/knowledge-injection/`
- `src/hooks/lsp-diagnostics-enforcer/`
- `src/hooks/matchers/`
- `src/hooks/mdsel-enforcer/`
- `src/hooks/mdsel-reminder/`
- `src/hooks/notepad-write-guard/`
- `src/hooks/observation-recorder/`
- `src/hooks/observation-write-guard/`
- `src/hooks/observer-detector/`
- `src/hooks/pattern-extraction/`
- `src/hooks/phase-flow-enforcer/`
- `src/hooks/phase-rules-injector/`
- `src/hooks/plan-attention-refresher/`
- `src/hooks/plan-reorganizer/`
- `src/hooks/plan-update-reminder/`
- `src/hooks/planning-flow-guide/`
- `src/hooks/pr-context-injector/`
- `src/hooks/pre-tool-use/`
- `src/hooks/project-context-injector/`
- `src/hooks/secret-scanner/`
- `src/hooks/skill-auto-injector/`
- `src/hooks/skill-auto-trigger/`
- `src/hooks/skill-suggestion/`
- `src/hooks/stop/`
- `src/hooks/subagent-verification/`
- `src/hooks/tasks-md-creation-guard/`
- `src/hooks/tdd-guard/`
- `src/hooks/tdd-guard/handlers/`
- `src/hooks/tdd-guard/storage/`
- `src/hooks/verbosity-controller/`

## 8. Safety notes for merge resolution

- `src/index.ts` no longer registers downstream hooks via inline `isHookEnabledLoose(...)` checks; downstream runtime hook execution is centralized through `bootstrapDownstreamHooks(...)`.

- `src/hooks/index.ts` still exposes many downstream hook factories directly, even though `src/index.ts` now delegates runtime wiring through `src/downstream/runtime-hook-executor`.

- `src/features/boulder-state/` exists in both downstream HEAD and `upstream/dev`, but downstream HEAD contains substantial extra types and storage helpers that must not be dropped during conflict resolution.

- `src/hooks/planning-flow/` does not exist in downstream HEAD; the relevant downstream hook export and unique directory are `src/hooks/planning-flow-guide/`.
