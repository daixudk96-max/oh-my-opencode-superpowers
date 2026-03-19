export function isHookDisabled(config, hookType) {
    const { disabledHooks } = config;
    if (disabledHooks === undefined) {
        return false;
    }
    if (disabledHooks === true) {
        return true;
    }
    if (Array.isArray(disabledHooks)) {
        return disabledHooks.includes(hookType);
    }
    return false;
}
