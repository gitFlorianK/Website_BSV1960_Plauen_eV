import { createHmac, randomBytes } from 'crypto'

/*
 * TOTP nach RFC 6238 (HMAC-SHA1, 30 s, 6 Stellen) – kompatibel mit gängigen Authenticator-Apps.
 * Bewusst ohne Fremdbibliothek; Testvektoren aus RFC 6238 in tests/int/auth.int.spec.ts.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export const TOTP_PERIOD = 30
export const TOTP_DIGITS = 6

export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, '')
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch)
    if (idx < 0) throw new Error('Ungültiges Base32')
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** 160-Bit-Geheimnis (Empfehlung RFC 4226) als Base32. */
export const generateTotpSecret = () => base32Encode(randomBytes(20))

export function hotp(key: Buffer, counter: number, digits = TOTP_DIGITS, algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha1'): string {
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac(algorithm, key).update(msg).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const bin =
    ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3]
  return String(bin % 10 ** digits).padStart(digits, '0')
}

export const timeStep = (at: Date = new Date()) => Math.floor(at.getTime() / 1000 / TOTP_PERIOD)

export const totp = (secret: string, at: Date = new Date()) => hotp(base32Decode(secret), timeStep(at))

/**
 * Prüft einen Code mit ±1 Zeitschritt Toleranz (Uhrabweichung). Liefert den passenden Zeitschritt
 * oder `null`. Schritte ≤ `lastUsedStep` werden abgelehnt (Schutz vor Wiederverwendung).
 */
export function verifyTotp(secret: string, code: string, lastUsedStep = -1, at: Date = new Date()): number | null {
  if (!/^\d{6}$/.test(code)) return null
  const key = base32Decode(secret)
  const now = timeStep(at)
  for (const step of [now - 1, now, now + 1]) {
    if (step <= lastUsedStep) continue
    const expected = hotp(key, step)
    // Konstantzeit-Vergleich gleich langer Ziffernfolgen
    let diff = 0
    for (let i = 0; i < TOTP_DIGITS; i++) diff |= expected.charCodeAt(i) ^ code.charCodeAt(i)
    if (diff === 0) return step
  }
  return null
}

export function otpauthUri(secret: string, account: string, issuer = 'BSV 1960 Plauen'): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: String(TOTP_DIGITS), period: String(TOTP_PERIOD) })
  return `otpauth://totp/${label}?${params.toString()}`
}
