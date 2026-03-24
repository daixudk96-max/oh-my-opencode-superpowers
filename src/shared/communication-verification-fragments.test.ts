import { describe, expect, test } from "bun:test"
import * as fragments from "./communication-verification-fragments"

const expectedPlainLanguageReportingFragment = "Use clear, direct English when you report status, plans, and results. Prefer concrete facts over jargon, hedging, or vague summaries."
const expectedVerifyBeforeReportingCompletionFragment = "Do not report completion until you have verified the relevant files, outputs, or tests. Check first, then report the verified result."
const expectedCompletionStandardBeforeClaimingDoneFragment = "Before you say a task is done, make the completion standard explicit and confirm that the standard is met."

describe("communication-verification fragments", () => {
  test("exports only the approved named fragments", () => {
    expect(Object.keys(fragments).sort()).toEqual([
      "COMPLETION_STANDARD_BEFORE_CLAIMING_DONE_FRAGMENT",
      "PLAIN_LANGUAGE_REPORTING_FRAGMENT",
      "VERIFY_BEFORE_REPORTING_COMPLETION_FRAGMENT",
    ])

    expect(fragments.PLAIN_LANGUAGE_REPORTING_FRAGMENT).toBe(expectedPlainLanguageReportingFragment)
    expect(fragments.VERIFY_BEFORE_REPORTING_COMPLETION_FRAGMENT).toBe(expectedVerifyBeforeReportingCompletionFragment)
    expect(fragments.COMPLETION_STANDARD_BEFORE_CLAIMING_DONE_FRAGMENT).toBe(expectedCompletionStandardBeforeClaimingDoneFragment)
  })

  test("keeps each fragment as a focused English instruction", () => {
    for (const fragment of Object.values(fragments)) {
      expect(fragment).toMatch(/[A-Za-z]/)
      expect(fragment).not.toMatch(/[\u3400-\u9FFF]/)
      expect(fragment.trim()).toBe(fragment)
    }
  })

  test("full instruction block is not exported by any single fragment", () => {
    const fullInstructionBlock = [
      expectedPlainLanguageReportingFragment,
      expectedVerifyBeforeReportingCompletionFragment,
      expectedCompletionStandardBeforeClaimingDoneFragment,
    ].join("\n\n")

    expect(fragments.PLAIN_LANGUAGE_REPORTING_FRAGMENT).toBe(expectedPlainLanguageReportingFragment)
    expect(fragments.PLAIN_LANGUAGE_REPORTING_FRAGMENT).not.toBe(fullInstructionBlock)
    expect(fragments.PLAIN_LANGUAGE_REPORTING_FRAGMENT).not.toContain(expectedVerifyBeforeReportingCompletionFragment)
    expect(fragments.PLAIN_LANGUAGE_REPORTING_FRAGMENT).not.toContain(expectedCompletionStandardBeforeClaimingDoneFragment)

    expect(fragments.VERIFY_BEFORE_REPORTING_COMPLETION_FRAGMENT).toBe(expectedVerifyBeforeReportingCompletionFragment)
    expect(fragments.VERIFY_BEFORE_REPORTING_COMPLETION_FRAGMENT).not.toBe(fullInstructionBlock)
    expect(fragments.VERIFY_BEFORE_REPORTING_COMPLETION_FRAGMENT).not.toContain(expectedPlainLanguageReportingFragment)
    expect(fragments.VERIFY_BEFORE_REPORTING_COMPLETION_FRAGMENT).not.toContain(expectedCompletionStandardBeforeClaimingDoneFragment)

    expect(fragments.COMPLETION_STANDARD_BEFORE_CLAIMING_DONE_FRAGMENT).toBe(expectedCompletionStandardBeforeClaimingDoneFragment)
    expect(fragments.COMPLETION_STANDARD_BEFORE_CLAIMING_DONE_FRAGMENT).not.toBe(fullInstructionBlock)
    expect(fragments.COMPLETION_STANDARD_BEFORE_CLAIMING_DONE_FRAGMENT).not.toContain(expectedPlainLanguageReportingFragment)
    expect(fragments.COMPLETION_STANDARD_BEFORE_CLAIMING_DONE_FRAGMENT).not.toContain(expectedVerifyBeforeReportingCompletionFragment)
  })

  test("single block fallback names are not exported", () => {
    expect(Object.keys(fragments)).not.toContain("COMMUNICATION_VERIFICATION_FRAGMENT")
    expect(Object.keys(fragments)).not.toContain("COMMUNICATION_VERIFICATION_FRAGMENTS")
    expect(Object.keys(fragments)).not.toContain("FULL_COMMUNICATION_VERIFICATION_BLOCK")
  })

  test("verbatim corpus is not re-exported as an individual fragment", () => {
    const combinedCorpus = Object.values(fragments).join("\n\n")

    for (const fragment of Object.values(fragments)) {
      expect(fragment).not.toBe(combinedCorpus)
    }
  })
})
