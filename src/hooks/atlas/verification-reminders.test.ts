import { describe, expect, it } from "bun:test"
import { buildOrchestratorReminder, buildCompletionGate } from "./verification-reminders"

// Test helpers for given/when/then pattern
const given = describe
const when = describe
const then = it

describe("buildCompletionGate", () => {
  given("a plan name and session id", () => {
    const planName = "test-plan"
    const sessionId = "test-session-123"

    when("buildCompletionGate is called", () => {
      const gate = buildCompletionGate(planName, sessionId)

      then("completion gate text is present", () => {
        expect(gate).toContain("COMPLETION GATE")
      })

      then("gate appears before verification phase text", () => {
        const gateIndex = gate.indexOf("COMPLETION GATE")
        const verificationIndex = gate.indexOf("VERIFICATION_REMINDER")
        expect(gateIndex).toBeLessThan(verificationIndex)
      })

      then("gate interpolates the plan name path", () => {
        expect(gate).toContain(planName)
        expect(gate).toContain(`changes/${planName}/tasks.md`)
      })

      then("gate includes Edit instructions", () => {
        expect(gate.toLowerCase()).toContain("edit")
      })

      then("gate includes Read instructions", () => {
        expect(gate.toLowerCase()).toContain("read")
      })

      then("gate focuses on immediate checkbox update workflow", () => {
        expect(gate).toContain("Your completion will NOT be recorded")
        expect(gate).toContain("DO NOT call `task()` again")
      })

      then("step numbering remains consecutive where step headers are present", () => {
        const stepMatches = gate.match(/STEP \d+:/g) ?? []
        if (stepMatches.length > 1) {
          const numbers = stepMatches.map((s: string) => parseInt(s.match(/\d+/)?.[0] ?? "0"))
          for (let i = 1; i < numbers.length; i++) {
            expect(numbers[i]).toBe(numbers[i - 1] + 1)
          }
        }
      })
    })
  })
})

describe("buildOrchestratorReminder", () => {
  given("progress with completed tasks", () => {
    const planName = "my-test-plan"
    const sessionId = "session-abc"
    const progress = { total: 10, completed: 3 }

    when("buildOrchestratorReminder is called with autoCommit true", () => {
      const reminder = buildOrchestratorReminder(planName, progress, sessionId, true)

      then("reminder includes the immediate completion step wording", () => {
        expect(reminder).toContain("STEP 7: MARK COMPLETION IN PLAN FILE (IMMEDIATELY)")
      })

      then("completion gate appears before verification reminder", () => {
        const gateIndex = reminder.indexOf("COMPLETION GATE")
        const verificationIndex = reminder.indexOf("VERIFICATION_REMINDER")
        expect(gateIndex).toBeGreaterThanOrEqual(0)
        expect(gateIndex).toBeLessThan(verificationIndex)
      })
    })

    when("buildOrchestratorReminder is called with autoCommit false", () => {
      const reminder = buildOrchestratorReminder(planName, progress, sessionId, false)

      then("reminder includes the immediate completion step wording", () => {
        expect(reminder).toContain("STEP 7: MARK COMPLETION IN PLAN FILE (IMMEDIATELY)")
      })

      then("completion gate appears before verification reminder", () => {
        const gateIndex = reminder.indexOf("COMPLETION GATE")
        const verificationIndex = reminder.indexOf("VERIFICATION_REMINDER")
        expect(gateIndex).toBeGreaterThanOrEqual(0)
        expect(gateIndex).toBeLessThan(verificationIndex)
      })
    })
  })
})
