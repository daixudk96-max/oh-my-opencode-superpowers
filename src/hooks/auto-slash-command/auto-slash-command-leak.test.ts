import { describe, expect, it, mock, spyOn } from "bun:test"
import type { LoadedSkill } from "../../features/opencode-skill-loader/types"
import { AUTO_SLASH_COMMAND_TAG_OPEN } from "./constants"
import { createAutoSlashCommandHook } from "./hook"
import { createProcessedCommandStore } from "./processed-command-store"

function createSkill(name: string): LoadedSkill {
  return {
    name,
    path: `/tmp/${name}/SKILL.md`,
    definition: {
      name,
      description: "test skill",
      template: "Skill template",
    },
    scope: "user",
  }
}

function createCommandOutput(text: string) {
  return {
    parts: [{ type: "text", text }],
  }
}

describe("createAutoSlashCommandHook leak prevention", () => {
  it("suppresses fallback duplicate command dispatches inside 100ms window", async () => {
    const hook = createAutoSlashCommandHook({ skills: [createSkill("dedup-skill")] })
    const nowSpy = spyOn(Date, "now")

    try {
      const firstOutput = createCommandOutput("first")
      const secondOutput = createCommandOutput("second")
      const input = {
        sessionID: "session-dedup",
        command: "dedup-skill",
        arguments: "",
      }

      nowSpy.mockReturnValue(0)
      await hook["command.execute.before"](input, firstOutput)
      nowSpy.mockReturnValue(99)
      await hook["command.execute.before"](input, secondOutput)

      expect(firstOutput.parts[0].text).toContain(AUTO_SLASH_COMMAND_TAG_OPEN)
      expect(secondOutput.parts[0].text).toBe("second")
    } finally {
      nowSpy.mockRestore()
      hook.dispose()
    }
  })

  it("allows intentional rerun after fallback dedup window expires", async () => {
    const hook = createAutoSlashCommandHook({ skills: [createSkill("dedup-skill")] })
    const nowSpy = spyOn(Date, "now")

    try {
      const firstOutput = createCommandOutput("first")
      const secondOutput = createCommandOutput("second")
      const input = {
        sessionID: "session-dedup",
        command: "dedup-skill",
        arguments: "",
      }

      nowSpy.mockReturnValue(0)
      await hook["command.execute.before"](input, firstOutput)
      nowSpy.mockReturnValue(101)
      await hook["command.execute.before"](input, secondOutput)

      expect(firstOutput.parts[0].text).toContain(AUTO_SLASH_COMMAND_TAG_OPEN)
      expect(secondOutput.parts[0].text).toContain(AUTO_SLASH_COMMAND_TAG_OPEN)
    } finally {
      nowSpy.mockRestore()
      hook.dispose()
    }
  })

  it("deduplicates repeated dispatch for the same explicit event identifier", async () => {
    const hook = createAutoSlashCommandHook({ skills: [createSkill("dedup-skill")] })
    const nowSpy = spyOn(Date, "now")

    try {
      const firstOutput = createCommandOutput("first")
      const secondOutput = createCommandOutput("second")
      const input = {
        sessionID: "session-dedup",
        command: "dedup-skill",
        arguments: "",
        eventID: "event-1",
      }

      nowSpy.mockReturnValue(0)
      await hook["command.execute.before"](input, firstOutput)
      nowSpy.mockReturnValue(29_999)
      await hook["command.execute.before"](input, secondOutput)

      expect(firstOutput.parts[0].text).toContain(AUTO_SLASH_COMMAND_TAG_OPEN)
      expect(secondOutput.parts[0].text).toBe("second")
    } finally {
      nowSpy.mockRestore()
      hook.dispose()
    }
  })

  it("clears processed state on dispose", async () => {
    const hook = createAutoSlashCommandHook({ skills: [createSkill("dispose-skill")] })
    const input = {
      sessionID: "session-chat",
      messageID: "message-1",
      agent: "hephaestus",
    }

    const firstOutput = {
      message: {},
      parts: [{ type: "text", text: "/dispose-skill" }],
    }
    const dedupedOutput = {
      message: {},
      parts: [{ type: "text", text: "/dispose-skill" }],
    }
    const afterDisposeOutput = {
      message: {},
      parts: [{ type: "text", text: "/dispose-skill" }],
    }

    await hook["chat.message"](input, firstOutput)
    await hook["chat.message"](input, dedupedOutput)
    hook.dispose()
    await hook["chat.message"](input, afterDisposeOutput)

    expect(firstOutput.parts[0].text).toContain(AUTO_SLASH_COMMAND_TAG_OPEN)
    expect(dedupedOutput.parts[0].text).toBe("/dispose-skill")
    expect(afterDisposeOutput.parts[0].text).toContain(AUTO_SLASH_COMMAND_TAG_OPEN)
  })

  it("drops expired entries before evaluating duplicates", () => {
    const store = createProcessedCommandStore()
    const nowSpy = spyOn(Date, "now")

    try {
      nowSpy.mockReturnValue(0)
      for (let index = 0; index < 500; index += 1) {
        store.add(`session:${index}`, 10)
      }

      nowSpy.mockReturnValue(100)
      expect(store.has("session:0")).toBe(false)
      expect(store.has("session:499")).toBe(false)
    } finally {
      nowSpy.mockRestore()
    }
  })
})
