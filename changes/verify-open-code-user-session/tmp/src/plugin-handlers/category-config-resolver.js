import { DEFAULT_CATEGORIES } from "../tools/delegate-task/constants";
export function resolveCategoryConfig(categoryName, userCategories) {
    return userCategories?.[categoryName] ?? DEFAULT_CATEGORIES[categoryName];
}
