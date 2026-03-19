import { log } from "./logger";
export function safeCreateHook(name, factory, options) {
    const enabled = options?.enabled ?? true;
    if (!enabled) {
        return factory() ?? null;
    }
    try {
        return factory() ?? null;
    }
    catch (error) {
        log(`[safe-create-hook] Hook creation failed: ${name}`, { error });
        return null;
    }
}
