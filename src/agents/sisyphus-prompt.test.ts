import { describe, expect, test } from "bun:test"

import type { AvailableAgent } from "./dynamic-agent-prompt-builder"
import { createSisyphusAgent } from "./sisyphus"

const exploreAgent = {
  name: "explore",
  description: "Contextual grep specialist",
  metadata: {
    category: "advisor",
    cost: "FREE",
    promptAlias: "Explore",
    triggers: [],
    useWhen: ["Multiple search angles needed"],
    avoidWhen: ["Single keyword search is enough"],
  },
} satisfies AvailableAgent

function buildPrompt(): string {
  return createSisyphusAgent("anthropic/claude-opus-4-6", [exploreAgent]).prompt ?? ""
}

describe("Sisyphus prompt execution reporting subset", () => {
  test("adds plain-language progress updates in the behavior output area", () => {
    //#given
    const prompt = buildPrompt()

    //#when / #then
    expect(prompt).toContain("## Phase 2D - User Updates and Reporting")
    expect(prompt).toContain("Keep the user updated at meaningful milestones.")
    expect(prompt).toContain("Use plain language.")
    expect(prompt).toContain("Include at least one concrete detail in each update")
  })

  test("adds verify-before-reporting completion guidance and explicit done criteria", () => {
    //#given
    const prompt = buildPrompt()

    //#when / #then
    expect(prompt).toContain("### Before You Report Completion")
    expect(prompt).toContain("Say what must be true for this request to count as done.")
    expect(prompt).toContain("Verify the relevant files, outputs, or tests before you report completion.")
    expect(prompt).toContain("Report the verified result only after those checks pass.")
  })
})

describe("Sisyphus prompt orchestration guardrails", () => {
  test("delegation rules remain intact", () => {
    //#given
    const prompt = buildPrompt()

    //#when / #then
    expect(prompt).toContain("You NEVER work alone when specialists are available")
    expect(prompt).toContain("Default Bias: DELEGATE")
  })

  test("skill discipline remains intact", () => {
    //#given
    const prompt = buildPrompt()

    //#when / #then
    expect(prompt).toContain("If you think there is even a 1% chance a skill might apply")
    expect(prompt).toContain("Invoke relevant or requested skills BEFORE any response or action.")
  })

  test("anti-duplication guidance remains intact", () => {
    //#given
    const prompt = buildPrompt()

    //#when / #then
    expect(prompt).toContain("Continue only with non-overlapping work")
    expect(prompt).toContain("DO NOT perform the same search yourself")
  })

  test("no full instruction block is pasted into the prompt", () => {
    //#given
    const prompt = buildPrompt()
    const fullInstructionBlock = [
      "Use clear, direct English " +
        "when you report status, plans, and results. Prefer concrete facts over jargon, hedging, or vague summaries.",
      "Do not report completion until you have verified " +
        "the relevant files, outputs, or tests. Check first, then report the verified result.",
      "Before you say a task is done, make " +
        "the completion standard explicit and confirm that the standard is met.",
    ].join("\n\n")

    //#when / #then
    expect(prompt).not.toContain(fullInstructionBlock)
  })
})
