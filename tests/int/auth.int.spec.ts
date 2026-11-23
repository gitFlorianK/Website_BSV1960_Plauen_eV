/**
 * Mitgliederbereich: Anmeldung, Zwei-Faktor-Anmeldung, Passwort-Reset, Einladung, Sessions
 * und Turnieranmeldung (Regeln für Mitglieder).
 */
import { createChallenge, solveChallenge } from 'altcha-lib'
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { userHasRole } from '@/access'
import { decryptSecret, encryptSecret, generateRecoveryCodes, hashRecoveryCode, looksLikeRecoveryCode } from '@/lib/auth/crypto'
import { checkPassword } from '@/lib/auth/password'
import { changePassword, login, requestPasswordReset, resetPasswordWithToken, revokeSessions, verifyPassword } from '@/lib/auth/service'
import { safeReturnPath } from '@/lib/auth/session'
import { base32Decode, base32Encode, hotp, timeStep, totp, verifyTotp } from '@/lib/auth/totp'
import {
  cancelTwoFactorSetup,
  checkSecondFactor,
  confirmTwoFactorSetup,
  remainingRecoveryCodes,
  startTwoFactorSetup,
} from '@/lib/auth/twoFactor'
import { derivedSecret } from '@/lib/secrets'
import config from '@/payload.config'
import type { User } from '@/payload-types'

type Mail = { to: string; subject: string; text: string }
type SessUser = User & { sessions?: { id: string }[] | null; collection: 'users' }

let payload: Payload
let mails: Mail[] = []
const PASSWORD = 'Sehne-Visier-Pfeil-2026'

let ipCounter = 0
const ctx = () => ({ ip: `203.0.113.${++ipCounter}` })

async function altcha(): Promise<string> {
  const challenge = await createChallenge({
    algorithm: 'PBKDF2/SHA-256',
    cost: 5_000,
    counter: 2,
    deriveKey,
    expiresAt: new Date(Date.now() + 60_000),
    hmacSignatureSecret: derivedSecret('altcha-signature'),
    hmacKeySignatureSecret: derivedSecret('altcha-key-signature'),
  })
  const solution = await solveChallenge({ challenge, deriveKey })
  return Buffer.from(
    JSON.stringify({ challenge: { parameters: challenge.parameters, signature: challenge.signature }, solution }),
  ).toString('base64')
}

let n = 0
async function createUser(roles: User['roles'] = ['mitglied'], extra: Partial<User> = {}) {
  const i = ++n
  const doc = await payload.create({
    collection: 'users',
    data: { name: `Person ${i}`, email: `auth${i}@test.local`, password: PASSWORD, roles, sendInvite: false, ...extra },
  })
  return { ...doc, collection: 'users' as const }
}

/** Liest den Nutzer inkl. versteckter Felder und Sessions direkt aus der DB. */
const raw = async (id: number) =>
  (await payload.db.findOne({ collection: 'users', where: { id: { equals: id } } })) as SessUser & {
    twoFactorSecret?: string | null
    twoFactorRecoveryCodes?: string[] | null
    resetPasswordToken?: string | null
  }

/** Richtet 2FA wie über die Oberfläche ein; liefert Geheimnis und Wiederherstellungscodes. */
async function enableTwoFactor(user: Pick<User, 'id' | 'email'>) {
  const started = await startTwoFactorSetup(payload, user)
  if (!started.ok) throw new Error('2FA-Start fehlgeschlagen')
  const { secret } = started
  const res = await confirmTwoFactorSetup(payload, user.id, totp(secret))
  if (!res.ok) throw new Error('2FA-Einrichtung fehlgeschlagen')
  return { secret, codes: res.recoveryCodes }
}

/** Code des nächsten Zeitschritts – der aktuelle ist nach der Einrichtung verbraucht (Replay-Schutz). */
const nextCode = (secret: string) => totp(secret, new Date(Date.now() + 30_000))

const tokenFrom = (mail: Mail) => new URL(mail.text.match(/https?:\/\/\S+token=\S+/)![0]).searchParams.get('token')!

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  for (const collection of ['event-registrations', 'events', 'users', 'rate-limits'] as const) {
    await payload.delete({ collection, where: { id: { exists: true } } })
  }
  // Das erste Konto wird automatisch Admin – vorab anlegen, damit die Rollen unten stimmen
  await createUser(['mitglied'], { twoFactorEnabled: true })
  vi.spyOn(payload, 'sendEmail').mockImplementation(async (m) => {
    mails.push(m as Mail)
    return undefined
  })
})

beforeEach(() => {
  mails = []
})

afterAll(() => {
  vi.restoreAllMocks()
})

/* ------------------------------------------------------------------ Bausteine */

describe('TOTP (RFC 4226/6238)', () => {
  const key = Buffer.from('12345678901234567890')

  it('erfüllt die HOTP-Testvektoren', () => {
    expect([0, 1, 2, 9].map((c) => hotp(key, c))).toEqual(['755224', '287082', '359152', '520489'])
  })

  it('erfüllt die TOTP-Testvektoren (SHA-1, 8 Stellen)', () => {
    const at = (s: number) => hotp(key, timeStep(new Date(s * 1000)), 8)
    expect([59, 1111111109, 1234567890, 2000000000].map(at)).toEqual(['94287082', '07081804', '89005924', '69279037'])
  })

  it('kodiert Base32 verlustfrei', () => {
    const buf = Buffer.from('Bogensport Plauen 1960')
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true)
    expect(base32Encode(key)).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
  })

  it('erlaubt ±1 Zeitschritt und lehnt Wiederverwendung ab', () => {
    const secret = base32Encode(key)
    const now = new Date()
    const step = timeStep(now)
    expect(verifyTotp(secret, totp(secret, new Date(now.getTime() - 30_000)), -1, now)).toBe(step - 1)
    expect(verifyTotp(secret, totp(secret, new Date(now.getTime() + 30_000)), -1, now)).toBe(step + 1)
    expect(verifyTotp(secret, totp(secret, new Date(now.getTime() + 90_000)), -1, now)).toBeNull()
    expect(verifyTotp(secret, totp(secret, now), step, now)).toBeNull()
    expect(verifyTotp(secret, 'abcdef', -1, now)).toBeNull()
  })
})

describe('Verschlüsselung und Wiederherstellungscodes', () => {
  it('verschlüsselt Geheimnisse authentifiziert', () => {
    const enc = encryptSecret('GEHEIM')
    expect(enc).not.toContain('GEHEIM')
    expect(encryptSecret('GEHEIM')).not.toBe(enc) // zufälliger IV
    expect(decryptSecret(enc)).toBe('GEHEIM')
    const [v, iv, tag, data] = enc.split('.')
    const flipped = Buffer.from(data, 'base64url')
    flipped[0] ^= 1
    expect(() => decryptSecret([v, iv, tag, flipped.toString('base64url')].join('.'))).toThrow()
  })

  it('erzeugt 8 eindeutige Codes, gespeichert nur als Hash', () => {
    const { codes, hashes } = generateRecoveryCodes()
    expect(codes).toHaveLength(8)
    expect(new Set(codes).size).toBe(8)
    for (const c of codes) expect(c).toMatch(/^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/)
    expect(hashes[0]).toBe(hashRecoveryCode(codes[0]))
    expect(hashes.join()).not.toContain(codes[0])
    // Eingabe tolerant gegenüber Groß-/Kleinschreibung und Leerzeichen
    expect(hashRecoveryCode(codes[0].toUpperCase().replace(/-/g, ' '))).toBe(hashes[0])
    expect(looksLikeRecoveryCode(codes[0])).toBe(true)
    expect(looksLikeRecoveryCode('123456')).toBe(false)
  })
})

describe('Passwortrichtlinie', () => {
  it.each([
    ['kurz1234', 'mindestens'],
    ['aaaaaaaaaaaaaaaa', 'verschiedenen'],
    ['abcdeabcdeabcde', 'Wiederholung'],
    ['Passwort123456!', 'erraten'],
    ['bogensport-plauen', 'erraten'],
    ['Erika-Mustermann-77', 'Namen'],
    ['erika.m-Tannenzapfen', 'Namen'],
    ['x'.repeat(129), 'höchstens'],
  ])('lehnt %s ab', (pw, msg) => {
    expect(checkPassword(pw, { email: 'erika.m@test.local', name: 'Erika Mustermann' })).toContain(msg)
  })

  it('akzeptiert Passphrasen', () => {
    expect(checkPassword('Pfeil Wolke Tannenzapfen', { email: 'erika@test.local', name: 'Erika Mustermann' })).toBeNull()
    expect(checkPassword(PASSWORD)).toBeNull()
  })
})

describe('Rücksprung nach der Anmeldung', () => {
  it.each([
    ['/mitglieder/termine?x=1', '/mitglieder/termine?x=1'],
    ['//evil.example', '/mitglieder'],
    ['https://evil.example/', '/mitglieder'],
    ['/\\evil.example', '/mitglieder'],
    ['javascript:alert(1)', '/mitglieder'],
    [undefined, '/mitglieder'],
    // Erst nach Normalisierung protokollrelativ (Review R16)
    ['/.//evil.example', '/mitglieder'],
    ['/a/..//evil.example/x', '/mitglieder'],
    ['/mitglieder/../..//evil.example', '/mitglieder'],
    ['/mitglieder/./termine', '/mitglieder/termine'],
  ])('%s → %s', (input, expected) => {
    expect(safeReturnPath(input)).toBe(expected)
  })
})

/* ------------------------------------------------------------------ Anmeldung */

describe('Anmeldung', () => {
  it('meldet mit korrektem Passwort an und vermerkt die letzte Anmeldung', async () => {
    const u = await createUser()
    const res = await login(payload, { email: ` ${u.email.toUpperCase()} `, password: PASSWORD }, ctx())
    expect(res.ok).toBe(true)
    const db = await raw(u.id)
    expect(db.sessions).toHaveLength(1)
    expect(db.lastLoginAt).toBeTruthy()
  })

  it('antwortet bei falschem Passwort und unbekanntem Konto gleich', async () => {
    const u = await createUser()
    expect(await login(payload, { email: u.email, password: 'falsch-falsch-falsch' }, ctx())).toEqual({ ok: false, error: 'invalid' })
    expect(await login(payload, { email: 'gibtsnicht@test.local', password: PASSWORD }, ctx())).toEqual({ ok: false, error: 'invalid' })
  })

  it('verweigert gesperrte Konten', async () => {
    const u = await createUser(['mitglied'], { accountDisabled: true })
    expect(await login(payload, { email: u.email, password: PASSWORD }, ctx())).toEqual({ ok: false, error: 'disabled' })
    expect((await raw(u.id)).sessions ?? []).toHaveLength(0)
  })

  it('begrenzt Versuche pro IP', async () => {
    const c = ctx()
    for (let i = 0; i < 30; i++) await login(payload, { email: `x${i}@test.local`, password: 'falsch-falsch-falsch' }, c)
    const res = await login(payload, { email: 'x@test.local', password: 'falsch-falsch-falsch' }, c)
    expect(res).toMatchObject({ ok: false, error: 'rateLimited' })
  })

  it('prüft das Passwort ohne Session anzulegen', async () => {
    const u = await createUser()
    expect(await verifyPassword(payload, u.email, PASSWORD)).toBe(true)
    expect(await verifyPassword(payload, u.email, 'falsch-falsch-falsch')).toBe(false)
    expect((await raw(u.id)).sessions ?? []).toHaveLength(0)
  })
})

describe('Sperre der REST-Endpunkte', () => {
  const rest = { payloadAPI: 'REST' } as Partial<PayloadRequest>

  it('erlaubt Login, Passwort-Reset und Erstregistrierung nur über die Website', async () => {
    const u = await createUser()
    await expect(payload.login({ collection: 'users', data: { email: u.email, password: PASSWORD }, req: rest })).rejects.toMatchObject({ status: 403 })
    await expect(payload.forgotPassword({ collection: 'users', data: { email: u.email }, disableEmail: true, req: rest })).rejects.toMatchObject({ status: 403 })
    await expect(payload.resetPassword({ collection: 'users', data: { token: 'a'.repeat(40), password: PASSWORD }, overrideAccess: true, req: rest })).rejects.toMatchObject({ status: 403 })
    await expect(
      payload.create({ collection: 'users', data: { name: 'Neu', email: 'rest@test.local', password: PASSWORD, roles: ['mitglied'] }, req: rest }),
    ).rejects.toMatchObject({ status: 403 })
  })
})

/* ------------------------------------------------------- Zwei-Faktor-Anmeldung */

describe('Zwei-Faktor-Anmeldung', () => {
  it('verlangt nach der Einrichtung einen Code und legt vorher keine Session an', async () => {
    const u = await createUser()
    const { secret } = await enableTwoFactor(u)
    const db = await raw(u.id)
    expect(db.twoFactorEnabled).toBe(true)
    expect(db.twoFactorSecret).not.toContain(secret)

    expect(await login(payload, { email: u.email, password: PASSWORD }, ctx())).toEqual({ ok: false, error: 'twoFactorRequired' })
    expect(await login(payload, { email: u.email, password: PASSWORD, code: '000000' }, ctx())).toEqual({ ok: false, error: 'twoFactorInvalid' })
    expect((await raw(u.id)).sessions ?? []).toHaveLength(0)

    const code = nextCode(secret)
    expect((await login(payload, { email: u.email, password: PASSWORD, code }, ctx())).ok).toBe(true)
    // Derselbe Code ein zweites Mal: abgelehnt
    expect(await login(payload, { email: u.email, password: PASSWORD, code }, ctx())).toEqual({ ok: false, error: 'twoFactorInvalid' })
  })

  it('akzeptiert jeden Wiederherstellungscode genau einmal', async () => {
    const u = await createUser()
    const { codes } = await enableTwoFactor(u)
    expect(await remainingRecoveryCodes(payload, u.id)).toBe(8)
    expect((await login(payload, { email: u.email, password: PASSWORD, code: codes[3].toUpperCase() }, ctx())).ok).toBe(true)
    expect(await remainingRecoveryCodes(payload, u.id)).toBe(7)
    expect(await login(payload, { email: u.email, password: PASSWORD, code: codes[3] }, ctx())).toEqual({ ok: false, error: 'twoFactorInvalid' })
  })

  it('sperrt nach 5 falschen Codes, auch für richtige', async () => {
    const u = await createUser()
    const { secret } = await enableTwoFactor(u)
    for (let i = 0; i < 5; i++) expect(await checkSecondFactor(payload, u.id, '000000')).toBe('invalid')
    expect(await checkSecondFactor(payload, u.id, nextCode(secret))).toBe('locked')
    expect(await login(payload, { email: u.email, password: PASSWORD, code: nextCode(secret) }, ctx())).toEqual({ ok: false, error: 'twoFactorLocked' })
  })

  it('aktiviert nicht mit falschem Bestätigungscode', async () => {
    const u = await createUser()
    await startTwoFactorSetup(payload, u)
    expect(await confirmTwoFactorSetup(payload, u.id, '000000')).toEqual({ ok: false })
    expect((await raw(u.id)).twoFactorEnabled).toBe(false)
  })

  const pending = async (id: number) =>
    ((await raw(id)) as { twoFactorPendingSecret?: string | null }).twoFactorPendingSecret ?? null

  it('Umzug auf ein neues Handy: nur mit Passwort und Code, altes Handy gilt bis zur Bestätigung', async () => {
    // Nur die Uhr vortäuschen: jeder Code gilt einmal und nur ±1 Zeitschritt – je Prüfung 30 s weiter
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() })
    const next = (secret: string) => {
      vi.setSystemTime(Date.now() + 30_000)
      return totp(secret)
    }
    try {
      const u = await createUser()
      const { secret: oldSecret, codes: oldCodes } = await enableTwoFactor(u)

      // Eine Sitzung allein (z. B. erbeutet) reicht nicht – es wird kein neues Geheimnis hinterlegt
      expect(await startTwoFactorSetup(payload, u)).toEqual({ ok: false })
      expect(await startTwoFactorSetup(payload, u, { password: 'falsch-falsch-falsch', code: next(oldSecret) })).toEqual({ ok: false })
      expect(await startTwoFactorSetup(payload, u, { password: PASSWORD, code: '000000' })).toEqual({ ok: false })
      expect(await pending(u.id)).toBeNull()

      const started = await startTwoFactorSetup(payload, u, { password: PASSWORD, code: totp(oldSecret) })
      if (!started.ok) throw new Error('Umzug nicht gestartet')
      expect(started.secret).not.toBe(oldSecret)
      // Bis zur Bestätigung gilt das alte Handy weiter
      expect(await checkSecondFactor(payload, u.id, next(oldSecret))).toBe('ok')
      expect(await confirmTwoFactorSetup(payload, u.id, '000000')).toEqual({ ok: false })
      expect(await checkSecondFactor(payload, u.id, next(oldSecret))).toBe('ok')

      expect((await confirmTwoFactorSetup(payload, u.id, totp(started.secret))).ok).toBe(true)
      // Danach: nur noch das neue Handy und die neuen Wiederherstellungscodes
      expect(await checkSecondFactor(payload, u.id, next(oldSecret))).toBe('invalid')
      expect(await checkSecondFactor(payload, u.id, oldCodes[0])).toBe('invalid')
      expect(await checkSecondFactor(payload, u.id, next(started.secret))).toBe('ok')
      expect(await remainingRecoveryCodes(payload, u.id)).toBe(8)
      expect((await raw(u.id)).twoFactorEnabled).toBe(true)

      const log = await payload.find({
        collection: 'audit-log',
        where: { targetId: { equals: String(u.id) }, action: { in: ['twoFactor.enabled', 'twoFactor.moved'] } },
        sort: 'createdAt',
      })
      expect(log.docs.map((d) => d.action)).toEqual(['twoFactor.enabled', 'twoFactor.moved'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('Umzug bei verlorenem Handy mit Wiederherstellungscode; Abbrechen lässt alles beim Alten', async () => {
    const u = await createUser()
    const { secret, codes } = await enableTwoFactor(u)

    const started = await startTwoFactorSetup(payload, u, { password: PASSWORD, code: codes[0] })
    if (!started.ok) throw new Error('Umzug nicht gestartet')
    expect(await remainingRecoveryCodes(payload, u.id)).toBe(7)
    expect(await pending(u.id)).not.toBeNull()

    await cancelTwoFactorSetup(payload, u.id)
    expect(await pending(u.id)).toBeNull()
    expect((await raw(u.id)).twoFactorEnabled).toBe(true)
    expect(await checkSecondFactor(payload, u.id, nextCode(secret))).toBe('ok')
    // Das verworfene Geheimnis lässt sich nicht mehr bestätigen
    expect(await confirmTwoFactorSetup(payload, u.id, totp(started.secret))).toEqual({ ok: false })
  })

  it('Vorstand ohne 2FA hat nur Mitgliedsrechte', async () => {
    const v = await createUser(['vorstand', 'mitglied'])
    expect(userHasRole(v, 'vorstand')).toBe(false)
    await expect(payload.find({ collection: 'contact-requests', overrideAccess: false, user: v })).rejects.toMatchObject({ status: 403 })
    await expect(payload.find({ collection: 'users', overrideAccess: false, user: v })).resolves.toMatchObject({ totalDocs: 1 })

    await enableTwoFactor(v)
    const fresh = { ...(await payload.findByID({ collection: 'users', id: v.id })), collection: 'users' as const }
    expect(userHasRole(fresh, 'vorstand')).toBe(true)
    await expect(payload.find({ collection: 'contact-requests', overrideAccess: false, user: fresh })).resolves.toBeTruthy()
  })

  it('Nutzer können 2FA-Felder nicht selbst setzen oder lesen', async () => {
    const u = await createUser()
    const updated = await payload.update({
      collection: 'users',
      id: u.id,
      overrideAccess: false,
      user: u,
      data: { twoFactorEnabled: true, twoFactorSecret: 'X' } as never,
    })
    expect(updated.twoFactorEnabled).toBe(false)
    expect((await raw(u.id)).twoFactorSecret ?? null).toBeNull()
    const me = await payload.findByID({ collection: 'users', id: u.id, overrideAccess: false, user: u })
    expect(me).not.toHaveProperty('twoFactorSecret')
    expect(me).not.toHaveProperty('twoFactorRecoveryCodes')
  })

  it('Vorstand setzt die 2FA zurück und meldet alle Geräte ab', async () => {
    const vorstand = await createUser(['vorstand', 'mitglied'], { twoFactorEnabled: true })
    const u = await createUser()
    const { secret } = await enableTwoFactor(u)
    await login(payload, { email: u.email, password: PASSWORD, code: nextCode(secret) }, ctx())
    expect((await raw(u.id)).sessions).toHaveLength(1)

    await payload.update({ collection: 'users', id: u.id, overrideAccess: false, user: vorstand, data: { resetTwoFactor: true } as never })
    const db = await raw(u.id)
    expect(db.twoFactorEnabled).toBe(false)
    expect(db.twoFactorSecret ?? null).toBeNull()
    expect(db.sessions ?? []).toHaveLength(0)
  })
})

/* ------------------------------------------------- Passwort vergessen / Einladung */

describe('Passwort zurücksetzen', () => {
  it('antwortet neutral und schickt nur bestehenden Konten einen Link', async () => {
    const u = await createUser()
    const a = await requestPasswordReset(payload, { email: 'unbekannt@test.local', altcha: await altcha() }, ctx())
    const b = await requestPasswordReset(payload, { email: u.email, altcha: await altcha() }, ctx())
    expect(a).toEqual(b)
    expect(mails).toHaveLength(1)
    expect(mails[0].to).toBe(u.email)
    expect(mails[0].text).toContain('/passwort-zuruecksetzen?token=')
  })

  it('verlangt eine ALTCHA-Lösung', async () => {
    const u = await createUser()
    const res = await requestPasswordReset(payload, { email: u.email, altcha: 'kaputt' }, ctx())
    expect(res.ok).toBe(false)
    expect(mails).toHaveLength(0)
  })

  it('setzt das Passwort per Token, meldet alle Geräte ab, Token nur einmal', async () => {
    const u = await createUser()
    await login(payload, { email: u.email, password: PASSWORD }, ctx())
    await requestPasswordReset(payload, { email: u.email, altcha: await altcha() }, ctx())
    const token = tokenFrom(mails[0])

    expect(await resetPasswordWithToken(payload, { token, password: 'kurz', confirm: 'kurz' }, ctx())).toMatchObject({ ok: false, field: 'password' })
    expect(await resetPasswordWithToken(payload, { token, password: 'Wolke Tanne Pfeil', confirm: 'anders' }, ctx())).toMatchObject({ ok: false, field: 'confirm' })
    expect(await resetPasswordWithToken(payload, { token, password: 'Wolke Tanne Pfeil', confirm: 'Wolke Tanne Pfeil' }, ctx())).toEqual({ ok: true })

    expect((await raw(u.id)).sessions ?? []).toHaveLength(0)
    expect((await login(payload, { email: u.email, password: 'Wolke Tanne Pfeil' }, ctx())).ok).toBe(true)
    expect(await resetPasswordWithToken(payload, { token, password: 'Neue Sehne Holz', confirm: 'Neue Sehne Holz' }, ctx())).toMatchObject({ ok: false })
  })

  it('lehnt ungültige Tokens ab', async () => {
    expect(await resetPasswordWithToken(payload, { token: "' OR 1=1 --", password: PASSWORD, confirm: PASSWORD }, ctx())).toMatchObject({ ok: false })
    expect(await resetPasswordWithToken(payload, { token: 'a'.repeat(40), password: PASSWORD, confirm: PASSWORD }, ctx())).toMatchObject({ ok: false })
  })
})

describe('Einladung', () => {
  it('Vorstand lädt ein: Passwort aus dem Formular verfällt, Link setzt eigenes', async () => {
    const vorstand = await createUser(['vorstand', 'mitglied'], { twoFactorEnabled: true })
    const created = await payload.create({
      collection: 'users',
      overrideAccess: false,
      user: vorstand,
      data: { name: 'Neues Mitglied', email: 'eingeladen@test.local', password: PASSWORD, roles: ['mitglied'], sendInvite: true },
    })
    expect(mails).toHaveLength(1)
    expect(mails[0].to).toBe('eingeladen@test.local')
    expect(mails[0].text).toContain('/einladung?token=')
    expect((await raw(created.id)).invitedAt).toBeTruthy()

    expect((await login(payload, { email: 'eingeladen@test.local', password: PASSWORD }, ctx())).ok).toBe(false)
    const token = tokenFrom(mails[0])
    expect(await resetPasswordWithToken(payload, { token, password: 'Mein Bogen Wald', confirm: 'Mein Bogen Wald' }, ctx())).toEqual({ ok: true })
    expect((await login(payload, { email: 'eingeladen@test.local', password: 'Mein Bogen Wald' }, ctx())).ok).toBe(true)
  })

  it('setzt die Passwortrichtlinie beim direkten Anlegen durch', async () => {
    await expect(
      payload.create({ collection: 'users', data: { name: 'Schwach', email: 'schwach@test.local', password: 'passwort1234', roles: ['mitglied'], sendInvite: false } }),
    ).rejects.toThrow()
  })
})

describe('Angemeldet', () => {
  it('ändert das Passwort nur mit dem aktuellen und behält die eigene Session', async () => {
    const u = await createUser()
    await login(payload, { email: u.email, password: PASSWORD }, ctx())
    await login(payload, { email: u.email, password: PASSWORD }, ctx())
    const sessions = (await raw(u.id)).sessions!
    expect(sessions).toHaveLength(2)
    const me = { ...u, _sid: sessions[1].id }

    expect(await changePassword(payload, me, { current: 'falsch-falsch-falsch', password: 'Pfeil Wolke Tannenzapfen', confirm: 'Pfeil Wolke Tannenzapfen' })).toMatchObject({ ok: false, field: 'current' })
    expect(await changePassword(payload, me, { current: PASSWORD, password: 'Pfeil Wolke Tannenzapfen', confirm: 'Pfeil Wolke Tannenzapfen' })).toEqual({ ok: true })
    expect((await raw(u.id)).sessions!.map((s) => s.id)).toEqual([sessions[1].id])
    expect((await login(payload, { email: u.email, password: 'Pfeil Wolke Tannenzapfen' }, ctx())).ok).toBe(true)
  })

  it('beendete Sessions gelten sofort nicht mehr', async () => {
    const u = await createUser()
    const res = await login(payload, { email: u.email, password: PASSWORD }, ctx())
    if (!res.ok) throw new Error('Login fehlgeschlagen')
    const headers = new Headers({ Authorization: `JWT ${res.token}` })
    expect((await payload.auth({ headers })).user?.id).toBe(u.id)
    await revokeSessions(payload, u.id)
    expect((await payload.auth({ headers })).user).toBeNull()
  })
})

/* ------------------------------------------------------------ Turnieranmeldung */

describe('Turnieranmeldung durch Mitglieder', () => {
  const inDays = (d: number) => new Date(Date.now() + d * 86400_000).toISOString()
  const createEvent = (registration: { enabled: boolean; deadline?: string; maxParticipants?: number }) =>
    payload.create({
      collection: 'events',
      data: { title: `Turnier ${++n}`, slug: `turnier-${n}`, startDate: inDays(20), eventType: 'tournament', visibility: 'public', registration },
      context: { disableRevalidate: true },
    })
  const register = (user: SessUser | (User & { collection: 'users' }), event: number) =>
    payload.create({
      collection: 'event-registrations',
      overrideAccess: false,
      user,
      data: { event, member: user.id, bowClass: 'recurve', status: 'registered' },
    })

  it('kann sich abmelden und wieder anmelden, aber nicht selbst bestätigen', async () => {
    const m = await createUser()
    const ev = await createEvent({ enabled: true, deadline: inDays(10) })
    const reg = await register(m, ev.id)
    const upd = (status: 'registered' | 'confirmed' | 'cancelled') =>
      payload.update({ collection: 'event-registrations', id: reg.id, overrideAccess: false, user: m, data: { status } })

    await expect(upd('confirmed')).rejects.toThrow()
    expect((await upd('cancelled')).status).toBe('cancelled')
    await expect(upd('confirmed')).rejects.toThrow()
    expect((await upd('registered')).status).toBe('registered')
  })

  it('nach Meldeschluss keine (erneute) Anmeldung', async () => {
    const m = await createUser()
    const ev = await createEvent({ enabled: true, deadline: inDays(10) })
    const reg = await register(m, ev.id)
    await payload.update({ collection: 'event-registrations', id: reg.id, overrideAccess: false, user: m, data: { status: 'cancelled' } })
    await payload.update({ collection: 'events', id: ev.id, data: { registration: { enabled: true, deadline: inDays(-1) } }, context: { disableRevalidate: true } })

    await expect(
      payload.update({ collection: 'event-registrations', id: reg.id, overrideAccess: false, user: m, data: { status: 'registered' } }),
    ).rejects.toMatchObject({ data: { errors: [{ message: expect.stringMatching(/keine Anmeldung \(mehr\) möglich/) }] } })
    await expect(register(await createUser(), ev.id)).rejects.toMatchObject({ data: { errors: [{ message: expect.stringMatching(/keine Anmeldung \(mehr\) möglich/) }] } })
  })

  it('beachtet die Teilnehmerzahl – abgemeldete Plätze werden frei', async () => {
    const ev = await createEvent({ enabled: true, maxParticipants: 1 })
    const a = await createUser()
    const b = await createUser()
    const regA = await register(a, ev.id)
    await expect(register(b, ev.id)).rejects.toMatchObject({ data: { errors: [{ message: expect.stringMatching(/Plätze/) }] } })
    await payload.update({ collection: 'event-registrations', id: regA.id, overrideAccess: false, user: a, data: { status: 'cancelled' } })
    await expect(register(b, ev.id)).resolves.toBeTruthy()
    await expect(
      payload.update({ collection: 'event-registrations', id: regA.id, overrideAccess: false, user: a, data: { status: 'registered' } }),
    ).rejects.toMatchObject({ data: { errors: [{ message: expect.stringMatching(/Plätze/) }] } })
  })
})

describe('Löschen mit abhängigen Daten', () => {
  it('löscht Turnieranmeldungen mit dem Termin bzw. dem Konto', async () => {
    const ev = await payload.create({
      collection: 'events',
      data: { title: 'Löschtest', slug: `loeschtest-${++n}`, startDate: new Date(Date.now() + 86400_000).toISOString(), eventType: 'tournament', visibility: 'public', registration: { enabled: true } },
      context: { disableRevalidate: true },
    })
    const a = await createUser()
    const b = await createUser()
    for (const m of [a, b]) {
      await payload.create({ collection: 'event-registrations', data: { event: ev.id, member: m.id, bowClass: 'recurve', status: 'registered' } })
    }
    await payload.delete({ collection: 'users', id: a.id })
    expect((await payload.count({ collection: 'event-registrations', where: { event: { equals: ev.id } } })).totalDocs).toBe(1)
    await payload.delete({ collection: 'events', id: ev.id, context: { disableRevalidate: true } })
    expect((await payload.count({ collection: 'event-registrations', where: { member: { equals: b.id } } })).totalDocs).toBe(0)
  })

  it('verweigert das Löschen benutzter Orte', async () => {
    const loc = await payload.create({ collection: 'locations', data: { name: 'Halle', street: 'Weg 1', postalCode: '08523', city: 'Plauen' }, context: { disableRevalidate: true } })
    const slot = await payload.create({
      collection: 'training-slots',
      data: { weekday: '1', startTime: '17:00', endTime: '19:00', group: 'Alle', location: loc.id, seasonType: 'indoor' },
      context: { disableRevalidate: true },
    })
    await expect(payload.delete({ collection: 'locations', id: loc.id, context: { disableRevalidate: true } })).rejects.toMatchObject({ status: 409 })
    await payload.delete({ collection: 'training-slots', id: slot.id, context: { disableRevalidate: true } })
    await expect(payload.delete({ collection: 'locations', id: loc.id, context: { disableRevalidate: true } })).resolves.toBeTruthy()
  })
})
