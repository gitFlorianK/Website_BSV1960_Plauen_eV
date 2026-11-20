/**
 * Öffentliche Formulare (Phase 4): Validierung, Honeypot, Rate-Limit, ALTCHA (inkl. Replay),
 * Double-Opt-in mit Kapazität/Warteliste. Mails werden abgefangen (kein SMTP nötig).
 */
import { createChallenge, solveChallenge } from 'altcha-lib'
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import { confirmCourseRegistration } from '@/lib/forms/confirm'
import { CONFIRM_TTL_HOURS, submitContact, submitCourseRegistration, submitMembership } from '@/lib/forms/submit'
import { consumeOnce, hitRateLimit } from '@/lib/rateLimit'
import { derivedSecret } from '@/lib/secrets'
import { createAltchaChallenge, verifyAltcha } from '@/lib/altcha'

let payload: Payload
type Mail = { to: string; subject: string; text: string; replyTo?: string }
let mails: Mail[] = []
let ipCounter = 0
/** Jeder Test eine eigene „IP“, damit Rate-Limits sich nicht gegenseitig beeinflussen. */
const ctx = () => ({ ip: `198.51.100.${++ipCounter}` })

/** Gültige ALTCHA-Lösung wie vom Widget (kleiner Zähler → schnell lösbar). */
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

const in30Days = () => new Date(Date.now() + 30 * 86400_000).toISOString()

async function createCourse(data: Partial<{ capacity: number; status: 'open' | 'waitlist' | 'closed' | 'draft'; minAge: number; registrationDeadline: string }> = {}) {
  return payload.create({
    collection: 'courses',
    data: {
      title: `Kurs ${Math.random().toString(36).slice(2, 7)}`,
      audience: 'adults',
      status: data.status ?? 'open',
      capacity: data.capacity ?? 2,
      minAge: data.minAge,
      registrationDeadline: data.registrationDeadline ?? in30Days(),
      sessions: [{ start: in30Days() }],
    },
  })
}

const person = (n: number, extra: Record<string, string> = {}) => ({
  firstName: `Vorname${n}`,
  lastName: 'Test',
  birthDate: '1990-01-01',
  email: `person${n}@test.local`,
  privacy: 'on',
  ...extra,
})

const tokenFrom = (mail: Mail) => new URL(mail.text.match(/https?:\/\/\S+token=\S+/)![0]).searchParams.get('token')!

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  for (const collection of ['course-registrations', 'courses', 'contact-requests', 'membership-applications', 'rate-limits'] as const) {
    await payload.delete({ collection, where: { id: { exists: true } } })
  }
  await payload.updateGlobal({ slug: 'site-settings', data: { email: 'verein@test.local' } })
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

describe('ALTCHA', () => {
  it('akzeptiert eine gültige Lösung genau einmal (Replay-Schutz)', async () => {
    const solution = await altcha()
    expect(await verifyAltcha(payload, solution)).toBe(true)
    expect(await verifyAltcha(payload, solution)).toBe(false)
  })

  it('lehnt manipulierte, leere und unsinnige Payloads ab', async () => {
    const decoded = JSON.parse(Buffer.from(await altcha(), 'base64').toString())
    decoded.challenge.parameters.cost = 1
    expect(await verifyAltcha(payload, Buffer.from(JSON.stringify(decoded)).toString('base64'))).toBe(false)
    expect(await verifyAltcha(payload, '')).toBe(false)
    expect(await verifyAltcha(payload, 'kein-base64-json')).toBe(false)
    expect(await verifyAltcha(payload, undefined)).toBe(false)
    expect(await verifyAltcha(payload, 'x'.repeat(10_000))).toBe(false)
  })

  it('stellt signierte Challenges mit Ablaufzeit aus', async () => {
    const c = await createAltchaChallenge()
    expect(c.signature).toBeTruthy()
    expect(c.parameters.expiresAt).toBeGreaterThan(Date.now() / 1000)
    expect(c.parameters.keySignature).toBeTruthy()
  })
})

describe('Rate-Limit', () => {
  it('zählt atomar im Zeitfenster und blockiert danach', async () => {
    const key = `test:${Math.random()}`
    const results = await Promise.all(Array.from({ length: 5 }, () => hitRateLimit(payload, key, 3, 60)))
    expect(results.map((r) => r.count).sort()).toEqual([1, 2, 3, 4, 5])
    expect(results.filter((r) => r.ok)).toHaveLength(3)
  })

  it('beginnt nach Ablauf des Fensters neu', async () => {
    const key = `test:${Math.random()}`
    await hitRateLimit(payload, key, 1, 1)
    expect((await hitRateLimit(payload, key, 1, 1)).ok).toBe(false)
    await new Promise((r) => setTimeout(r, 1100))
    expect((await hitRateLimit(payload, key, 1, 1)).ok).toBe(true)
  })

  it('consumeOnce gibt einen Schlüssel nur einmal frei', async () => {
    const key = `once:${Math.random()}`
    const until = new Date(Date.now() + 60_000)
    expect(await consumeOnce(payload, key, until)).toBe(true)
    expect(await consumeOnce(payload, key, until)).toBe(false)
  })
})

describe('Kontaktformular', () => {
  const valid = { name: 'Erika Muster', email: 'Erika@Test.local ', topic: 'general', message: 'Wann ist das nächste Training?', privacy: 'on' }

  it('speichert gültige Anfragen und benachrichtigt den Verein (Reply-To = Absender)', async () => {
    const res = await submitContact(payload, { ...valid, altcha: await altcha() }, ctx())
    expect(res.status).toBe('success')
    const { docs } = await payload.find({ collection: 'contact-requests', where: { name: { equals: 'Erika Muster' } } })
    expect(docs).toHaveLength(1)
    expect(docs[0].email).toBe('erika@test.local')
    expect(mails).toHaveLength(1)
    expect(mails[0].to).toBe('verein@test.local')
    expect(mails[0].replyTo).toBe('erika@test.local')
  })

  it('meldet Feldfehler auf Deutsch und gibt Eingaben zurück', async () => {
    const res = await submitContact(payload, { name: '', email: 'kaputt', topic: 'xyz', message: 'kurz', altcha: 'geheim' }, ctx())
    expect(res.status).toBe('error')
    expect(res.fieldErrors).toMatchObject({
      name: expect.stringContaining('Namen'),
      email: expect.stringContaining('E-Mail'),
      topic: expect.any(String),
      message: expect.stringContaining('10 Zeichen'),
      privacy: expect.stringContaining('Datenschutz'),
    })
    expect(res.values?.email).toBe('kaputt')
    expect(res.values).not.toHaveProperty('altcha')
  })

  it('verlangt eine gültige ALTCHA-Lösung', async () => {
    const res = await submitContact(payload, { ...valid, altcha: 'falsch' }, ctx())
    expect(res.status).toBe('error')
    expect(res.fieldErrors?.altcha).toBeTruthy()
  })

  it('Honeypot: Erfolg vortäuschen, nichts speichern, keine Mail', async () => {
    const before = await payload.count({ collection: 'contact-requests' })
    const res = await submitContact(payload, { ...valid, website: 'https://spam.example' }, ctx())
    expect(res.status).toBe('success')
    expect((await payload.count({ collection: 'contact-requests' })).totalDocs).toBe(before.totalDocs)
    expect(mails).toHaveLength(0)
  })

  it('begrenzt Anfragen pro IP (5 je Stunde)', async () => {
    const c = ctx()
    for (let i = 0; i < 5; i++) await submitContact(payload, { name: 'x' }, c)
    const res = await submitContact(payload, { ...valid, altcha: await altcha() }, c)
    expect(res.status).toBe('error')
    expect(res.message).toMatch(/Zu viele Anfragen/)
  })
})

describe('Mitgliedsantrag', () => {
  const valid = {
    firstName: 'Max',
    lastName: 'Muster',
    birthDate: '1985-02-03',
    street: 'Wolfsbergweg 1',
    postalCode: '08523',
    city: 'Plauen',
    email: 'max@test.local',
    bowType: 'recurve',
    privacy: 'on',
  }

  it('speichert den Antrag mit Einwilligungszeitpunkt; Vereinsmail ohne Personendaten', async () => {
    const res = await submitMembership(payload, { ...valid, altcha: await altcha() }, ctx())
    expect(res.status).toBe('success')
    const { docs } = await payload.find({ collection: 'membership-applications', where: { lastName: { equals: 'Muster' } } })
    expect(docs[0].consents?.privacyAcceptedAt).toBeTruthy()
    expect(docs[0].guardian?.name ?? null).toBeNull()
    expect(mails).toHaveLength(1)
    expect(mails[0].text).not.toContain('Muster')
    expect(mails[0].text).toContain('/admin/collections/membership-applications/')
  })

  it('verlangt bei Minderjährigen Erziehungsberechtigte und deren Zustimmung', async () => {
    const birthDate = `${new Date().getFullYear() - 12}-01-01`
    const res = await submitMembership(payload, { ...valid, birthDate, altcha: await altcha() }, ctx())
    expect(res.status).toBe('error')
    expect(res.fieldErrors).toHaveProperty('guardianName')
    expect(res.fieldErrors).toHaveProperty('guardianConsent')

    const ok = await submitMembership(
      payload,
      { ...valid, birthDate, guardianName: 'Mama Muster', guardianConsent: 'on', altcha: await altcha() },
      ctx(),
    )
    expect(ok.status).toBe('success')
  })
})

describe('Kursanmeldung mit Double-Opt-in', () => {
  it('legt unbestätigte Anmeldung an, Token nur als Hash, Mail mit Link', async () => {
    const course = await createCourse()
    const res = await submitCourseRegistration(payload, { ...person(1), course: String(course.id), altcha: await altcha() }, ctx())
    expect(res.status).toBe('success')

    const reg = (await payload.find({ collection: 'course-registrations', where: { email: { equals: 'person1@test.local' } } })).docs[0]
    expect(reg.status).toBe('unconfirmed')
    expect(mails).toHaveLength(1)
    const token = tokenFrom(mails[0])
    expect(JSON.stringify(reg)).not.toContain(token)
    // Fremdtext aus dem Formular landet nicht in der Mail an die (evtl. fremde) Adresse
    expect(mails[0].text).not.toContain('Vorname1')
  })

  it('vergibt Plätze in Reihenfolge der Bestätigung, danach Warteliste; Link nur einmal gültig', async () => {
    const course = await createCourse({ capacity: 2 })
    const tokens: string[] = []
    for (const n of [11, 12, 13]) {
      mails = []
      await submitCourseRegistration(payload, { ...person(n), course: String(course.id), altcha: await altcha() }, ctx())
      tokens.push(tokenFrom(mails[0]))
    }

    // Gleichzeitige Bestätigungen dürfen die Kapazität nicht überschreiten
    const results = await Promise.all(tokens.map((t) => confirmCourseRegistration(payload, t)))
    const statuses = results.map((r) => (r.ok ? r.status : r.reason)).sort()
    expect(statuses).toEqual(['registered', 'registered', 'waitlist'])

    expect(await confirmCourseRegistration(payload, tokens[0])).toEqual({ ok: false, reason: 'invalid' })
  })

  it('abgelaufene Links werden abgelehnt', async () => {
    const course = await createCourse()
    const past = new Date(Date.now() - (CONFIRM_TTL_HOURS + 1) * 3600_000)
    await submitCourseRegistration(payload, { ...person(21), course: String(course.id), altcha: await altcha() }, { ...ctx(), now: past })
    expect(await confirmCourseRegistration(payload, tokenFrom(mails[0]))).toEqual({ ok: false, reason: 'expired' })
  })

  it('lehnt Entwürfe, geschlossene Kurse, abgelaufenen Anmeldeschluss und Altersgrenzen ab', async () => {
    const draft = await createCourse({ status: 'draft' })
    const closed = await createCourse({ status: 'closed' })
    const late = await createCourse({ registrationDeadline: new Date(Date.now() - 3 * 86400_000).toISOString() })
    const kids = await createCourse({ minAge: 10 })

    for (const id of [draft.id, closed.id, late.id]) {
      const res = await submitCourseRegistration(payload, { ...person(31), course: String(id), altcha: await altcha() }, ctx())
      expect(res.status).toBe('error')
      expect(res.fieldErrors).toHaveProperty('course')
    }
    const young = `${new Date().getFullYear() - 7}-06-01`
    const res = await submitCourseRegistration(
      payload,
      { ...person(32, { birthDate: young, guardianName: 'Papa', guardianConsent: 'on' }), course: String(kids.id), altcha: await altcha() },
      ctx(),
    )
    expect(res.status).toBe('error')
    expect(res.fieldErrors).toHaveProperty('birthDate')
    expect(mails).toHaveLength(0)
  })

  it('doppelte Anmeldung derselben Person erzeugt keinen zweiten Datensatz', async () => {
    const course = await createCourse()
    const input = { ...person(41), course: String(course.id) }
    await submitCourseRegistration(payload, { ...input, altcha: await altcha() }, ctx())
    await submitCourseRegistration(payload, { ...input, altcha: await altcha() }, ctx())
    const { totalDocs } = await payload.count({ collection: 'course-registrations', where: { course: { equals: course.id } } })
    expect(totalDocs).toBe(1)
    // Nur der neueste Link ist gültig
    expect((await confirmCourseRegistration(payload, tokenFrom(mails[0]))).ok).toBe(false)
    expect((await confirmCourseRegistration(payload, tokenFrom(mails[1]))).ok).toBe(true)
  })

  it('ungültige Token-Formate werden ohne DB-Zugriff abgelehnt', async () => {
    for (const t of ['', 'abc', 'x'.repeat(200), "'; DROP TABLE x;--", null, 42]) {
      expect(await confirmCourseRegistration(payload, t)).toEqual({ ok: false, reason: 'invalid' })
    }
  })
})
