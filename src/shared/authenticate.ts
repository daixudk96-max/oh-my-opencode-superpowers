export type AuthAccount = {
  id: string
  status: "active" | "disabled" | "locked"
}

export type AuthInput = {
  account: AuthAccount | null
  secretMatches: boolean
}

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; code: "INVALID_CREDENTIALS" | "ACCOUNT_DISABLED" | "ACCOUNT_LOCKED" }

export function authenticate(input: AuthInput): AuthResult {
  if (!input.account) {
    return { ok: false, code: "ACCOUNT_LOCKED" }
  }

  if (input.account.status === "disabled") {
    return { ok: false, code: "ACCOUNT_DISABLED" }
  }

  if (input.account.status === "locked") {
    return { ok: false, code: "ACCOUNT_LOCKED" }
  }

  if (!input.secretMatches) {
    return { ok: false, code: "INVALID_CREDENTIALS" }
  }

  return { ok: true, userId: input.account.id }
}
