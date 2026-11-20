import { createChallenge, randomInt, verifySolution, type Challenge } from 'altcha-lib'
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2'
import type { Payload } from 'payload'

import { consumeOnce } from './rateLimit'
import { derivedSecret } from './secrets'

/*
 * ALTCHA: Proof-of-Work-Spamschutz, selbst gehostet, ohne Cookies und Drittanbieter.
 * Deterministischer Modus mit Schlüsselsignatur: Der Server prüft eine Lösung per HMAC,
 * ohne die Arbeit selbst zu wiederholen (keine DoS-Angriffsfläche).
 */

const ALGORITHM = 'PBKDF2/SHA-256'
const COST = 5_000
const TTL_MS = 10 * 60 * 1000
const MAX_PAYLOAD_LENGTH = 4_000

const secrets = () => ({
  hmacSignatureSecret: derivedSecret('altcha-signature'),
  hmacKeySignatureSecret: derivedSecret('altcha-key-signature'),
})

export async function createAltchaChallenge(): Promise<Challenge> {
  return createChallenge({
    algorithm: ALGORITHM,
    cost: COST,
    counter: randomInt(10_000, 5_000),
    deriveKey,
    expiresAt: new Date(Date.now() + TTL_MS),
    ...secrets(),
  })
}

type AltchaPayload = { challenge?: Challenge; solution?: { counter: number; derivedKey: string } }

/**
 * Prüft die vom Widget gesendete Lösung (Base64-JSON). Jede Lösung ist nur einmal gültig.
 * Wirft nie – ungültige Eingaben ergeben `false`.
 */
export async function verifyAltcha(payload: Payload, raw: unknown): Promise<boolean> {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_PAYLOAD_LENGTH) return false
  try {
    const decoded = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as AltchaPayload
    const { challenge, solution } = decoded ?? {}
    if (!challenge?.parameters || !challenge.signature || !solution) return false
    // Nur selbst ausgestellte Parameter akzeptieren (Signatur deckt sie ab; hier zusätzlich explizit)
    if (challenge.parameters.algorithm !== ALGORITHM || !challenge.parameters.expiresAt) return false

    const result = await verifySolution({ challenge, solution, deriveKey, ...secrets() })
    if (!result.verified) return false

    return consumeOnce(
      payload,
      `altcha:${challenge.signature}`,
      new Date(challenge.parameters.expiresAt * 1000),
    )
  } catch {
    return false
  }
}
