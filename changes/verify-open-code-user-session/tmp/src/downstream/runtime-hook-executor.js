import { log } from "../shared";
import { discoverDownstreamHooks } from "./auto-registry";
import { extendHookNameSchema } from "./schema-extensions";
const SUPPORTED_LIFECYCLES = [
    "chat.message",
    "event",
    "tool.execute.before",
    "tool.execute.after",
    "experimental.session.compacting",
    "UserPromptSubmit",
];
function createEmptyLifecycleHandlers() {
    return {
        "chat.message": [],
        event: [],
        "tool.execute.before": [],
        "tool.execute.after": [],
        "experimental.session.compacting": [],
        UserPromptSubmit: [],
    };
}
function getBlockedError(output) {
    const blockedOutput = output;
    if (blockedOutput.blocked !== true)
        return null;
    return new Error(blockedOutput.message ?? "Operation blocked by hook");
}
async function runHandlers(handlers, input, output, options) {
    for (const handler of handlers) {
        if (typeof handler !== "function")
            continue;
        try {
            await handler(input, output);
        }
        catch (error) {
            log("[downstream-hooks] lifecycle handler failed", {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        if (options?.throwOnBlocked) {
            const blockedError = getBlockedError(output);
            if (blockedError)
                throw blockedError;
        }
    }
}
export async function bootstrapDownstreamHooks(params) {
    const override = globalThis.__ohMyOpenCodeDownstreamHooksOverride;
    if (override) {
        return override(params);
    }
    const manifests = params.manifests ?? await discoverDownstreamHooks().catch(() => []);
    const parserSchema = extendHookNameSchema(manifests.map((manifest) => manifest.name));
    const disabledHooks = params.disabledHooks ?? new Set();
    const handlers = createEmptyLifecycleHandlers();
    const hookFactoryContext = {
        ...params.ctx,
        cwd: params.ctx.directory,
        backgroundManager: params.backgroundManager,
        pluginConfig: params.pluginConfig,
    };
    const EXTERNALLY_MANAGED_HOOKS = new Set([
        "background-notification",
        "background-compaction",
        "unstable-agent-babysitter",
        "atlas"
    ]);
    for (const manifest of manifests) {
        if (EXTERNALLY_MANAGED_HOOKS.has(manifest.name)) {
            log("[downstream-hooks] skipping externally managed hook", { hookName: manifest.name });
            continue;
        }
        if (!manifest.alwaysEnabled && disabledHooks.has(manifest.name))
            continue;
        try {
            const instance = manifest.factory(hookFactoryContext);
            for (const lifecycle of manifest.lifecycle) {
                if (!SUPPORTED_LIFECYCLES.includes(lifecycle))
                    continue;
                handlers[lifecycle].push(instance[lifecycle]);
            }
        }
        catch (error) {
            log("[downstream-hooks] hook factory failed", {
                hookName: manifest.name,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    return {
        parseHookName(value) {
            const parsed = parserSchema.safeParse(value);
            return parsed.success ? parsed.data : null;
        },
        runChatMessage(input, output) {
            return runHandlers(handlers["chat.message"], input, output);
        },
        runEvent(input) {
            return runHandlers(handlers.event, input);
        },
        runToolExecuteBefore(input, output) {
            return runHandlers(handlers["tool.execute.before"], input, output, {
                throwOnBlocked: true,
            });
        },
        runToolExecuteAfter(input, output) {
            return runHandlers(handlers["tool.execute.after"], input, output);
        },
        runExperimentalSessionCompacting(input, output) {
            return runHandlers(handlers["experimental.session.compacting"], input, output);
        },
        runUserPromptSubmit(input, output) {
            return runHandlers(handlers.UserPromptSubmit, input, output);
        },
    };
}
