import { isPlainObject } from "./deep-merge";
export function camelToSnake(str) {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
export function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
export function transformObjectKeys(obj, transformer, deep = true) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const transformedKey = transformer(key);
        if (deep && isPlainObject(value)) {
            result[transformedKey] = transformObjectKeys(value, transformer, true);
        }
        else if (deep && Array.isArray(value)) {
            result[transformedKey] = value.map((item) => isPlainObject(item) ? transformObjectKeys(item, transformer, true) : item);
        }
        else {
            result[transformedKey] = value;
        }
    }
    return result;
}
export function objectToSnakeCase(obj, deep = true) {
    return transformObjectKeys(obj, camelToSnake, deep);
}
export function objectToCamelCase(obj, deep = true) {
    return transformObjectKeys(obj, snakeToCamel, deep);
}
