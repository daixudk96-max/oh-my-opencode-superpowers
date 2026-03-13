// TDD-EXEMPT: reason="DEBUGGING: logging tool execution"
import type { Plugin } from "@opencode-ai/plugin";
// TDD-EXEMPT: reason="Registering planReorganizer hooks"
import { initConfigContext } from "./cli/config-manager/config-context";


import type { HookName } from "./config";

import { createHooks } from "./create-hooks";
import { createManagers } from "./create-managers";
import { createTools } from "./create-tools";
import { bootstrapDownstreamHooks } from "./downstream/runtime-hook-executor";
import { createCommitSizeCheckerWrapper } from "./downstream/patches/commit-size-checker-wrapper";
import { contextCollector } from "./features/context-injector";
import { createSessionScorer } from "./features/session-scorer";
import {
	createAgentSkillReminderHook,
	createBehaviorAnchorHook,
	createCodebaseAssessmentHook,
	createFinalAuditHook,
	createInstinctLearnerHook,
	createInstinctTriggerHook,
	createKnowledgeInjectionHook,
	createLspDiagnosticsEnforcerHook,
	createMdselReminderHook,
	createNotepadWriteGuardHook,
	createObservationRecorderHook,
	createObservationWriteGuardHook,
	createObserverDetectorHook,
	createPatternExtractionHook,
	createPhaseFlowEnforcerHook,
	createPhaseRulesInjectorHook,
	createPlanAttentionRefresherHook,
	createPlanningFlowGuideHook,
	createPlanReorganizerHook,
	createPlanUpdateReminderHook,
	createPrContextInjectorHook,
	createProjectContextInjectorHook,
	createSecretScannerHook,
	createSkillAutoInjectorHook,
	createSkillAutoTriggerHook,
	createSubagentVerificationHook,
	createTddGuardHook,
	createVerbosityControllerHook,
} from "./hooks";
import { loadPluginConfig } from "./plugin-config";
import { createPluginInterface } from "./plugin-interface";
import { createModelCacheState } from "./plugin-state";
import {
	createContextDetector,
	injectServerAuthIntoClient,
	log,
	type HookCondition,
} from "./shared";
import { createFirstMessageVariantGate } from "./shared/first-message-variant";
import { repairMisbucketedSessionMetadata } from "./shared/session-bucket-repair";
import { startTmuxCheck } from "./tools";

const OhMyOpenCodePlugin: Plugin = async (ctx) => {
	// Initialize config context for plugin runtime (prevents warnings from hooks)
	initConfigContext("opencode", null);
	log("[OhMyOpenCodePlugin] ENTRY - plugin loading", {
		directory: ctx.directory,
	});

	injectServerAuthIntoClient(ctx.client);
	startTmuxCheck();

	const pluginConfig = loadPluginConfig(ctx.directory, ctx);
	const downstreamHooks = await bootstrapDownstreamHooks({
		ctx,
		skipManifestNames: new Set([
			"agent-skill-reminder",
			"tdd-guard",
			"plan-reorganizer",
			"plan-update-reminder",
			"plan-attention-refresher",
			"subagent-verification",
			"codebase-assessment",
			"lsp-diagnostics-enforcer",
			"phase-flow-enforcer",
			"mdsel-reminder",
			"behavior-anchor",
			"planning-flow-guide",
			"secret-scanner",
			"instinct-trigger",
			"instinct-learner",
			"mdsel-enforcer",
			"tasks-md-creation-guard",
		]),
	});
	await repairMisbucketedSessionMetadata({
		directory: ctx.directory,
	})
		.then((result) => {
			if (result.repaired > 0) {
				log("[session-bucket-repair] startup repair completed", result);
			}
		})
		.catch((error) => {
			log("[session-bucket-repair] startup repair failed", {
				error: error instanceof Error ? error.message : String(error),
			});
		});

	const detector = createContextDetector();
	const projectContext = detector.detect(ctx.directory);
	const disabledHooks = new Set<string>();
	const disabledHookConfigs = (
		pluginConfig as {
			disabled_hooks?: Array<string | { name: string; when?: HookCondition }>;
		}
	).disabled_hooks;

	for (const hookConfig of disabledHookConfigs ?? []) {
		if (typeof hookConfig === "string") {
			const hookName = downstreamHooks.parseHookName(hookConfig);
			if (hookName) {
				disabledHooks.add(hookName);
			}
			continue;
		}

		const condition = hookConfig.when;
		if (!condition || detector.matchesCondition(projectContext, condition)) {
			const hookName = downstreamHooks.parseHookName(hookConfig.name);
			if (hookName) {
				disabledHooks.add(hookName);
			}
		}
	}

	const isHookEnabled = (hookName: HookName): boolean =>
		!disabledHooks.has(hookName);
	const isHookEnabledLoose = (hookName: string): boolean =>
		isHookEnabled(hookName as HookName);
	const safeHookEnabled = pluginConfig.experimental?.safe_hook_creation ?? true;

	const firstMessageVariantGate = createFirstMessageVariantGate();

	const tmuxConfig = {
		enabled: pluginConfig.tmux?.enabled ?? false,
		layout: pluginConfig.tmux?.layout ?? "main-vertical",
		main_pane_size: pluginConfig.tmux?.main_pane_size ?? 60,
		main_pane_min_width: pluginConfig.tmux?.main_pane_min_width ?? 120,
		agent_pane_min_width: pluginConfig.tmux?.agent_pane_min_width ?? 40,
	};

	const modelCacheState = createModelCacheState();

	const managers = createManagers({
		ctx,
		pluginConfig,
		tmuxConfig,
		modelCacheState,
		backgroundNotificationHookEnabled: isHookEnabled("background-notification"),
	});

	const toolsResult = await createTools({
		ctx,
		pluginConfig,
		managers,
	});

	const hooks = createHooks({
		ctx,
		pluginConfig,
		modelCacheState,
		backgroundManager: managers.backgroundManager,
		isHookEnabled,
		safeHookEnabled,
		mergedSkills: toolsResult.mergedSkills,
		availableSkills: toolsResult.availableSkills,
	});

	// Downstream-only hooks preserved on top of upstream modular composition
	const skillAutoTrigger = isHookEnabledLoose("skill-auto-trigger")
		? createSkillAutoTriggerHook(ctx)
		: null;
	const agentSkillReminder = isHookEnabledLoose("agent-skill-reminder")
		? createAgentSkillReminderHook(ctx, contextCollector)
		: null;
	const tddGuard = isHookEnabledLoose("tdd-guard")
		? createTddGuardHook({ cwd: ctx.directory })
		: null;
	const planReorganizer = isHookEnabledLoose("plan-reorganizer")
		? createPlanReorganizerHook(ctx)
		: null;
	const planUpdateReminder = isHookEnabledLoose("plan-update-reminder")
		? createPlanUpdateReminderHook(ctx)
		: null;
	const planAttentionRefresher = isHookEnabledLoose("plan-attention-refresher")
		? createPlanAttentionRefresherHook(ctx)
		: null;
	const subagentVerification = isHookEnabledLoose("subagent-verification")
		? createSubagentVerificationHook(ctx)
		: null;
	const codebaseAssessment = isHookEnabledLoose("codebase-assessment")
		? createCodebaseAssessmentHook(ctx)
		: null;
	const lspDiagnosticsEnforcer = isHookEnabledLoose("lsp-diagnostics-enforcer")
		? createLspDiagnosticsEnforcerHook(ctx)
		: null;
	const phaseFlowEnforcer = isHookEnabledLoose("phase-flow-enforcer")
		? createPhaseFlowEnforcerHook(ctx)
		: null;
	const mdselReminder = isHookEnabledLoose("mdsel-reminder")
		? createMdselReminderHook(ctx)
		: null;
	const observationRecorder = isHookEnabledLoose("observation-recorder")
		? createObservationRecorderHook()
		: null;
	const observerDetector = isHookEnabledLoose("observer-detector")
		? createObserverDetectorHook()
		: null;
	const instinctTrigger = isHookEnabledLoose("instinct-trigger")
		? createInstinctTriggerHook({
				claudeConfigDir: (ctx as { claudeConfigDir?: string }).claudeConfigDir,
			})
		: null;
	const instinctLearner = isHookEnabledLoose("instinct-learner")
		? createInstinctLearnerHook()
		: null;
	const patternExtraction = isHookEnabledLoose("pattern-extraction")
		? createPatternExtractionHook()
		: null;
	const observationWriteGuard = isHookEnabledLoose("observation-write-guard")
		? createObservationWriteGuardHook(ctx)
		: null;
	const secretScanner = isHookEnabledLoose("secret-scanner")
		? createSecretScannerHook({ cwd: ctx.directory })
		: null;
	const skillAutoInjector = isHookEnabledLoose("skill-auto-injector")
		? createSkillAutoInjectorHook({ cwd: ctx.directory })
		: null;
	const behaviorAnchor = isHookEnabledLoose("behavior-anchor")
		? createBehaviorAnchorHook()
		: null;
	const verbosityController = isHookEnabledLoose("verbosity-controller")
		? createVerbosityControllerHook()
		: null;
	const phaseRulesInjector = isHookEnabledLoose("phase-rules-injector")
		? createPhaseRulesInjectorHook()
		: null;
	const knowledgeInjection = isHookEnabledLoose("knowledge-injection")
		? createKnowledgeInjectionHook()
		: null;
	const projectContextInjector = isHookEnabledLoose("project-context-injector")
		? createProjectContextInjectorHook({
				directory: ctx.directory,
				client: ctx.client,
			})
		: null;
	const prContextInjector = isHookEnabledLoose("pr-context-injector")
		? createPrContextInjectorHook({ directory: ctx.directory })
		: null;
	const notepadWriteGuard = isHookEnabledLoose("notepad-write-guard")
		? createNotepadWriteGuardHook(ctx)
		: null;
	// TDD-EXEMPT: reason="Moving tasks-md-creation-guard to modular flow"
	const commitSizeChecker = isHookEnabledLoose("commit-size-checker")

		? createCommitSizeCheckerWrapper()
		: null;
	const planningFlowGuide = isHookEnabledLoose("planning-flow-guide")
		? createPlanningFlowGuideHook(ctx)
		: null;
	const sessionScorer = isHookEnabledLoose("session-scorer")
		? createSessionScorer()
		: null;
	const finalAudit = createFinalAuditHook();

	const pluginInterface = createPluginInterface({
		ctx,
		pluginConfig,
		firstMessageVariantGate,
		managers,
		hooks,
		tools: toolsResult.filteredTools,
	});

	const baseChatMessage = pluginInterface["chat.message"];
	const baseEvent = pluginInterface.event;
	const baseToolExecuteBefore = pluginInterface["tool.execute.before"];
	const baseToolExecuteAfter = pluginInterface["tool.execute.after"];

	return {
		...pluginInterface,

		"chat.message": async (input, output) => {
			await baseChatMessage?.(input as never, output as never);

			await skillAutoTrigger?.["chat.message"]?.(
				input as never,
				output as never,
			);
			await agentSkillReminder?.["chat.message"]?.(
				input as never,
				output as never,
			);
			await tddGuard?.["chat.message"]?.(input as never, output as never);
			await skillAutoInjector?.["chat.message"]?.(
				input as never,
				output as never,
			);
			await phaseRulesInjector?.["chat.message"]?.(
				input as never,
				output as never,
			);
			await projectContextInjector?.["chat.message"]?.(
				input as never,
				output as never,
			);
			await prContextInjector?.["chat.message"]?.(
				input as never,
				output as never,
			);
			await downstreamHooks.runChatMessage(input as never, output as never);
		},

		event: async (input) => {
			// TDD-EXEMPT
			await baseEvent?.(input as never);

			await sessionScorer?.event?.(input as never);
			await tddGuard?.event?.(input as never);
			await observerDetector?.event?.(input as never);
			await instinctLearner?.event?.(input as never);
			await patternExtraction?.event?.(input as never);
			await skillAutoInjector?.event?.(input as never);


			const eventType = (input as { event?: { type?: string } })?.event?.type;
			if (eventType === "session.created") {
				const props = (
					input as { event?: { properties?: Record<string, unknown> } }
				).event?.properties;
				const sessionInfo = props?.info as { id?: string } | undefined;
				if (sessionInfo?.id) {
					void repairMisbucketedSessionMetadata({
						directory: ctx.directory,
						sessionID: sessionInfo.id,
					})
						.then((result) => {
							if (result.repaired > 0) {
								log(
									"[session-bucket-repair] session.created repair completed",
									{
										sessionID: sessionInfo.id,
										...result,
									},
								);
							}
						})
						.catch((error) => {
							log("[session-bucket-repair] session.created repair failed", {
								sessionID: sessionInfo.id,
								error: error instanceof Error ? error.message : String(error),
							});
						});
				}
			}

			if (eventType === "session.stop") {
				void finalAudit
					.runAudit()
					.then((result) => {
						const report = finalAudit.generateReport(result);
						log("[final-audit] Stop-stage final audit completed", {
							overallSuccess: result.overallSuccess,
						});
						log(`[final-audit]
${report}`);
					})
					.catch((error) => {
						log("[final-audit] Stop-stage final audit failed", {
							error: error instanceof Error ? error.message : String(error),
						});
					});
			}

			await downstreamHooks.runEvent(input as never);
		},

		"tool.execute.before": async (input, output) => {
			// TDD-EXEMPT: reason="DEBUGGING: logging tool execution"
			log("[OhMyOpenCodePlugin] tool.execute.before", { tool: input.tool, sessionID: input.sessionID, args: output.args });
			await baseToolExecuteBefore?.(input as never, output as never);

			// TDD-EXEMPT: reason="Moving tasks-md-creation-guard to modular flow"
			await commitSizeChecker?.["tool.execute.before"]?.(

				input as never,
				output as never,
			);
			await tddGuard?.["tool.execute.before"]?.(
				input as never,
				output as never,
			);
			await codebaseAssessment?.["tool.execute.before"]?.(
				input as never,
				output as never,
			);
			// TDD-EXEMPT
			await planReorganizer?.["tool.execute.before"]?.(
				input as never,
				output as never,
			);
			await mdselReminder?.["tool.execute.before"]?.(

				input as never,
				output as never,
			);
			await notepadWriteGuard?.["tool.execute.before"]?.(
				input as never,
				output as never,
			);
			await observationWriteGuard?.["tool.execute.before"]?.(
				input as never,
				output as never,
			);
			await secretScanner?.["tool.execute.before"]?.(
				input as never,
				output as never,
			);
			await instinctTrigger?.["tool.execute.before"]?.(
				input as never,
				output as never,
			);
			await planUpdateReminder?.["tool.execute.before"]?.(
				input as never,
				output as never,
			);
			await planAttentionRefresher?.["tool.execute.before"]?.(
				input as never,
				output as never,
			);
			await knowledgeInjection?.["tool.execute.before"]?.(
				input as never,
				output as never,
			);
			await downstreamHooks.runToolExecuteBefore(input as never, output as never);

			const blockedOutput = output as { blocked?: boolean; message?: string };
			if (blockedOutput.blocked) {
				throw new Error(blockedOutput.message ?? "Operation blocked by hook");
			}
		},

		"tool.execute.after": async (input, output) => {
			await baseToolExecuteAfter?.(input as never, output as never);

			if (!output) return;

			// TDD-EXEMPT: reason="Moving tasks-md-creation-guard to modular flow"
			await tddGuard?.["tool.execute.after"]?.(input as never, output as never);

			// TDD-EXEMPT
			await planReorganizer?.["tool.execute.after"]?.(
				input as never,
				output as never,
			);
			await planUpdateReminder?.["tool.execute.after"]?.(

				input as never,
				output as never,
			);
			await planningFlowGuide?.["tool.execute.after"]?.(
				input as never,
				output as never,
			);
			await subagentVerification?.["tool.execute.after"]?.(
				input as never,
				output as never,
			);
			await lspDiagnosticsEnforcer?.["tool.execute.after"]?.(
				input as never,
				output as never,
			);
			await phaseFlowEnforcer?.["tool.execute.after"]?.(
				input as never,
				output as never,
			);
			await mdselReminder?.["tool.execute.after"]?.(
				input as never,
				output as never,
			);
			await observationRecorder?.["tool.execute.after"]?.(
				input as never,
				output as never,
			);
			await observerDetector?.["tool.execute.after"]?.(
				input as never,
				output as never,
			);
			await instinctLearner?.["tool.execute.after"]?.(
				input as never,
				output as never,
			);
			await behaviorAnchor?.["tool.execute.after"]?.(
				input as never,
				output as never,
			);
			await verbosityController?.["tool.execute.after"]?.(
				input as never,
				output as never,
			);
			await downstreamHooks.runToolExecuteAfter(input as never, output as never);
		},

		"experimental.session.compacting": async (
			_input: { sessionID: string },
			output: { context: string[] },
		): Promise<void> => {
			await hooks.compactionTodoPreserver?.capture(_input.sessionID);
			await hooks.claudeCodeHooks?.["experimental.session.compacting"]?.(
				_input,
				output,
			);
			if (hooks.compactionContextInjector) {
				output.context.push(hooks.compactionContextInjector(_input.sessionID));
			}
			await downstreamHooks.runExperimentalSessionCompacting(_input, output);
		},
	};
};

export default OhMyOpenCodePlugin;

export type {
	AgentName,
	AgentOverrideConfig,
	AgentOverrides,
	BuiltinCommandName,
	HookName,
	McpName,
	OhMyOpenCodeConfig,
} from "./config";

// NOTE: Do NOT export functions from main index.ts!
// OpenCode treats ALL exports as plugin instances and calls them.
// Config error utilities are available via "./shared/config-errors" for internal use only.
export type { ConfigLoadError } from "./shared/config-errors";
