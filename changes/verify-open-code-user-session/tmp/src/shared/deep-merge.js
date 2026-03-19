const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_DEPTH = 50;
export function isPlainObject(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.prototype.toString.call(value) === "[object Object]");
}
export function deepMerge(base, override, depth = 0) {
    if (!base && !override)
        return undefined;
    if (!base)
        return override;
    if (!override)
        return base;
    if (depth > MAX_DEPTH)
        return override ?? base;
    const result = { ...base };
    for (const key of Object.keys(override)) {
        if (DANGEROUS_KEYS.has(key))
            continue;
        const baseValue = base[key];
        const overrideValue = override[key];
        if (overrideValue === undefined)
            continue;
        if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
            result[key] = deepMerge(baseValue, overrideValue, depth + 1);
        }
        else {
            result[key] = overrideValue;
        }
    }
    return result;
}
