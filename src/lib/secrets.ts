import { createHash, createHmac, randomBytes } from 'crypto'

/**
 * Leitet zweckgebundene Schlüssel aus PAYLOAD_SECRET ab (kein zusätzliches Secret nötig).
 * Ein Wechsel von PAYLOAD_SECRET macht alle abgeleiteten Werte ungültig (offene ALTCHA-Challenges, Rate-Limit-Zähler).
 */
export function derivedSecret(purpose: string): string {
  const base = process.env.PAYLOAD_SECRET
  if (!base || base.length < 32) throw new Error('PAYLOAD_SECRET fehlt oder ist zu kurz')
  return createHmac('sha256', base).update(`bsv1960:${purpose}`).digest('hex')
}

/** Pseudonymisierter Hash (z. B. IP-Adressen für Rate-Limits) – nicht umkehrbar ohne Secret. */
export const keyedHash = (purpose: string, value: string) =>
  createHmac('sha256', derivedSecret(purpose)).update(value).digest('base64url').slice(0, 32)

/** Zufälliger Einmal-Token (URL-sicher) und sein SHA-256-Hash für die Speicherung. */
export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

