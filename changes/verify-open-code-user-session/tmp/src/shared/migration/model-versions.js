/**
 * Model version migration map: old full model strings → new full model strings.
 * Used to auto-upgrade hardcoded model versions in user configs when the plugin
 * bumps to newer model versions.
 *
 * Keys are full "provider/model" strings. Only openai and anthropic entries needed.
 */
export const MODEL_VERSION_MAP = {
    "anthropic/claude-opus-4-5": "anthropic/claude-opus-4-6",
    "anthropic/claude-sonnet-4-5": "anthropic/claude-sonnet-4-6",
};
function migrationKey(oldModel, newModel) {
    return `model-version:${oldModel}->${newModel}`;
}
export function migrateModelVersions(configs, appliedMigrations) {
    const migrated = {};
    let changed = false;
    const newMigrations = [];
    for (const [key, value] of Object.entries(configs)) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
            const config = value;
            if (typeof config.model === "string" && MODEL_VERSION_MAP[config.model]) {
                const oldModel = config.model;
                const newModel = MODEL_VERSION_MAP[oldModel];
                const mKey = migrationKey(oldModel, newModel);
                // Skip if this migration was already applied (user may have reverted)
                if (appliedMigrations?.has(mKey)) {
                    migrated[key] = value;
                    continue;
                }
                migrated[key] = { ...config, model: newModel };
                changed = true;
                newMigrations.push(mKey);
                continue;
            }
        }
        migrated[key] = value;
    }
    return { migrated, changed, newMigrations };
}
