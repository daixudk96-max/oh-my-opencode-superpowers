import {
  HOOK_MANIFESTS,
  SKILL_MANIFESTS,
  COMMAND_MANIFESTS,
  AGENT_MANIFESTS,
} from "./generated-registry"
import type {
  AgentManifest,
  CommandManifest,
  HookManifest,
  McpManifest,
  SkillManifest,
  ToolManifest,
} from "./types"

export async function discoverDownstreamHooks(): Promise<HookManifest[]> {
  return HOOK_MANIFESTS
}

export async function discoverDownstreamSkills(): Promise<SkillManifest[]> {
  return SKILL_MANIFESTS
}

export async function discoverDownstreamCommands(): Promise<CommandManifest[]> {
  return COMMAND_MANIFESTS
}

export async function discoverDownstreamAgents(): Promise<AgentManifest[]> {
  return AGENT_MANIFESTS
}

export async function discoverDownstreamTools(): Promise<ToolManifest[]> {
  return []
}

export async function discoverDownstreamMcps(): Promise<McpManifest[]> {
  return []
}
