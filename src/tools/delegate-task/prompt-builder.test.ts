/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test"
import {
  COMPLETION_STANDARD_BEFORE_CLAIMING_DONE_FRAGMENT,
  PLAIN_LANGUAGE_REPORTING_FRAGMENT,
  VERIFY_BEFORE_REPORTING_COMPLETION_FRAGMENT,
} from "../../shared/communication-verification-fragments"
import { buildTaskPrompt } from "./prompt-builder"

describe("buildTaskPrompt", () => {
  test("adds the selective plan family reporting subset after the base prompt", () => {
    const prompt = "Investigate the regression"

    const result = buildTaskPrompt(prompt, "plan")

    expect(result).not.toBe(prompt)
    expect(result.slice(0, prompt.length)).toBe(prompt)
    expect(result).toContain("Additional requirements for this planning request:")
    expect(result).toContain(PLAIN_LANGUAGE_REPORTING_FRAGMENT)
    expect(result).toContain(COMPLETION_STANDARD_BEFORE_CLAIMING_DONE_FRAGMENT)
    expect(result).not.toContain(VERIFY_BEFORE_REPORTING_COMPLETION_FRAGMENT)
  })

  test("keeps non-plan prompts unchanged for prometheus plan family overrides", () => {
    const prompt = "Investigate the regression"

    expect(buildTaskPrompt(prompt, "prometheus")).toBe(prompt)
  })

  test("keeps non-plan prompts unchanged for ordinary agents", () => {
    const prompt = "Investigate the regression"

    expect(buildTaskPrompt(prompt, "oracle")).toBe(prompt)
    expect(buildTaskPrompt(prompt, undefined)).toBe(prompt)
  })
})
