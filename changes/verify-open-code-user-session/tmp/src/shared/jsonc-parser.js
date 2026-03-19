import { existsSync, readFileSync } from "node:fs";
import { parse, printParseErrorCode } from "jsonc-parser";
export function parseJsonc(content) {
    const errors = [];
    const result = parse(content, errors, {
        allowTrailingComma: true,
        disallowComments: false,
    });
    if (errors.length > 0) {
        const errorMessages = errors
            .map((e) => `${printParseErrorCode(e.error)} at offset ${e.offset}`)
            .join(", ");
        throw new SyntaxError(`JSONC parse error: ${errorMessages}`);
    }
    return result;
}
export function parseJsoncSafe(content) {
    const errors = [];
    const data = parse(content, errors, {
        allowTrailingComma: true,
        disallowComments: false,
    });
    return {
        data: errors.length > 0 ? null : data,
        errors: errors.map((e) => ({
            message: printParseErrorCode(e.error),
            offset: e.offset,
            length: e.length,
        })),
    };
}
export function readJsoncFile(filePath) {
    try {
        const content = readFileSync(filePath, "utf-8");
        return parseJsonc(content);
    }
    catch {
        return null;
    }
}
export function detectConfigFile(basePath) {
    const jsoncPath = `${basePath}.jsonc`;
    const jsonPath = `${basePath}.json`;
    if (existsSync(jsoncPath)) {
        return { format: "jsonc", path: jsoncPath };
    }
    if (existsSync(jsonPath)) {
        return { format: "json", path: jsonPath };
    }
    return { format: "none", path: jsonPath };
}
