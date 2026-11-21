import type { Payload, PayloadRequest } from 'payload'
import { encode } from 'uqr'

import { hitRateLimit } from '@/lib/rateLimit'
import type { User } from '@/payload-types'

import { decryptSecret, encryptSecret, generateRecoveryCodes, hashRecoveryCode, looksLikeRecoveryCode } from './crypto'
import { generateTotpSecret, otpauthUri, verifyTotp } from './totp'

/*
 * Zwei-Faktor-Anmeldung (TOTP + Wiederherstellungscodes). Geheimnisse liegen verschlüsselt in
 * versteckten Feldern des Nutzers; geschrieben wird nur über payload.db (keine Hooks/Access).
 */

type Secrets = {
  twoFactorSecret?: string | null
  twoFactorPendingSecret?: string | null
  twoFactorRecoveryCodes?: unknown
  twoFactorLastStep?: number | null
}

const MAX_FAILURES = 5
const FAILURE_WINDOW_SEC = 15 * 60

async function loadSecrets(payload: Payload, userId: number, req?: Partial<PayloadRequest>) {
  return (await payload.db.findOne({
    collection: 'users',
    where: { id: { equals: userId } },
    req,
  })) as (User & Secrets) | null
}

async function save(payload: Payload, userId: number, data: Record<string, unknown>, req?: Partial<PayloadRequest>) {
  await payload.db.updateOne({ collection: 'users', id: userId, data, req, returning: false })
}

/**
 * Prüft TOTP-Code oder Wiederherstellungscode. Verbrauchte Codes werden markiert
 * (TOTP: letzter Zeitschritt, Wiederherstellungscode: gelöscht). Fehlversuche je Konto begrenzt.
 */
export async function checkSecondFactor(
  payload: Payload,
  userId: number,
  input: string,
  req?: Partial<PayloadRequest>,
): Promise<'ok' | 'invalid' | 'locked'> {
  const limiter = await hitRateLimit(payload, `2fa:fail:${userId}`, MAX_FAILURES, FAILURE_WINDOW_SEC)
  // Zähler zählt jeden Versuch; bei Erfolg wird er unten wieder zurückgesetzt
  if (!limiter.ok) return 'locked'

  const user = await loadSecrets(payload, userId, req)
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) return 'invalid'

  const code = input.replace(/\s/g, '')
  if (/^\d{6}$/.test(code)) {
    const step = verifyTotp(decryptSecret(user.twoFactorSecret), code, user.twoFactorLastStep ?? -1)
    if (step === null) return 'invalid'
    await save(payload, userId, { twoFactorLastStep: step }, req)
  } else if (looksLikeRecoveryCode(code)) {
    const hashes = Array.isArray(user.twoFactorRecoveryCodes) ? (user.twoFactorRecoveryCodes as string[]) : []
    const hash = hashRecoveryCode(code)
    if (!hashes.includes(hash)) return 'invalid'
    await save(payload, userId, { twoFactorRecoveryCodes: hashes.filter((h) => h !== hash) }, req)
  } else {
    return 'invalid'
  }
  await resetFailures(payload, userId)
  return 'ok'
}

async function resetFailures(payload: Payload, userId: number) {
  const { sql } = await import('@payloadcms/db-postgres')
  const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }).drizzle
  await db.execute(sql`DELETE FROM rate_limits WHERE key = ${`2fa:fail:${userId}`}`)
}

export async function remainingRecoveryCodes(payload: Payload, userId: number): Promise<number> {
  const user = await loadSecrets(payload, userId)
  return Array.isArray(user?.twoFactorRecoveryCodes) ? user.twoFactorRecoveryCodes.length : 0
}

/** Schritt 1 der Einrichtung: neues Geheimnis (noch nicht aktiv) + QR-Code. */
export async function startTwoFactorSetup(payload: Payload, user: Pick<User, 'id' | 'email'>) {
  const secret = generateTotpSecret()
  await save(payload, user.id, { twoFactorPendingSecret: encryptSecret(secret) })
  const uri = otpauthUri(secret, user.email)
  // QR als Matrix (Rendering als React-SVG – kein innerHTML, keine data:-URL)
  return { secret, uri, qr: encode(uri, { border: 2, ecc: 'M' }).data }
}

/** Schritt 2: Code aus der App bestätigt das Geheimnis → aktiv; liefert neue Wiederherstellungscodes. */
export async function confirmTwoFactorSetup(
  payload: Payload,
  userId: number,
  code: string,
): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false }> {
  const user = await loadSecrets(payload, userId)
  if (!user?.twoFactorPendingSecret) return { ok: false }
  const secret = decryptSecret(user.twoFactorPendingSecret)
  const step = verifyTotp(secret, code.replace(/\s/g, ''))
  if (step === null) return { ok: false }
  const { codes, hashes } = generateRecoveryCodes()
  await save(payload, userId, {
    twoFactorEnabled: true,
    twoFactorSecret: encryptSecret(secret),
    twoFactorPendingSecret: null,
    twoFactorLastStep: step,
    twoFactorRecoveryCodes: hashes,
  })
  return { ok: true, recoveryCodes: codes }
}

export async function regenerateRecoveryCodes(payload: Payload, userId: number): Promise<string[]> {
  const { codes, hashes } = generateRecoveryCodes()
  await save(payload, userId, { twoFactorRecoveryCodes: hashes })
  return codes
}

export async function disableTwoFactor(payload: Payload, userId: number): Promise<void> {
  await save(payload, userId, {
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorPendingSecret: null,
    twoFactorRecoveryCodes: null,
    twoFactorLastStep: null,
  })
}
