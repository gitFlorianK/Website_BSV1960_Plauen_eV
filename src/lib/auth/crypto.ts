import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from 'crypto'

import { derivedSecret } from '@/lib/secrets'

/*
 * Verschlüsselung von 2FA-Geheimnissen in der Datenbank (AES-256-GCM).
 * Schlüssel aus PAYLOAD_SECRET abgeleitet – ein DB-Dump allein verrät keine TOTP-Geheimnisse.
 */

const key = () => Buffer.from(derivedSecret('totp-encryption'), 'hex') // 32 Byte

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.')
}

export function decryptSecret(stored: string): string {
  const [version, iv, tag, data] = stored.split('.')
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unbekanntes Format')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}

/* ------------------------------------------------------- Wiederherstellungscodes */

const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // ohne 0/o/1/l/i
export const RECOVERY_CODE_COUNT = 8

const normalizeCode = (code: string) => code.toLowerCase().replace(/[^a-z0-9]/g, '')
export const hashRecoveryCode = (code: string) =>
  createHash('sha256').update(`${derivedSecret('recovery-codes')}:${normalizeCode(code)}`).digest('hex')

/** Erzeugt Einmal-Codes im Format `abcd-efgh-jkmn` (≈ 74 Bit). */
export function generateRecoveryCodes(): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    Array.from({ length: 3 }, () =>
      Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join(''),
    ).join('-'),
  )
  return { codes, hashes: codes.map(hashRecoveryCode) }
}

export const looksLikeRecoveryCode = (input: string) => normalizeCode(input).length === 12
