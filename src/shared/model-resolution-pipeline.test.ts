import { describe, expect, test } from "bun:test"
import { resolveModelPipeline } from "./model-resolution-pipeline"

describe("resolveModelPipeline", () => {
  test("does not return unused explicit user config metadata in override result", () => {
    // given
    const result = resolveModelPipeline({
      intent: {
        userModel: "openai/gpt-5.3-codex",
      },
      constraints: {
        availableModels: new Set<string>(),
      },
    })

    // when
    const hasExplicitUserConfigField = result
      ? Object.prototype.hasOwnProperty.call(result, "explicitUserConfig")
      : false

    // then
    expect(result).toEqual({ model: "openai/gpt-5.3-codex", provenance: "override" })
    expect(hasExplicitUserConfigField).toBe(false)
  })

  test("respects userModel even if availableModels is empty", () => {
    const result = resolveModelPipeline({
      intent: { userModel: "opencode/big-pickle" },
      constraints: { availableModels: new Set() }
    })
    expect(result?.model).toBe("opencode/big-pickle")
    expect(result?.provenance).toBe("override")
  })

  test("respects systemDefaultModel if nothing else is provided", () => {
    const result = resolveModelPipeline({
      constraints: { availableModels: new Set() },
      policy: { systemDefaultModel: "google/gemini-3-flash" }
    })
    expect(result?.model).toBe("google/gemini-3-flash")
    expect(result?.provenance).toBe("system-default")
  })
})
