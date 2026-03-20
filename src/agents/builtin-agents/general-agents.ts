import type { AgentConfig } from "@opencode-ai/sdk"

import type { BrowserAutomationProvider, CategoryConfig, GitMasterConfig } from "../../config/schema"
import { AGENT_MODEL_REQUIREMENTS, isModelAvailable } from "../../shared"
import { buildAgent, isFactory } from "../agent-builder"
import type { AvailableAgent } from "../dynamic-agent-prompt-builder"
import type { AgentOverrides, AgentPromptMetadata, BuiltinAgentName } from "../types"

import { applyOverrides } from "./agent-overrides"
import { applyEnvironmentContext } from "./environment-context"
import { applyModelResolution, getFirstFallbackModel } from "./model-resolution"

export function collectPendingBuiltinAgents(input: {
  agentSources: Record<string, import("../agent-builder").AgentSource>
  agentMetadata: Partial<Record<BuiltinAgentName, AgentPromptMetadata>> &
    Record<string, AgentPromptMetadata | undefined>
  disabledAgents: string[]
  agentOverrides: AgentOverrides
  directory?: string
  systemDefaultModel?: string
  mergedCategories: Record<string, CategoryConfig>
  gitMasterConfig?: GitMasterConfig
  browserProvider?: BrowserAutomationProvider
  uiSelectedModel?: string
  availableModels: Set<string>
  isFirstRunNoCache: boolean
  disabledSkills?: Set<string>
  useTaskSystem?: boolean
  disableOmoEnv?: boolean
}): { pendingAgentConfigs: Map<string, AgentConfig>; availableAgents: AvailableAgent[] } {
  const {
    agentSources,
    agentMetadata,
    disabledAgents,
    agentOverrides,
    directory,
    systemDefaultModel,
    mergedCategories,
    gitMasterConfig,
    browserProvider,
    uiSelectedModel,
    availableModels,
    isFirstRunNoCache,
    disabledSkills,
    disableOmoEnv = false,
  } = input

  const availableAgents: AvailableAgent[] = []
  const pendingAgentConfigs: Map<string, AgentConfig> = new Map()

  for (const [name, source] of Object.entries(agentSources)) {
    if (name === "sisyphus") continue
    if (name === "hephaestus") continue
    if (name === "atlas") continue
    if (name === "sisyphus-junior") continue
    if (disabledAgents.some((disabledAgent) => disabledAgent.toLowerCase() === name.toLowerCase())) continue

    const builtinAgentName = name as BuiltinAgentName
    const override = agentOverrides[builtinAgentName]
      ?? Object.entries(agentOverrides).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1]
    const requirement = AGENT_MODEL_REQUIREMENTS[builtinAgentName]

    // Check if agent requires a specific model
    if (requirement?.requiresModel && availableModels) {
      if (!isModelAvailable(requirement.requiresModel, availableModels)) {
        continue
      }
    }

    const isPrimaryAgent = isFactory(source) && source.mode === "primary"

    let resolution = applyModelResolution({
      uiSelectedModel: (isPrimaryAgent && !override?.model) ? uiSelectedModel : undefined,
      userModel: override?.model,
      requirement,
      availableModels,
      systemDefaultModel,
    })
    if (!resolution && isFirstRunNoCache && !override?.model) {
      resolution = getFirstFallbackModel(requirement)
    }
    if (!resolution) continue
    const { model, variant: resolvedVariant } = resolution

    let config = buildAgent(source, model, mergedCategories, gitMasterConfig, browserProvider, disabledSkills)

    // Apply resolved variant from model fallback chain
    if (resolvedVariant) {
      config = { ...config, variant: resolvedVariant }
    }

    if (name === "librarian") {
      config = applyEnvironmentContext(config, directory, { disableOmoEnv })
    }

    config = applyOverrides(config, override, mergedCategories, directory)

    // Store for later - will be added after sisyphus and hephaestus
    pendingAgentConfigs.set(name, config)

    const metadata = agentMetadata[name]
    if (metadata) {
      availableAgents.push({
        name,
        description: config.description ?? "",
        metadata,
      })
    }
  }

  return { pendingAgentConfigs, availableAgents }
}
