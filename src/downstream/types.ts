import type { AgentConfig } from "@opencode-ai/sdk"
import type { ToolDefinition } from "@opencode-ai/plugin"
import type { AgentPromptMetadata } from "../agents/types"
import type { OhMyOpenCodeConfig } from "../config/schema/oh-my-opencode-config"
import type { BuiltinSkill } from "../features/builtin-skills/types"
import type { CommandDefinition } from "../features/claude-code-command-loader/types"
import type { McpServerConfig } from "../features/claude-code-mcp-loader/types"
import type { PluginInstance as Hooks } from "../plugin/types"

import type { PluginInput } from "@opencode-ai/plugin"
import type { BackgroundManager } from "../features/background-agent"

export interface HookFactoryContext extends PluginInput {
  cwd: string
  backgroundManager?: BackgroundManager
  pluginConfig?: OhMyOpenCodeConfig
}

export type HookLifecycle = keyof Hooks

export type HookFactory = (...args: never[]) => Partial<Record<HookLifecycle, unknown>>

export interface HookManifest {
  name: string
  lifecycle: HookLifecycle[]
  factory: HookFactory
  dependencies?: string[]
  alwaysEnabled?: boolean
}

export interface SkillManifest {
  name: string
  skill: BuiltinSkill
}

export interface CommandManifest {
  name: string
  definition: CommandDefinition
}

export type AgentFactory = (...args: never[]) => AgentConfig

export interface AgentManifest {
  name: string
  factory: AgentFactory
  metadata?: AgentPromptMetadata | Record<string, unknown>
}

export type ToolFactory = (...args: never[]) => ToolDefinition

export type ToolManifest =
  | { name: string; factory: ToolFactory; definition?: never }
  | { name: string; definition: ToolDefinition; factory?: never }

export type McpConfigFactory = (config?: OhMyOpenCodeConfig) => McpServerConfig

export interface McpManifest {
  name: string
  configFactory: McpConfigFactory
}
