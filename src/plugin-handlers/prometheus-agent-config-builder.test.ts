/// <reference types="bun-types" />

import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { PROMETHEUS_SYSTEM_PROMPT } from "../agents/prometheus"
import { PROMETHEUS_GEMINI_SYSTEM_PROMPT } from "../agents/prometheus/gemini"
import { PROMETHEUS_GPT_SYSTEM_PROMPT } from "../agents/prometheus/gpt"
import * as shared from "../shared"
import type { ModelResolutionResult } from "../shared/model-resolution-types"
import { buildPrometheusAgentConfig } from "./prometheus-agent-config-builder"

function createResolvedModel(model: string, variant?: string): ModelResolutionResult {
  return {
    model,
    variant,
    provenance: "provider-fallback",
  }
}

describe("buildPrometheusAgentConfig", () => {
  let fetchAvailableModelsSpy: ReturnType<typeof spyOn>
  let readConnectedProvidersCacheSpy: ReturnType<typeof spyOn>
  let resolveModelPipelineSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    fetchAvailableModelsSpy = spyOn(shared, "fetchAvailableModels").mockResolvedValue(new Set<string>())
    readConnectedProvidersCacheSpy = spyOn(shared, "readConnectedProvidersCache").mockReturnValue(null)
    resolveModelPipelineSpy = spyOn(shared, "resolveModelPipeline").mockReturnValue(
      createResolvedModel("anthropic/claude-opus-4-6", "max"),
    )
  })

  afterEach(() => {
    fetchAvailableModelsSpy.mockRestore()
    readConnectedProvidersCacheSpy.mockRestore()
    resolveModelPipelineSpy.mockRestore()
  })

  test("uses the default prompt for non-GPT and non-Gemini models", async () => {
    // given
    resolveModelPipelineSpy.mockReturnValue(createResolvedModel("anthropic/claude-opus-4-6", "max"))

    // when
    const result = await buildPrometheusAgentConfig({
      configAgentPlan: undefined,
      pluginPrometheusOverride: undefined,
      userCategories: undefined,
      currentModel: "anthropic/claude-opus-4-6",
    })

    // then
    expect(result.prompt).toBe(PROMETHEUS_SYSTEM_PROMPT)
  })

  test("uses the GPT prompt for GPT models", async () => {
    // given
    resolveModelPipelineSpy.mockReturnValue(createResolvedModel("openai/gpt-5.4", "high"))

    // when
    const result = await buildPrometheusAgentConfig({
      configAgentPlan: undefined,
      pluginPrometheusOverride: undefined,
      userCategories: undefined,
      currentModel: "anthropic/claude-opus-4-6",
    })

    // then
    expect(result.prompt).toBe(PROMETHEUS_GPT_SYSTEM_PROMPT)
  })

  test("uses the Gemini prompt for Gemini models", async () => {
    // given
    resolveModelPipelineSpy.mockReturnValue(createResolvedModel("google/gemini-3.1-pro", "high"))

    // when
    const result = await buildPrometheusAgentConfig({
      configAgentPlan: undefined,
      pluginPrometheusOverride: undefined,
      userCategories: undefined,
      currentModel: "anthropic/claude-opus-4-6",
    })

    // then
    expect(result.prompt).toBe(PROMETHEUS_GEMINI_SYSTEM_PROMPT)
  })

  test("appends prompt_append after selecting the base prompt", async () => {
    // given
    const promptAppend = "## Custom Project Rules\nUse max 2 commits."
    resolveModelPipelineSpy.mockReturnValue(createResolvedModel("openai/gpt-5.4", "high"))

    // when
    const result = await buildPrometheusAgentConfig({
      configAgentPlan: undefined,
      pluginPrometheusOverride: { prompt_append: promptAppend },
      userCategories: undefined,
      currentModel: "anthropic/claude-opus-4-6",
    })

    // then
    expect(result.prompt).toBe(`${PROMETHEUS_GPT_SYSTEM_PROMPT}\n${promptAppend}`)
  })
})
