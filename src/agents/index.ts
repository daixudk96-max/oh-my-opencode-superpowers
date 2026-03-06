import type { AgentConfig } from "@opencode-ai/sdk"
// Note: Agent configs are created dynamically via createBuiltinAgents() in utils.ts
// This file only exports the factory functions and types

// builtinAgents is deprecated - use createBuiltinAgents() instead
export const builtinAgents: Record<string, AgentConfig> = {}

export * from "./types"
export { createBuiltinAgents } from "./builtin-agents"
export type { AvailableAgent, AvailableCategory, AvailableSkill } from "./dynamic-agent-prompt-builder"
export type { PrometheusPromptSource } from "./prometheus"
