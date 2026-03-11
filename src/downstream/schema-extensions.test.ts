import { describe, expect, it } from "bun:test"
import { HookNameSchema } from "../config/schema/hooks"
import { extendHookNameSchema } from "./schema-extensions"

describe("extendHookNameSchema", () => {
  it("#given additional downstream hooks #when extending #then accepts built-in and additional names", () => {
    const schema = extendHookNameSchema(["downstream-hook-a", "downstream-hook-b"])

    expect(schema.safeParse("comment-checker").success).toBe(true)
    expect(schema.safeParse("downstream-hook-a").success).toBe(true)
    expect(schema.safeParse("downstream-hook-b").success).toBe(true)
    expect(schema.safeParse("unknown-hook-name").success).toBe(false)
  })

  it("#given empty additional names #when extending #then remains equivalent to base schema", () => {
    const schema = extendHookNameSchema([])

    expect(schema.safeParse("comment-checker").success).toBe(true)
    expect(schema.safeParse("downstream-only").success).toBe(false)
  })

  it("#given extended schema #when checking base schema #then base schema remains unchanged for loose compatibility", () => {
    const schema = extendHookNameSchema(["custom-hook-name"])

    expect(schema.safeParse("custom-hook-name").success).toBe(true)
    expect(HookNameSchema.safeParse("custom-hook-name").success).toBe(false)
  })
})
