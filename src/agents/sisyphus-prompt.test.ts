import { describe, expect, test } from "bun:test"
import { createSisyphusAgent } from "./sisyphus"

describe("Sisyphus execution reporting instructions", () => {
  test("keeps execution reporting rules in one implementation block", () => {
    // given
    const prompt = createSisyphusAgent("anthropic/claude-opus-4-5").prompt ?? ""
    const heading = "### Execution Reporting Standard"
    const headingCount = prompt.match(/### Execution Reporting Standard/g)?.length ?? 0

    // when / then
    expect(headingCount).toBe(1)
    expect(prompt.indexOf(heading)).toBeGreaterThan(prompt.indexOf("## Phase 2B - Implementation"))
    expect(prompt.indexOf(heading)).toBeLessThan(prompt.indexOf("### Code Changes:"))
    expect(prompt).toContain("Before execution, define the concrete done criteria")
    expect(prompt).toContain("When you update the user, use plain language")
    expect(prompt).toContain("Never report work as done until you verify it")
    expect(prompt).toContain("If verification is still pending, say so directly")
  })

  test("keeps orchestration guardrails intact", () => {
    // given
    const prompt = createSisyphusAgent("anthropic/claude-opus-4-5").prompt ?? ""

    // when / then
    expect(prompt).toContain("If you think there is even a 1% chance a skill might apply")
    expect(prompt).toContain("Default Bias: DELEGATE")
    expect(prompt).toContain("DO NOT perform the same search yourself")
  })
})
