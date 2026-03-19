import { createAutoSlashCommandHook, createCategorySkillReminderHook } from "../../hooks";
import { safeCreateHook } from "../../shared/safe-create-hook";
export function createSkillHooks(args) {
    const { ctx, pluginConfig, isHookEnabled, safeHookEnabled, mergedSkills, availableSkills, } = args;
    const safeHook = (hookName, factory) => safeCreateHook(hookName, factory, { enabled: safeHookEnabled });
    const categorySkillReminder = isHookEnabled("category-skill-reminder")
        ? safeHook("category-skill-reminder", () => createCategorySkillReminderHook(ctx, availableSkills))
        : null;
    const autoSlashCommand = isHookEnabled("auto-slash-command")
        ? safeHook("auto-slash-command", () => createAutoSlashCommandHook({
            skills: mergedSkills,
            pluginsEnabled: pluginConfig.claude_code?.plugins ?? true,
            enabledPluginsOverride: pluginConfig.claude_code?.plugins_override,
        }))
        : null;
    return { categorySkillReminder, autoSlashCommand };
}
