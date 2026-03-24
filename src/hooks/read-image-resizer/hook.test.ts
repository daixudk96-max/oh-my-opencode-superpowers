/// <reference types="bun-types" />

import { afterEach, describe, expect, it } from "bun:test"
import type { PluginInput } from "@opencode-ai/plugin"
import { createReadImageResizerHook } from "./hook"
import { clearSessionModel, setSessionModel } from "../../shared/session-model-state"

const SESSION_ID = "ses_read_image_resizer"
const PNG_1X1_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

type ToolOutput = {
  title: string
  output: string
  metadata: unknown
  attachments?: Array<{ mime: string; url: string; filename?: string }>
}

function createMockContext(): PluginInput {
  return {
    client: {} as PluginInput["client"],
    directory: "/test",
  } as PluginInput
}

function createInput(tool: string): { tool: string; sessionID: string; callID: string } {
  return {
    tool,
    sessionID: SESSION_ID,
    callID: "call-1",
  }
}

describe("createReadImageResizerHook", () => {
  afterEach(() => {
    clearSessionModel(SESSION_ID)
  })

  it("skips non-Read tools", async () => {
    setSessionModel(SESSION_ID, { providerID: "anthropic", modelID: "claude-sonnet-4-6" })
    const hook = createReadImageResizerHook(createMockContext())
    const output: ToolOutput = {
      title: "Read",
      output: "original output",
      metadata: {},
      attachments: [{ mime: "image/png", url: PNG_1X1_DATA_URL, filename: "image.png" }],
    }

    await hook["tool.execute.after"](createInput("Bash"), output)

    expect(output.output).toBe("original output")
  })

  it("skips when provider is not anthropic", async () => {
    setSessionModel(SESSION_ID, { providerID: "openai", modelID: "gpt-5.3-codex" })
    const hook = createReadImageResizerHook(createMockContext())
    const output: ToolOutput = {
      title: "Read",
      output: "original output",
      metadata: {},
      attachments: [{ mime: "image/png", url: PNG_1X1_DATA_URL, filename: "image.png" }],
    }

    await hook["tool.execute.after"](createInput("Read"), output)

    expect(output.output).toBe("original output")
  })

  it("appends within-limits metadata when image dimensions are valid", async () => {
    setSessionModel(SESSION_ID, { providerID: "anthropic", modelID: "claude-sonnet-4-6" })
    const hook = createReadImageResizerHook(createMockContext())
    const output: ToolOutput = {
      title: "Read",
      output: "original output",
      metadata: {},
      attachments: [{ mime: "image/png", url: PNG_1X1_DATA_URL, filename: "image.png" }],
    }

    await hook["tool.execute.after"](createInput("Read"), output)

    expect(output.output).toContain("[Image Info]")
    expect(output.output).toContain("within limits")
    expect(output.attachments?.[0]?.url).toBe(PNG_1X1_DATA_URL)
  })

  it("appends unknown-dimensions metadata when dimensions cannot be parsed", async () => {
    setSessionModel(SESSION_ID, { providerID: "anthropic", modelID: "claude-sonnet-4-6" })
    const hook = createReadImageResizerHook(createMockContext())
    const output: ToolOutput = {
      title: "Read",
      output: "original output",
      metadata: {},
      attachments: [{ mime: "image/png", url: "data:image/png;base64,AAAA", filename: "broken.png" }],
    }

    await hook["tool.execute.after"](createInput("Read"), output)

    expect(output.output).toContain("dimensions could not be parsed")
    expect(output.attachments?.[0]?.url).toBe("data:image/png;base64,AAAA")
  })
})
