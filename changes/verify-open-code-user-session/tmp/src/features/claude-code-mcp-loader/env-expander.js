export function expandEnvVars(value) {
    return value.replace(/\$\{([^}:]+)(?::-([^}]*))?\}/g, (_, varName, defaultValue) => {
        const envValue = process.env[varName];
        if (envValue !== undefined)
            return envValue;
        if (defaultValue !== undefined)
            return defaultValue;
        return "";
    });
}
export function expandEnvVarsInObject(obj) {
    if (obj === null || obj === undefined)
        return obj;
    if (typeof obj === "string")
        return expandEnvVars(obj);
    if (Array.isArray(obj)) {
        return obj.map((item) => expandEnvVarsInObject(item));
    }
    if (typeof obj === "object") {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = expandEnvVarsInObject(value);
        }
        return result;
    }
    return obj;
}
