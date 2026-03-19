import type { PluginInput } from "@opencode-ai/plugin"
import type { OhMyOpenCodeConfig } from "../config/schema/oh-my-opencode-config"
import type { BackgroundManager } from "../features/background-agent"
import { log } from "../shared"
import { discoverDownstreamHooks } from "./auto-registry"
import { extendHookNameSchema } from "./schema-extensions"
import type { HookFactoryContext, HookManifest } from "./types"

type SupportedLifecycle =
  | "chat.message"
  | "event"
  | "tool.execute.before"
  | "tool.execute.after"
  | "experimental.session.compacting"
  | "UserPromptSubmit"

type HookHandler = ((input: unknown, output?: unknown) => unknown | Promise<unknown>) | undefined
type LifecycleHandlers = Record<SupportedLifecycle, HookHandler[]>

const SUPPORTED_LIFECYCLES: SupportedLifecycle[] = [
  "chat.message",
  "event",
  "tool.execute.before",
  "tool.execute.after",
  "experimental.session.compacting",
  "UserPromptSubmit",
]

function createEmptyLifecycleHandlers(): LifecycleHandlers {
  return {
    "chat.message": [],
    event: [],
    "tool.execute.before": [],
    "tool.execute.after": [],
    "experimental.session.compacting": [],
    UserPromptSubmit: [],
  }
}

function getBlockedError(output: unknown): Error | null {
  const blockedOutput = output as { blocked?: boolean; message?: string }
  if (blockedOutput.blocked !== true) return null
  return new Error(blockedOutput.message ?? "Operation blocked by hook")
}

async function runHandlers(
  handlers: HookHandler[],
  input: unknown,
  output?: unknown,
  options?: { throwOnBlocked?: boolean },
): Promise<void> {
  for (const handler of handlers) {
    if (typeof handler !== "function") continue
    try {
      await handler(input, output)
    } catch (error) {
      log("[downstream-hooks] lifecycle handler failed", {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    if (options?.throwOnBlocked) {
      const blockedError = getBlockedError(output)
      if (blockedError) throw blockedError
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
  runUserPromptSubmit(input: unknown, output: unknown): Promise<void>
}

declare global {
  var __ohMyOpenCodeDownstreamHooksOverride:
    | ((params: {
        ctx: PluginInput
        disabledHooks?: Set<string>
        backgroundManager?: BackgroundManager
        pluginConfig?: OhMyOpenCodeConfig
        manifests?: HookManifest[]
      }) => Promise<DownstreamHookBootstrapResult>)
    | undefined
}

export async function bootstrapDownstreamHooks(params: {
  ctx: PluginInput
  disabledHooks?: Set<string>
  backgroundManager?: BackgroundManager
  pluginConfig?: OhMyOpenCodeConfig
  manifests?: HookManifest[]
}): Promise<DownstreamHookBootstrapResult> {
  const override = globalThis.__ohMyOpenCodeDownstreamHooksOverride
  if (override) {
    return override(params)
  }
  const manifests = params.manifests ?? await discoverDownstreamHooks().catch(() => [])
  const parserSchema = extendHookNameSchema(manifests.map((manifest) => manifest.name))
  const disabledHooks = params.disabledHooks ?? new Set<string>()
  const handlers = createEmptyLifecycleHandlers()

  const hookFactoryContext: HookFactoryContext = {
    ...params.ctx,
    cwd: params.ctx.directory,
    backgroundManager: params.backgroundManager,
    pluginConfig: params.pluginConfig,
  }

  const EXTERNALLY_MANAGED_HOOKS = new Set([
    "background-notification",
    "background-compaction",
    "unstable-agent-babysitter",
    "atlas"
  ])

  for (const manifest of manifests) {
    if (EXTERNALLY_MANAGED_HOOKS.has(manifest.name)) {
      log("[downstream-hooks] skipping externally managed hook", { hookName: manifest.name })
      continue
    }

    if (!manifest.alwaysEnabled && disabledHooks.has(manifest.name)) continue

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
      return runHandlers(handlers["tool.execute.before"], input, output, {
        throwOnBlocked: true,
      })
    },
    runToolExecuteAfter(input: unknown, output: unknown): Promise<void> {
      return runHandlers(handlers["tool.execute.after"], input, output)
    },
    runExperimentalSessionCompacting(input: unknown, output: unknown): Promise<void> {
      return runHandlers(handlers["experimental.session.compacting"], input, output)
    },
    runUserPromptSubmit(input: unknown, output: unknown): Promise<void> {
      return runHandlers(handlers.UserPromptSubmit, input, output)
    },
  }
}
