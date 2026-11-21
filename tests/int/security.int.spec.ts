/**
 * Phase 6: CSP, Upload-Härtung, Audit-Log und Löschfristen.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { login, revokeSessions } from '@/lib/auth/service'
import { confirmTwoFactorSetup, startTwoFactorSetup } from '@/lib/auth/twoFactor'
import { totp } from '@/lib/auth/totp'
import { purgeRetention, RETENTION } from '@/lib/retention'
import { buildCsp, newNonce } from '@/lib/security/csp'
import config from '@/payload.config'
import type { AuditLog, User } from '@/payload-types'

let payload: Payload
const PASSWORD = 'Sehne-Visier-Pfeil-2026'
let n = 0
let ipCounter = 0
const ctx = () => ({ ip: `192.0.2.${++ipCounter}` })

async function createUser(roles: User['roles'] = ['mitglied'], extra: Partial<User> = {}) {
  const i = ++n
  const doc = await payload.create({
    collection: 'users',
    data: { name: `Prüfperson ${i}`, email: `sec${i}@test.local`, password: PASSWORD, roles, sendInvite: false, ...extra },
  })
  return { ...doc, collection: 'users' as const }
}

/** Protokolleinträge zu einem Ziel (neueste zuerst). */
const entriesFor = async (targetId: number | string) =>
  (
    await payload.find({
      collection: 'audit-log',
      where: { targetId: { equals: String(targetId) } },
      sort: '-createdAt',
      limit: 100,
      depth: 0,
    })
  ).docs as AuditLog[]
const actions = async (targetId: number | string) => (await entriesFor(targetId)).map((e) => e.action).reverse()

/** Setzt createdAt/updatedAt direkt (Payload überschreibt Zeitstempel beim Speichern). */
async function backdate(table: string, id: number, date: Date, column = 'created_at') {
  const { sql } = await import('@payloadcms/db-postgres')
  const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }).drizzle
  await db.execute(sql.raw(`UPDATE "${table}" SET "${column}" = '${date.toISOString()}' WHERE id = ${Number(id)}`))
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  for (const collection of ['audit-log', 'course-registrations', 'courses', 'contact-requests', 'membership-applications', 'event-registrations', 'events', 'users', 'rate-limits'] as const) {
    await payload.delete({ collection, where: { id: { exists: true } }, context: { disableRevalidate: true } })
  }
  await createUser(['mitglied'], { twoFactorEnabled: true }) // erstes Konto wird Admin
})

describe('Content-Security-Policy', () => {
  it('erlaubt Skripte nur mit Nonce, ohne unsafe-inline/eval in Produktion', () => {
    const csp = buildCsp({ nonce: 'abc123' })
    const script = csp.split('; ').find((d) => d.startsWith('script-src'))!
    expect(script).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).not.toMatch(/https?:/) // keine fremden Quellen
  })

  it('lässt eval nur in der Entwicklung zu', () => {
    expect(buildCsp({ nonce: 'x', dev: true })).toContain("'unsafe-eval'")
    expect(buildCsp({ nonce: 'x' })).not.toContain('unsafe-eval')
  })

  it('erzeugt zufällige Nonces mit 128 Bit', () => {
    const a = newNonce()
    expect(Buffer.from(a, 'base64')).toHaveLength(16)
    expect(newNonce()).not.toBe(a)
  })
})

describe('Upload-Härtung', () => {
  it('entfernt EXIF/GPS aus dem Original, dreht es aufrecht und begrenzt die Größe', async () => {
    // 4000×3000, EXIF-Orientierung 6 (90° gedreht) und GPS-Koordinaten
    const input = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: '#ff8d00' } })
      .jpeg()
      .withExif({
        IFD0: { Make: 'Testkamera', Model: 'Geheim 3000' },
        IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '50/1 29/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '12/1 8/1 0/1' },
      })
      .withMetadata({ orientation: 6 })
      .toBuffer()
    const before = await sharp(input).metadata()
    expect(before.exif).toBeDefined()
    expect(before.orientation).toBe(6)

    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'EXIF-Test', visibility: 'public' },
      file: { data: input, mimetype: 'image/jpeg', name: 'exif-test.jpg', size: input.length },
    })
    try {
      const stored = await fs.readFile(path.resolve('uploads/media', doc.filename!))
      const meta = await sharp(stored).metadata()
      expect(meta.exif).toBeUndefined()
      expect(meta.orientation ?? 1).toBe(1)
      expect(stored.includes(Buffer.from('Geheim 3000'))).toBe(false)
      // aufrecht gedreht (Hochformat) und auf 2560 px begrenzt
      expect([meta.width, meta.height]).toEqual([1920, 2560])
      expect([doc.width, doc.height]).toEqual([1920, 2560])
    } finally {
      await payload.delete({ collection: 'media', id: doc.id })
    }
  })

  it('lehnt SVG und als Bild getarnte Dateien ab', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    await expect(
      payload.create({ collection: 'media', data: { alt: 'x', visibility: 'public' }, file: { data: svg, mimetype: 'image/svg+xml', name: 'x.svg', size: svg.length } }),
    ).rejects.toThrow()
    const html = Buffer.from('<html><script>alert(1)</script></html>')
    await expect(
      payload.create({ collection: 'media', data: { alt: 'x', visibility: 'public' }, file: { data: html, mimetype: 'image/png', name: 'x.png', size: html.length } }),
    ).rejects.toThrow()
  })
})

describe('Sicherheitsprotokoll', () => {
  it('protokolliert Anmeldung und Fehlversuche – unbekannte Adressen nur gehasht', async () => {
    const u = await createUser()
    await login(payload, { email: u.email, password: 'falsch-falsch-falsch' }, ctx())
    await login(payload, { email: u.email, password: PASSWORD }, ctx())
    expect(await actions(u.id)).toEqual(['user.created', 'login.failed', 'login.success'])
    const [success] = await entriesFor(u.id)
    expect(success.actorName).toBe(u.name)
    expect(success.ipHash).toMatch(/^[\w-]{32}$/)
    expect(JSON.stringify(success)).not.toContain('192.0.2.')

    await login(payload, { email: 'niemand@test.local', password: 'falsch-falsch-falsch' }, ctx())
    const { docs } = await payload.find({ collection: 'audit-log', where: { action: { equals: 'login.failed' }, targetId: { exists: false } }, depth: 0 })
    expect(docs).toHaveLength(1)
    expect(docs[0].emailHash).toBeTruthy()
    expect(JSON.stringify(docs[0])).not.toContain('niemand')
  })

  it('protokolliert 2FA-Fehlversuche, auch wenn der Login zurückgerollt wird', async () => {
    const u = await createUser()
    const { secret } = await startTwoFactorSetup(payload, u)
    await confirmTwoFactorSetup(payload, u.id, totp(secret))
    await login(payload, { email: u.email, password: PASSWORD, code: '000000' }, ctx())
    expect(await actions(u.id)).toEqual(['user.created', 'twoFactor.enabled', 'login.twoFactorFailed'])
  })

  it('protokolliert Rollen, Sperre und 2FA-Zurücksetzen mit handelnder Person', async () => {
    const admin = await createUser(['admin'], { twoFactorEnabled: true })
    const u = await createUser()
    await payload.update({ collection: 'users', id: u.id, overrideAccess: false, user: admin, data: { roles: ['mitglied', 'trainer'] } })
    await payload.update({ collection: 'users', id: u.id, overrideAccess: false, user: admin, data: { accountDisabled: true } })
    await payload.update({ collection: 'users', id: u.id, overrideAccess: false, user: admin, data: { name: 'Nur Name geändert' } })
    expect(await actions(u.id)).toEqual(['user.created', 'user.rolesChanged', 'user.disabled'])
    const roles = (await entriesFor(u.id)).find((e) => e.action === 'user.rolesChanged')!
    expect(roles.actorName).toBe(admin.name)
    expect(roles.details).toEqual({ from: ['mitglied'], to: ['mitglied', 'trainer'] })
  })

  it('protokolliert Löschungen durch Personen, nicht durch Skripte', async () => {
    const admin = await createUser(['admin'], { twoFactorEnabled: true })
    const a = await createUser()
    const b = await createUser()
    await payload.delete({ collection: 'users', id: a.id, overrideAccess: false, user: admin })
    await payload.delete({ collection: 'users', id: b.id })
    expect((await actions(a.id)).at(-1)).toBe('doc.deleted')
    expect(await actions(b.id)).toEqual(['user.created'])
  })

  it('ist nur für Admins lesbar und für niemanden änderbar', async () => {
    const admin = await createUser(['admin'], { twoFactorEnabled: true })
    const vorstand = await createUser(['vorstand'], { twoFactorEnabled: true })
    const [entry] = await entriesFor(admin.id)
    await expect(payload.find({ collection: 'audit-log', overrideAccess: false, user: admin })).resolves.toBeTruthy()
    for (const user of [vorstand, await createUser()]) {
      await expect(payload.find({ collection: 'audit-log', overrideAccess: false, user })).rejects.toMatchObject({ status: 403 })
    }
    await expect(
      payload.create({ collection: 'audit-log', overrideAccess: false, user: admin, data: { action: 'logout' } }),
    ).rejects.toMatchObject({ status: 403 })
    await expect(
      payload.update({ collection: 'audit-log', id: entry.id, overrideAccess: false, user: admin, data: { actorName: 'x' } }),
    ).rejects.toMatchObject({ status: 403 })
    await expect(payload.delete({ collection: 'audit-log', id: entry.id, overrideAccess: false, user: admin })).rejects.toMatchObject({ status: 403 })
  })

  it('beendete Sessions bleiben beendet (Grundlage „Andere Geräte abmelden“)', async () => {
    const u = await createUser()
    const res = await login(payload, { email: u.email, password: PASSWORD }, ctx())
    if (!res.ok) throw new Error('Login fehlgeschlagen')
    await revokeSessions(payload, u.id)
    expect((await payload.auth({ headers: new Headers({ Authorization: `JWT ${res.token}` }) })).user).toBeNull()
  })
})

describe('Löschfristen', () => {
  const now = new Date()
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000)
  const courseWith = (start: Date) =>
    payload.create({
      collection: 'courses',
      data: { title: `Kurs ${++n}`, audience: 'adults', status: 'closed', capacity: 5, registrationDeadline: start.toISOString(), sessions: [{ start: start.toISOString() }] },
      context: { disableRevalidate: true },
    })
  const registration = (course: number, status: 'unconfirmed' | 'registered') =>
    payload.create({
      collection: 'course-registrations',
      data: {
        course,
        status,
        firstName: 'Erika',
        lastName: 'Test',
        birthDate: '1990-01-01',
        email: `kurs${++n}@test.local`,
        consents: { privacyAt: now.toISOString() },
      } as never,
      context: { disableRevalidate: true },
    })

  it('löscht abgelaufene Daten und lässt alles andere stehen', async () => {
    const future = await courseWith(new Date(now.getTime() + 30 * 86400_000))
    const old = await courseWith(daysAgo(400))
    const recent = await courseWith(daysAgo(200))

    const unconfirmedOld = await registration(future.id, 'unconfirmed')
    await backdate('course_registrations', unconfirmedOld.id, new Date(now.getTime() - (RETENTION.unconfirmedCourseRegistrationHours + 1) * 3600_000))
    const unconfirmedNew = await registration(future.id, 'unconfirmed')
    const confirmedFuture = await registration(future.id, 'registered')
    await backdate('course_registrations', confirmedFuture.id, daysAgo(10))
    const oldCourseReg = await registration(old.id, 'registered')
    const recentCourseReg = await registration(recent.id, 'registered')

    const contact = (createdDaysAgo: number) =>
      payload
        .create({ collection: 'contact-requests', data: { name: 'Erika', email: 'e@test.local', topic: 'general', message: 'Hallo Verein', status: 'new', consents: { privacyAt: now.toISOString() } } as never })
        .then(async (d) => (await backdate('contact_requests', d.id, daysAgo(createdDaysAgo)), d))
    const oldContact = await contact(190)
    const newContact = await contact(150)

    const application = (status: 'rejected' | 'accepted', updatedDaysAgo: number) =>
      payload
        .create({
          collection: 'membership-applications',
          data: { status, firstName: 'Max', lastName: 'Test', birthDate: '1990-01-01', email: 'm@test.local', street: 'Weg 1', postalCode: '08523', city: 'Plauen', bowType: 'recurve', consents: { privacyAt: now.toISOString() } } as never,
        })
        .then(async (d) => (await backdate('membership_applications', d.id, daysAgo(updatedDaysAgo), 'updated_at'), d))
    const oldRejected = await application('rejected', 100)
    const newRejected = await application('rejected', 60)
    const oldAccepted = await application('accepted', 400)

    // Turnieranmeldungen: Termin vor 13 Monaten (weg), vor 2 Monaten (bleibt), mehrtägig mit Ende vor 11 Monaten (bleibt)
    const member = await createUser()
    const event = (start: Date, end?: Date) =>
      payload.create({
        collection: 'events',
        data: { title: `Turnier ${++n}`, slug: `turnier-${n}`, startDate: start.toISOString(), endDate: end?.toISOString(), eventType: 'tournament', visibility: 'public' },
        context: { disableRevalidate: true },
      })
    const eventReg = async (start: Date, end?: Date) =>
      payload.create({
        collection: 'event-registrations',
        data: { event: (await event(start, end)).id, member: member.id, bowClass: 'recurve', status: 'registered' },
        context: { disableRevalidate: true },
      })
    const oldEventReg = await eventReg(daysAgo(395))
    const recentEventReg = await eventReg(daysAgo(60))
    const longEventReg = await eventReg(daysAgo(400), daysAgo(335))

    const oldAudit = await payload.create({ collection: 'audit-log', data: { action: 'logout' } })
    await backdate('audit_log', oldAudit.id, daysAgo(400))

    const result = await purgeRetention(payload, now)
    expect(result).toEqual({
      unconfirmedCourseRegistrations: 1,
      courseRegistrations: 1,
      eventRegistrations: 1,
      contactRequests: 1,
      rejectedApplications: 1,
      auditLog: 1,
    })

    const exists = async (collection: 'course-registrations' | 'contact-requests' | 'membership-applications' | 'audit-log', id: number) =>
      Boolean(await payload.findByID({ collection, id, disableErrors: true, depth: 0 }))
    expect(await exists('course-registrations', unconfirmedOld.id)).toBe(false)
    expect(await exists('course-registrations', oldCourseReg.id)).toBe(false)
    expect(await exists('contact-requests', oldContact.id)).toBe(false)
    expect(await exists('membership-applications', oldRejected.id)).toBe(false)
    expect(await exists('audit-log', oldAudit.id)).toBe(false)
    expect(Boolean(await payload.findByID({ collection: 'event-registrations', id: oldEventReg.id, disableErrors: true }))).toBe(false)
    for (const r of [recentEventReg, longEventReg]) {
      expect(Boolean(await payload.findByID({ collection: 'event-registrations', id: r.id, disableErrors: true }))).toBe(true)
    }
    for (const id of [unconfirmedNew.id, confirmedFuture.id, recentCourseReg.id]) expect(await exists('course-registrations', id)).toBe(true)
    expect(await exists('contact-requests', newContact.id)).toBe(true)
    expect(await exists('membership-applications', newRejected.id)).toBe(true)
    expect(await exists('membership-applications', oldAccepted.id)).toBe(true)

    // Sammeleintrag ohne Inhalte
    const { docs } = await payload.find({ collection: 'audit-log', where: { action: { equals: 'retention.purged' } }, depth: 0 })
    expect(docs[0].details).toEqual(result)

    // Zweiter Lauf: nichts mehr zu tun, kein weiterer Eintrag
    expect(Object.values(await purgeRetention(payload, now)).every((v) => v === 0)).toBe(true)
    expect((await payload.count({ collection: 'audit-log', where: { action: { equals: 'retention.purged' } } })).totalDocs).toBe(1)
  })

  it('ist als stündlicher Job registriert', async () => {
    const task = payload.config.jobs.tasks?.find((t) => t.slug === 'purge-retention')
    expect(task?.schedule?.[0]).toMatchObject({ cron: '0 7 * * * *', queue: 'maintenance' })
    const job = await payload.jobs.queue({ task: 'purge-retention', input: {}, queue: 'maintenance' })
    await payload.jobs.runByID({ id: job.id })
    expect(await payload.findByID({ collection: 'payload-jobs', id: job.id, disableErrors: true })).toBeNull()
  })
})
