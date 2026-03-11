import { describe, expect, test } from "bun:test"
import { createSisyphusAgent } from "./sisyphus"

describe("Sisyphus prompt plan review gate", () => {
  test("should require explicit plan review confirmation", () => {
    // #given
    const prompt = createSisyphusAgent("anthropic/claude-opus-4-5").prompt ?? ""

    // #when / #then
    expect(prompt.toLowerCase()).toMatch(/plan review gate|plan审查门控/)
    expect(prompt.toLowerCase()).toMatch(/wait.*confirm|等待.*确认|explicit.*confirm/)
  })

  test("should advertise agent chain runtime options in prompt path", () => {
    // #given
    const prompt = createSisyphusAgent("anthropic/claude-opus-4-5").prompt ?? ""

    // #when / #then
    expect(prompt).toContain("Agent Chains")
    expect(prompt).toContain("Use `--chain bugfix` or `--chain refactor`")
    expect(prompt).toContain("--chain bugfix")
    expect(prompt).toContain("--chain refactor")
  })
})
