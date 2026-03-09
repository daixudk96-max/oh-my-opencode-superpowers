import { describe, it, expect } from "bun:test"
import { BASH_FILE_CREATION_PATTERNS } from "./constants"

describe("BASH_FILE_CREATION_PATTERNS", () => {
  it("should match redirection to tasks.md", () => {
    const command = "echo test > changes/foo/tasks.md"
    const matches = BASH_FILE_CREATION_PATTERNS.some(regex => regex.test(command))
    expect(matches).toBe(true)
  })

  it("should match cat redirection to tasks.md", () => {
    const command = "cat template.md > changes/bar/tasks.md"
    const matches = BASH_FILE_CREATION_PATTERNS.some(regex => regex.test(command))
    expect(matches).toBe(true)
  })

  it("should match touch tasks.md", () => {
    const command = "touch changes/baz/tasks.md"
    const matches = BASH_FILE_CREATION_PATTERNS.some(regex => regex.test(command))
    expect(matches).toBe(true)
  })

  it("should match cp to tasks.md", () => {
    const command = "cp old.md changes/qux/tasks.md"
    const matches = BASH_FILE_CREATION_PATTERNS.some(regex => regex.test(command))
    expect(matches).toBe(true)
  })

  it("should match mv to tasks.md", () => {
    const command = "mv temp.md changes/quux/tasks.md"
    const matches = BASH_FILE_CREATION_PATTERNS.some(regex => regex.test(command))
    expect(matches).toBe(true)
  })

  it("should match redirection to plan.md", () => {
    const command = "echo test > changes/foo/plan.md"
    const matches = BASH_FILE_CREATION_PATTERNS.some(regex => regex.test(command))
    expect(matches).toBe(true)
  })
})
