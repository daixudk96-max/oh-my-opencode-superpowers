import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"

import { PROMETHEUS_SYSTEM_PROMPT } from "../agents/prometheus"
import { PROMETHEUS_GEMINI_SYSTEM_PROMPT } from "../agents/prometheus/gemini"
import { PROMETHEUS_GPT_SYSTEM_PROMPT } from "../agents/prometheus/gpt"

const shared = require("../shared")
const { buildPrometheusAgentConfig } = require("./prometheus-agent-config-builder")

describe("buildPrometheusAgentConfig prompt selection", () => {
  let fetchAvailableModelsSpy: ReturnType<typeof spyOn>
  let readConnectedProvidersCacheSpy: ReturnType<typeof spyOn>
  let resolveModelPipelineSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    fetchAvailableModelsSpy = spyOn(shared, "fetchAvailableModels").mockResolvedValue(
      new Set(["anthropic/claude-opus-4-6", "openai/gpt-5.4", "google/gemini-3.1-pro"]),
    )
    readConnectedProvidersCacheSpy = spyOn(shared, "readConnectedProvidersCache").mockReturnValue(
      null,
    )
    resolveModelPipelineSpy = spyOn(shared, "resolveModelPipeline")
  })

  afterEach(() => {
    resolveModelPipelineSpy.mockRestore()
    readConnectedProvidersCacheSpy.mockRestore()
    fetchAvailableModelsSpy.mockRestore()
  })

  const promptCases = [
    {
      label: "default prompt for claude-family models",
      resolvedModel: "anthropic/claude-opus-4-6",
      expectedPrompt: PROMETHEUS_SYSTEM_PROMPT,
    },
    {
      label: "gpt prompt for gpt-family models",
      resolvedModel: "openai/gpt-5.4",
      expectedPrompt: PROMETHEUS_GPT_SYSTEM_PROMPT,
    },
    {
      label: "gemini prompt for gemini-family models",
      resolvedModel: "google/gemini-3.1-pro",
      expectedPrompt: PROMETHEUS_GEMINI_SYSTEM_PROMPT,
    },
  ] as const

  for (const promptCase of promptCases) {
    test(`uses the ${promptCase.label}`, async () => {
      resolveModelPipelineSpy.mockReturnValue({
        model: promptCase.resolvedModel,
        variant: undefined,
      })

      const result = await buildPrometheusAgentConfig({
        configAgentPlan: undefined,
        pluginPrometheusOverride: undefined,
        userCategories: undefined,
        currentModel: undefined,
      })

      expect(resolveModelPipelineSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: expect.objectContaining({
            userModel: undefined,
            uiSelectedModel: undefined,
          }),
        }),
      )
      expect(result).toEqual(
        expect.objectContaining({
          model: promptCase.resolvedModel,
          prompt: promptCase.expectedPrompt,
        }),
      )
    })
  }

  test("applies prompt_append after the selected base prompt", async () => {
    resolveModelPipelineSpy.mockReturnValue({
      model: "openai/gpt-5.4",
      variant: undefined,
    })

    const result = await buildPrometheusAgentConfig({
      configAgentPlan: undefined,
      pluginPrometheusOverride: {
        model: "openai/gpt-5.4",
        prompt_append: "CUSTOM_APPEND_MARKER",
      },
      userCategories: undefined,
      currentModel: undefined,
    })

    expect(result).toEqual(
      expect.objectContaining({
        model: "openai/gpt-5.4",
      }),
    )
    expect(result.prompt).toBe(`${PROMETHEUS_GPT_SYSTEM_PROMPT}\nCUSTOM_APPEND_MARKER`)
    expect(String(result.prompt).startsWith("CUSTOM_APPEND_MARKER")).toBe(false)
  })
})
