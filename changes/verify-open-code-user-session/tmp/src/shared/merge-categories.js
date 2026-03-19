import { DEFAULT_CATEGORIES } from "../tools/delegate-task/constants";
/**
 * Merge default and user categories, filtering out disabled ones.
 * Single source of truth for category merging across the codebase.
 */
export function mergeCategories(userCategories) {
    const merged = userCategories
        ? { ...DEFAULT_CATEGORIES, ...userCategories }
        : { ...DEFAULT_CATEGORIES };
    return Object.fromEntries(Object.entries(merged).filter(([, config]) => !config.disable));
}
