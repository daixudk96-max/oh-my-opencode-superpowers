import {
  buildPlanAgentSystemPrepend,
  isPlanAgent,
  isPlanFamily,
} from "./constants"
import { buildSystemContentWithTokenLimit } from "./token-limiter"
import type { BuildSystemContentInput } from "./types"

const FREE_OR_LOCAL_PROMPT_TOKEN_LIMIT = 24000
const PLAN_AGENT_PROMPT_APPEND = `

Additional requirements for this planning request:
- Answer in English.
- Write the plan in English.
- Plan well for ultrawork execution.
- Use TDD-oriented planning.
- When you report the plan or open questions, use plain language.
- Define what must be true for the plan to count as complete before you report back.
- Include a clear atomic commit strategy.`

function usesFreeOrLocalModel(model: { providerID: string; modelID: string; variant?: string } | undefined): boolean {
  if (!model) {
    return false
  }

  const provider = model.providerID.toLowerCase()
  const modelId = model.modelID.toLowerCase()
  return provider.includes("local")
    || provider === "ollama"
    || provider === "lmstudio"
    || modelId.includes("free")
}

/**
 * Build the system content to inject into the agent prompt.
 * Combines skill content, category prompt append, and plan agent system prepend.
 */
export function buildSystemContent(input: BuildSystemContentInput): string | undefined {
  const {
    skillContent,
    skillContents,
    categoryPromptAppend,
    agentsContext,
    maxPromptTokens,
    model,
    agentName,
    availableCategories,
    availableSkills,
  } = input

  const planAgentPrepend = isPlanAgent(agentName)
    ? buildPlanAgentSystemPrepend(availableCategories, availableSkills)
    : ""

  const effectiveMaxPromptTokens = maxPromptTokens
    ?? (usesFreeOrLocalModel(model) ? FREE_OR_LOCAL_PROMPT_TOKEN_LIMIT : undefined)

  return buildSystemContentWithTokenLimit(
    {
      skillContent,
      skillContents,
      categoryPromptAppend,
      agentsContext: agentsContext ?? planAgentPrepend,
      planAgentPrepend,
    },
    effectiveMaxPromptTokens
  )
}

export function buildTaskPrompt(prompt: string, agentName: string | undefined): string {
  const shouldAppendPlannerSubset = isPlanFamily(agentName)

  if (!shouldAppendPlannerSubset) {
    return prompt
  }

  return `${prompt}${PLAN_AGENT_PROMPT_APPEND}`
}
