import { describe, expect, it } from "bun:test"
import { bootstrapDownstreamHooks } from "./runtime-hook-executor"
import type { HookManifest } from "./types"

describe("bootstrapDownstreamHooks", () => {
  it("#given a UserPromptSubmit lifecycle #when bootstrapping #then registers and executes the handler", async () => {
    const calls: Array<{ sessionID: string; prompt: string }> = []
    const manifests: HookManifest[] = [
      {
        name: "failure-counter",
        lifecycle: ["UserPromptSubmit"],
        factory: () => ({
          UserPromptSubmit: async (
            input: { sessionID: string; prompt: string },
            output: { blocked?: boolean; message?: string; messages?: Array<{ role: string; content: string }> },
          ): Promise<void> => {
            calls.push(input)
            output.blocked = true
            output.message = "reset"
            output.messages = [{ role: "system", content: "reset done" }]
          },
        }),
      },
    ]

    const downstreamHooks = await bootstrapDownstreamHooks({
      ctx: { directory: process.cwd() } as never,
      manifests,
    })
    const output: {
      blocked?: boolean
      message?: string
      messages?: Array<{ role: string; content: string }>
    } = {}

    await downstreamHooks.runUserPromptSubmit(
      { sessionID: "session-1", prompt: "/reset-failures" },
      output,
    )

    expect(calls).toEqual([{ sessionID: "session-1", prompt: "/reset-failures" }])
    expect(output).toEqual({
      blocked: true,
      message: "reset",
      messages: [{ role: "system", content: "reset done" }],
    })
  })
})
