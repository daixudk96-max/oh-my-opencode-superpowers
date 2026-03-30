import { describe, expect, test } from "bun:test"

import { PROMETHEUS_SYSTEM_PROMPT } from "./prometheus"
import { PROMETHEUS_GEMINI_SYSTEM_PROMPT } from "./prometheus/gemini"
import { PROMETHEUS_GPT_SYSTEM_PROMPT } from "./prometheus/gpt"

describe("Prometheus prompts planner scope rules", () => {
  const prompts = [
    PROMETHEUS_SYSTEM_PROMPT,
    PROMETHEUS_GPT_SYSTEM_PROMPT,
    PROMETHEUS_GEMINI_SYSTEM_PROMPT,
  ]

  test("all prompt variants should allow docs and limited .sisyphus planner state", () => {
    for (const prompt of prompts) {
      expect(prompt).toContain("docs/**/*.md")
      expect(prompt).toContain(".sisyphus/boulder.json")
      expect(prompt).toContain(".sisyphus/run-continuation/**/*.json")
    }
  })

  test("all prompt variants should keep changes as default plan location", () => {
    for (const prompt of prompts) {
      expect(prompt).toContain("changes/{name}/tasks.md")
      expect(prompt).toContain("changes/{name}/proposal.md")
    }
  })

  test("all prompt variants should reject nested lookalike directories instead of broad substring matching", () => {
    for (const prompt of prompts) {
      expect(prompt).toMatch(/src\/changes\//)
      expect(prompt).toMatch(/foo\/docs\//)
      expect(prompt).toMatch(/root-anchored|root anchored/)
    }
  })
})
