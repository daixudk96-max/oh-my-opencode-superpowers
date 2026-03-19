import { mergeCategories } from "../shared/merge-categories";
import { resolveMultipleSkills } from "../features/opencode-skill-loader/skill-content";
export function isFactory(source) {
    return typeof source === "function";
}
export function buildAgent(source, model, categories, gitMasterConfig, browserProvider, disabledSkills) {
    const base = isFactory(source) ? source(model) : { ...source };
    const categoryConfigs = mergeCategories(categories);
    const agentWithCategory = base;
    if (agentWithCategory.category) {
        const categoryConfig = categoryConfigs[agentWithCategory.category];
        if (categoryConfig) {
            if (!base.model) {
                base.model = categoryConfig.model;
            }
            if (base.temperature === undefined && categoryConfig.temperature !== undefined) {
                base.temperature = categoryConfig.temperature;
            }
            if (base.variant === undefined && categoryConfig.variant !== undefined) {
                base.variant = categoryConfig.variant;
            }
        }
    }
    if (agentWithCategory.skills?.length) {
        const { resolved } = resolveMultipleSkills(agentWithCategory.skills, { gitMasterConfig, browserProvider, disabledSkills });
        if (resolved.size > 0) {
            const skillContent = Array.from(resolved.values()).join("\n\n");
            base.prompt = skillContent + (base.prompt ? "\n\n" + base.prompt : "");
        }
    }
    return base;
}
