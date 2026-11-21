/** Fehlercodes aus den Auth-Hooks (APIError.data.code) – für die Auswertung in den Server Actions. */
export const AUTH_ERROR = {
  disabled: 'ACCOUNT_DISABLED',
  passwordVerified: 'PASSWORD_VERIFIED',
  twoFactorRequired: 'TWO_FACTOR_REQUIRED',
  twoFactorInvalid: 'TWO_FACTOR_INVALID',
  twoFactorLocked: 'TWO_FACTOR_LOCKED',
} as const

export type AuthErrorCode = (typeof AUTH_ERROR)[keyof typeof AUTH_ERROR]

/** Liest den Code aus einem von Payload geworfenen APIError (oder `null`). */
export function authErrorCode(err: unknown): AuthErrorCode | null {
  const code = (err as { data?: { code?: unknown } } | null)?.data?.code
  return typeof code === 'string' && Object.values(AUTH_ERROR).includes(code as AuthErrorCode)
    ? (code as AuthErrorCode)
    : null
}
