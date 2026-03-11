import type { PluginInput } from "@opencode-ai/plugin"
import { log } from "../shared"
import { discoverDownstreamHooks } from "./auto-registry"
import { extendHookNameSchema } from "./schema-extensions"

type SupportedLifecycle =
  | "chat.message"
  | "event"
  | "tool.execute.before"
  | "tool.execute.after"
  | "experimental.session.compacting"

type HookHandler = ((input: unknown, output?: unknown) => unknown | Promise<unknown>) | undefined
type LifecycleHandlers = Record<SupportedLifecycle, HookHandler[]>

const SUPPORTED_LIFECYCLES: SupportedLifecycle[] = [
  "chat.message",
  "event",
  "tool.execute.before",
  "tool.execute.after",
  "experimental.session.compacting",
]

function createEmptyLifecycleHandlers(): LifecycleHandlers {
  return {
    "chat.message": [],
    event: [],
    "tool.execute.before": [],
    "tool.execute.after": [],
    "experimental.session.compacting": [],
  }
}

async function runHandlers(handlers: HookHandler[], input: unknown, output?: unknown): Promise<void> {
  for (const handler of handlers) {
    if (typeof handler !== "function") continue
    try {
      await handler(input, output)
    } catch (error) {
      log("[downstream-hooks] lifecycle handler failed", {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

export interface DownstreamHookBootstrapResult {
  parseHookName(value: unknown): string | null
  runChatMessage(input: unknown, output: unknown): Promise<void>
  runEvent(input: unknown): Promise<void>
  runToolExecuteBefore(input: unknown, output: unknown): Promise<void>
  runToolExecuteAfter(input: unknown, output: unknown): Promise<void>
  runExperimentalSessionCompacting(input: unknown, output: unknown): Promise<void>
}

export async function bootstrapDownstreamHooks(params: {
  ctx: PluginInput
  skipManifestNames?: Set<string>
}): Promise<DownstreamHookBootstrapResult> {
  const manifests = await discoverDownstreamHooks().catch(() => [])
  const parserSchema = extendHookNameSchema(manifests.map((manifest) => manifest.name))
  const skipManifestNames = params.skipManifestNames ?? new Set<string>()
  const handlers = createEmptyLifecycleHandlers()

  const hookFactoryContext = {
    ...params.ctx,
    cwd: params.ctx.directory,
  }

  for (const manifest of manifests) {
    if (skipManifestNames.has(manifest.name)) continue

    try {
      const instance = manifest.factory(hookFactoryContext as never) as Record<string, HookHandler>
      for (const lifecycle of manifest.lifecycle) {
        if (!SUPPORTED_LIFECYCLES.includes(lifecycle as SupportedLifecycle)) continue
        handlers[lifecycle as SupportedLifecycle].push(instance[lifecycle])
      }
    } catch (error) {
      log("[downstream-hooks] hook factory failed", {
        hookName: manifest.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return {
    parseHookName(value: unknown): string | null {
      const parsed = parserSchema.safeParse(value)
      return parsed.success ? parsed.data : null
    },
    runChatMessage(input: unknown, output: unknown): Promise<void> {
      return runHandlers(handlers["chat.message"], input, output)
    },
    runEvent(input: unknown): Promise<void> {
      return runHandlers(handlers.event, input)
    },
    runToolExecuteBefore(input: unknown, output: unknown): Promise<void> {
      return runHandlers(handlers["tool.execute.before"], input, output)
    },
    runToolExecuteAfter(input: unknown, output: unknown): Promise<void> {
      return runHandlers(handlers["tool.execute.after"], input, output)
    },
    runExperimentalSessionCompacting(input: unknown, output: unknown): Promise<void> {
      return runHandlers(handlers["experimental.session.compacting"], input, output)
    },
  }
}
