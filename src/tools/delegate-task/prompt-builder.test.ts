declare const require: (name: string) => unknown
const { describe, test, expect } = require("bun:test") as {
  describe: (name: string, fn: () => void) => void
  test: (name: string, fn: () => void) => void
  expect: (value: unknown) => {
    toBe: (expected: unknown) => void
    toContain: (expected: string) => void
  }
}

import { buildTaskPrompt } from "./prompt-builder"

describe("buildTaskPrompt", () => {
  test("returns the original prompt for non-plan agents", () => {
    // given
    const prompt = "Investigate the failing tests"

    // when
    const result = buildTaskPrompt(prompt, "oracle")

    // then
    expect(result).toBe(prompt)
  })

  test("returns the original prompt when no agent is provided", () => {
    // given
    const prompt = "Prepare the task handoff"

    // when
    const result = buildTaskPrompt(prompt, undefined)

    // then
    expect(result).toBe(prompt)
  })

  test("appends planning requirements after the base prompt for plan agents", () => {
    // given
    const prompt = "Plan the migration"

    // when
    const result = buildTaskPrompt(prompt, "plan")

    // then
    expect(result.slice(0, prompt.length)).toBe(prompt)
    expect(result).toContain("Additional requirements for this planning request:")
    expect(result).toContain("Use TDD-oriented planning.")
  })

  test("appends the planner-only subset for plan-family agents", () => {
    // given
    const prompt = "Prepare the task handoff"

    // when
    const result = buildTaskPrompt(prompt, "prometheus")

    // then
    expect(result.slice(0, prompt.length)).toBe(prompt)
    expect(result).toContain("Additional requirements for this planning request:")
    expect(result).toContain("When you report the plan or open questions, use plain language.")
    expect(result).toContain("Define what must be true for the plan to count as complete before you report back.")
    expect(result.includes("Never report work as done until you verify it")).toBe(false)
  })
})
