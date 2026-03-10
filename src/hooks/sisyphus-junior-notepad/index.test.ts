import { describe, expect, test, mock } from "bun:test"
import { createSisyphusJuniorNotepadHook } from "./hook"
import { NOTEPAD_DIRECTIVE } from "./constants"
import { SYSTEM_DIRECTIVE_PREFIX } from "../../shared/system-directive"

mock.module("../../shared/session-utils", () => ({
  isCallerOrchestrator: mock(async (sessionID: string) => {
    return sessionID === "orchestrator-session"
  }),
}))

describe("sisyphus-junior-notepad hook", () => {
  test("should prepend notepad directive when caller is orchestrator and tool is task", async () => {
    const ctx = { client: {} } as any
    const hook = createSisyphusJuniorNotepadHook(ctx)
    const input = { tool: "task", sessionID: "orchestrator-session", callID: "call-1" }
    const output = { args: { prompt: "Original prompt" } }

    await hook["tool.execute.before"](input, output)

    expect(output.args.prompt).toBe(NOTEPAD_DIRECTIVE + "Original prompt")
  })

  test("should NOT prepend when caller is NOT orchestrator", async () => {
    const ctx = { client: {} } as any
    const hook = createSisyphusJuniorNotepadHook(ctx)
    const input = { tool: "task", sessionID: "worker-session", callID: "call-2" }
    const output = { args: { prompt: "Original prompt" } }

    await hook["tool.execute.before"](input, output)

    expect(output.args.prompt).toBe("Original prompt")
  })

  test("should NOT prepend when tool is NOT task", async () => {
    const ctx = { client: {} } as any
    const hook = createSisyphusJuniorNotepadHook(ctx)
    const input = { tool: "bash", sessionID: "orchestrator-session", callID: "call-3" }
    const output = { args: { prompt: "Original prompt" } }

    await hook["tool.execute.before"](input, output)

    expect(output.args.prompt).toBe("Original prompt")
  })

  test("should NOT prepend if already injected with system directive prefix", async () => {
    const ctx = { client: {} } as any
    const hook = createSisyphusJuniorNotepadHook(ctx)
    const input = { tool: "task", sessionID: "orchestrator-session", callID: "call-4" }
    const alreadyInjected = SYSTEM_DIRECTIVE_PREFIX + " - SOME TYPE] Original prompt"
    const output = { args: { prompt: alreadyInjected } }

    await hook["tool.execute.before"](input, output)

    expect(output.args.prompt).toBe(alreadyInjected)
  })
})
