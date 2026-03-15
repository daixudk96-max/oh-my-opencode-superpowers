import { describe, expect, test } from "bun:test"
import { authenticate } from "./authenticate"

describe("authenticate", () => {
  test("#given missing account and wrong secret paths #when authenticating #then both return expected error codes", () => {
    const missingAccount = authenticate({
      account: null,
      secretMatches: false,
    })

    const wrongSecret = authenticate({
      account: {
        id: "u_123",
        status: "active",
      },
      secretMatches: false,
    })

    expect(missingAccount).toEqual({
      ok: false,
      code: "ACCOUNT_LOCKED",
    })
    expect(wrongSecret).toEqual({
      ok: false,
      code: "INVALID_CREDENTIALS",
    })
  })
})
