import { describe, expect, test } from "bun:test"
import {
  COMPLETION_STANDARD_BEFORE_CLAIMING_DONE_FRAGMENT,
  PLAIN_LANGUAGE_REPORTING_FRAGMENT,
  VERIFY_BEFORE_REPORTING_COMPLETION_FRAGMENT,
} from "../shared/communication-verification-fragments"
import { PROMETHEUS_SYSTEM_PROMPT } from "./prometheus"
import { PROMETHEUS_GEMINI_SYSTEM_PROMPT } from "./prometheus/gemini"
import { PROMETHEUS_GPT_SYSTEM_PROMPT } from "./prometheus/gpt"

describe("PROMETHEUS_SYSTEM_PROMPT Momus invocation policy", () => {
  test("should direct providing ONLY the file path string when invoking Momus", () => {
    //#given
    const prompt = PROMETHEUS_SYSTEM_PROMPT

    //#when / #then
    expect(prompt.toLowerCase()).toMatch(/momus.*only.*path|path.*only.*momus/)
  })

  test("should forbid wrapping Momus invocation in explanations or markdown", () => {
    //#given
    const prompt = PROMETHEUS_SYSTEM_PROMPT

    //#when / #then
    expect(prompt.toLowerCase()).toMatch(/not.*wrap|no.*explanation|no.*markdown/)
  })
})

describe("PROMETHEUS_SYSTEM_PROMPT zero human intervention", () => {
  test("should enforce universal zero human intervention rule", () => {
    //#given
    const prompt = PROMETHEUS_SYSTEM_PROMPT

    //#when
    const lowerPrompt = prompt.toLowerCase()

    //#then
    expect(lowerPrompt).toContain("zero human intervention")
    expect(lowerPrompt).toContain("forbidden")
    expect(lowerPrompt).toMatch(/user manually tests|사용자가 직접 테스트/)
  })

  test("should require agent-executed QA scenarios as mandatory for all tasks", () => {
    //#given
    const prompt = PROMETHEUS_SYSTEM_PROMPT

    //#when
    const lowerPrompt = prompt.toLowerCase()

    //#then
    expect(lowerPrompt).toContain("agent-executed qa scenarios")
    expect(lowerPrompt).toMatch(/mandatory.*all tasks|all tasks.*mandatory/)
  })

  test("should not contain ambiguous 'manual QA' terminology", () => {
    //#given
    const prompt = PROMETHEUS_SYSTEM_PROMPT

    //#when / #then
    expect(prompt).not.toMatch(/manual QA procedures/i)
    expect(prompt).not.toMatch(/manual verification procedures/i)
    expect(prompt).not.toMatch(/Manual-only/i)
  })

  test("should require per-scenario format with detailed structure", () => {
    //#given
    const prompt = PROMETHEUS_SYSTEM_PROMPT

    //#when
    const lowerPrompt = prompt.toLowerCase()

    //#then
    expect(lowerPrompt).toContain("preconditions")
    expect(lowerPrompt).toContain("failure indicators")
    expect(lowerPrompt).toContain("evidence")
    expect(prompt).toMatch(/negative/i)
  })

  test("should require QA scenario adequacy in self-review checklist", () => {
    //#given
    const prompt = PROMETHEUS_SYSTEM_PROMPT

    //#when
    const lowerPrompt = prompt.toLowerCase()

    //#then
    expect(lowerPrompt).toMatch(/every task has agent-executed qa scenarios/)
    expect(lowerPrompt).toMatch(/happy-path and negative/)
    expect(lowerPrompt).toMatch(/zero acceptance criteria require human/)
  })
})

describe("Prometheus prompts anti-duplication coverage", () => {
  test("all variants should include anti-duplication rules for delegated exploration", () => {
    // given
    const prompts = [
      PROMETHEUS_SYSTEM_PROMPT,
      PROMETHEUS_GPT_SYSTEM_PROMPT,
      PROMETHEUS_GEMINI_SYSTEM_PROMPT,
    ]

    // when / then
    for (const prompt of prompts) {
      expect(prompt).toContain("<Anti_Duplication>")
      expect(prompt).toContain("Anti-Duplication Rule")
      expect(prompt).toContain("DO NOT perform the same search yourself")
      expect(prompt).toContain("non-overlapping work")
    }
  })
})

describe("Prometheus prompts planner-only reporting guidance", () => {
  const promptVariants = [
    ["default variant", PROMETHEUS_SYSTEM_PROMPT],
    ["gpt variant", PROMETHEUS_GPT_SYSTEM_PROMPT],
    ["gemini variant", PROMETHEUS_GEMINI_SYSTEM_PROMPT],
  ] as const

  test("planner only guidance should exist in every variant", () => {
    for (const [, prompt] of promptVariants) {
      expect(prompt).toContain(PLAIN_LANGUAGE_REPORTING_FRAGMENT)
      expect(prompt).toContain(COMPLETION_STANDARD_BEFORE_CLAIMING_DONE_FRAGMENT)
    }
  })

  test("each variant should define what plan complete means before reporting back", () => {
    for (const [variant, prompt] of promptVariants) {
      expect(prompt.toLowerCase()).toMatch(
        /tasks\.md.*(scope|key decisions)|(scope|key decisions).*(tasks\.md|start-work)|open decisions|assumptions|start-work/
      )
      expect(prompt.toLowerCase()).toMatch(/plan complete|planning completion|planner mode|report the plan status/)
      expect(variant).toMatch(/variant/)
    }
  })

  test("no execution-only reporting language should appear in any variant", () => {
    for (const [, prompt] of promptVariants) {
      expect(prompt).not.toContain(VERIFY_BEFORE_REPORTING_COMPLETION_FRAGMENT)
      expect(prompt.toLowerCase()).not.toContain("check first, then report the verified result")
    }
  })
})
