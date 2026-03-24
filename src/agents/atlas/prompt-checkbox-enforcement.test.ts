import { describe, expect, test } from "bun:test"
import { ATLAS_SYSTEM_PROMPT } from "./default"
import { ATLAS_GEMINI_SYSTEM_PROMPT } from "./gemini"
import { ATLAS_GPT_SYSTEM_PROMPT } from "./gpt"

const atlasPrompts = [
  { name: "default", prompt: ATLAS_SYSTEM_PROMPT },
  { name: "gpt", prompt: ATLAS_GPT_SYSTEM_PROMPT },
  { name: "gemini", prompt: ATLAS_GEMINI_SYSTEM_PROMPT },
]

describe("ATLAS prompt checkbox enforcement", () => {
  test("all variants should mark the downstream plan file as read only", () => {
    // given / when / then
    for (const { prompt } of atlasPrompts) {
      expect(prompt).toContain("- Plan: `changes/{name}/tasks.md` (READ ONLY)")
    }
  })

  test("all variants should forbid editing or checkbox-marking the plan file", () => {
    // given / when / then
    for (const { prompt } of atlasPrompts) {
      const lowerPrompt = prompt.toLowerCase()

      expect(lowerPrompt).not.toContain("edit the plan checkbox")
      expect(lowerPrompt).not.toContain("change `- [ ]` to `- [x]`")
      expect(lowerPrompt).not.toContain("you may edit to mark checkboxes")
    }
  })

  test("all variants should keep plan reads but reject legacy plan paths", () => {
    // given / when / then
    for (const { prompt } of atlasPrompts) {
      expect(prompt).toMatch(/Read\("changes\/\{(?:name|plan-name)\}\/tasks\.md"\)/)
      expect(prompt).not.toContain(".sisyphus/plans/")
      expect(prompt).not.toContain(".sisyphus/tasks/")
    }
  })

  test("all variants should avoid post-delegation checkbox editing instructions", () => {
    // given / when / then
    for (const { name, prompt } of atlasPrompts) {
      if (name === "gpt") {
        expect(prompt).not.toContain("POST-DELEGATION RULE")

        continue
      }

      expect(prompt).not.toContain("POST-DELEGATION RULE")
    }
  })
})
