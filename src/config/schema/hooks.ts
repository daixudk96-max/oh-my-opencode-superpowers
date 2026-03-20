// TDD-EXEMPT: reason="Adding tasks-md-creation-guard to hook schema"
import { z } from "zod";

export const HookNameSchema = z.enum([
	"todo-continuation-enforcer",
	"context-window-monitor",
	"session-recovery",
	"session-notification",
	"comment-checker",
	"tool-output-truncator",
	"question-label-truncator",
	"directory-agents-injector",
	"directory-readme-injector",
	"empty-task-response-detector",
	"think-mode",
	"model-fallback",
	"anthropic-context-window-limit-recovery",
	"preemptive-compaction",
	"rules-injector",
	"background-notification",
	"auto-update-checker",
	"startup-toast",
	"keyword-detector",
	"agent-usage-reminder",
	"non-interactive-env",
	"interactive-bash-session",

	"thinking-block-validator",
	"ralph-loop",
	"category-skill-reminder",

	"compaction-context-injector",
	"compaction-todo-preserver",
	"claude-code-hooks",
	"auto-slash-command",
	"edit-error-recovery",
	"json-error-recovery",
	"delegate-task-retry",
	"prometheus-md-only",
	"sisyphus-junior-notepad",
	"no-sisyphus-gpt",
	"no-hephaestus-non-gpt",
	"start-work",
	"atlas",
	"unstable-agent-babysitter",
	"task-resume-info",
	"stop-continuation-guard",
	"tasks-todowrite-disabler",
	"runtime-fallback",
	"write-existing-file-guard",
	"secret-scanner",
	// TDD-EXEMPT: reason="Adding tasks-md-creation-guard to hook schema"
	"tasks-md-creation-guard",
	"anthropic-effort",
	"hashline-read-enhancer",
	"read-image-resizer",
	"todo-description-override",
	// TDD-EXEMPT: Schema update verified by src/config/schema.test.ts
	"plan-reorganizer",
	"plan-update-reminder",
	"plan-attention-refresher",
]);

function normalizeAdditionalHookNames(
	additionalHookNames: readonly string[],
): string[] {
	const names = new Set<string>();

	for (const hookName of additionalHookNames) {
		const trimmed = hookName.trim();
		if (trimmed.length > 0) {
			names.add(trimmed);
		}
	}

	return [...names];
}

export const createHookNameSchema = (
	additionalHookNames: readonly string[] = [],
) => {
	const normalizedHookNames = normalizeAdditionalHookNames(additionalHookNames);
	if (normalizedHookNames.length === 0) {
		return HookNameSchema;
	}

	const additionalHookLiterals = normalizedHookNames.map((hookName) =>
		z.literal(hookName),
	);
	return z.union([HookNameSchema, ...additionalHookLiterals]);
};

export function parseHookName(
	value: unknown,
	additionalHookNames: readonly string[] = [],
): string | null {
	const parsed = createHookNameSchema(additionalHookNames).safeParse(value);
	return parsed.success ? parsed.data : null;
}

export type HookName = z.infer<typeof HookNameSchema>;
