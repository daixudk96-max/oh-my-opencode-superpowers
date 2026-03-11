import { describe, it, expect } from "bun:test"
import type { HookManifest, SkillManifest } from "./types"

describe("Manifest Types", () => {
  it("should allow valid HookManifest", () => {
    const manifest: HookManifest = {
      name: "test-hook",
      lifecycle: ["chat.message"],
      factory: () => ({
        "chat.message": async () => {}
      })
    }
    expect(manifest.name).toBe("test-hook")
    expect(manifest.lifecycle).toContain("chat.message")
  })

  it("should allow valid SkillManifest", () => {
    const manifest: SkillManifest = {
      name: "test-skill",
      skill: {
        name: "test-skill",
        description: "test description",
        template: "test template",
      }
    }
    expect(manifest.name).toBe("test-skill")
    expect(manifest.skill.name).toBe("test-skill")
  })
})
