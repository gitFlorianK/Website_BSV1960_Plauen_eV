/**
 * Zugriffsregeln (docs/konzept.md, Abschnitt 2 + 5): Rolle × Collection × Operation.
 * Läuft gegen die Test-DB (vitest.config.mts) und leert sie zu Beginn.
 */
import { getPayload, type CollectionSlug, type Payload } from 'payload'
import sharp from 'sharp'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

import { Users } from '@/collections/Users'
import type { User } from '@/payload-types'

let payload: Payload

type TestUser = User & { collection: 'users' }
const u: Record<
  'admin' | 'vorstand' | 'trainer' | 'redakteur' | 'mitglied' | 'mitglied2' | 'gesperrt',
  TestUser
> = {} as never

const ids: Record<string, number> = {}

const CLEANUP_ORDER: CollectionSlug[] = [
  'event-registrations',
  'course-registrations',
  'form-submissions',
  'search',
  'posts',
  'pages',
  'galleries',
  'events',
  'courses',
  'training-slots',
  'locations',
  'seasons',
  'sponsors',
  'documents',
  'media',
  'categories',
  'users',
]

let PNG_1x1: Buffer
/** Minimales, strukturell gültiges PDF (Payload prüft Header, xref und %%EOF). */
const PDF_MIN = (() => {
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets = objs.map((o, i) => {
    const off = body.length
    body += `${i + 1} 0 obj ${o} endobj\n`
    return off
  })
  const xref = body.length
  body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  body += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  body += `trailer << /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(body, 'latin1')
})()

const richText = (text: string) => ({
  root: {
    type: 'root',
    version: 1,
    direction: null,
    format: '' as const,
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: null,
        format: '' as const,
        indent: 0,
        textFormat: 0,
        textStyle: '',
        children: [{ type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' }],
      },
    ],
  },
})

/** Erwartet, dass die Operation mit Zugriffsfehler (403/404) scheitert. */
async function expectDenied(op: Promise<unknown>) {
  await expect(op).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
}

async function createUser(name: string, roles: User['roles'], extra: Partial<User> = {}) {
  const doc = await payload.create({
    collection: 'users',
    data: {
      name,
      email: `${name}@test.local`,
      password: `Pw-${name}-2026-sicher!`,
      roles,
      ...extra,
    },
  })
  return { ...doc, collection: 'users' as const }
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  PNG_1x1 = await sharp({
    create: { width: 4, height: 4, channels: 3, background: '#b30000' },
  })
    .png()
    .toBuffer()

  for (const collection of CLEANUP_ORDER) {
    await payload.delete({ collection, where: { id: { exists: true } } })
  }

  // Das allererste Konto wird automatisch Admin – unabhängig von übergebenen Rollen.
  u.admin = await createUser('admin', ['mitglied'])
  u.vorstand = await createUser('vorstand', ['vorstand', 'mitglied'])
  u.trainer = await createUser('trainer', ['trainer', 'mitglied'])
  u.redakteur = await createUser('redakteur', ['redakteur'])
  u.mitglied = await createUser('mitglied', ['mitglied'])
  u.mitglied2 = await createUser('mitglied2', ['mitglied'])
  u.gesperrt = await createUser('gesperrt', ['mitglied', 'trainer'], { accountDisabled: true })

  const base = { content: richText('Text'), _status: 'published' as const }
  ids.postPublic = (await payload.create({ collection: 'posts', data: { ...base, title: 'Öffentlich', slug: 'oeffentlich', visibility: 'public' } })).id
  ids.postMembers = (await payload.create({ collection: 'posts', data: { ...base, title: 'Intern', slug: 'intern', visibility: 'members' } })).id
  ids.postDraft = (
    await payload.create({
      collection: 'posts',
      data: { content: richText('Text'), title: 'Entwurf', slug: 'entwurf', visibility: 'public', _status: 'draft' },
      draft: true,
    })
  ).id

  const start = new Date(Date.now() + 7 * 864e5).toISOString()
  ids.eventPublic = (await payload.create({ collection: 'events', data: { title: 'Turnier', slug: 'turnier', startDate: start, eventType: 'tournament', visibility: 'public', registration: { enabled: true } } })).id
  ids.eventMembers = (await payload.create({ collection: 'events', data: { title: 'Mitgliederversammlung', slug: 'mv', startDate: start, eventType: 'club', visibility: 'members' } })).id
  ids.eventClosed = (await payload.create({ collection: 'events', data: { title: 'Ohne Anmeldung', slug: 'ohne-anmeldung', startDate: start, eventType: 'other', visibility: 'public', registration: { enabled: false } } })).id

  const courseBase = { audience: 'adults' as const, capacity: 10, registrationDeadline: start }
  ids.courseDraft = (await payload.create({ collection: 'courses', data: { ...courseBase, title: 'Kurs Entwurf', status: 'draft' } })).id
  ids.courseOpen = (await payload.create({ collection: 'courses', data: { ...courseBase, title: 'Kurs offen', status: 'open' } })).id

  ids.courseReg = (
    await payload.create({
      collection: 'course-registrations',
      data: { course: ids.courseOpen, status: 'unconfirmed', firstName: 'Erika', lastName: 'Muster', birthDate: '1990-01-01', email: 'erika@test.local' },
    })
  ).id

  ids.mediaPublic = (await payload.create({ collection: 'media', data: { alt: 'öffentlich', visibility: 'public' }, file: { data: PNG_1x1, mimetype: 'image/png', name: 'pub.png', size: PNG_1x1.length } })).id
  ids.mediaMembers = (await payload.create({ collection: 'media', data: { alt: 'intern', visibility: 'members' }, file: { data: PNG_1x1, mimetype: 'image/png', name: 'int.png', size: PNG_1x1.length } })).id
  ids.document = (await payload.create({ collection: 'documents', data: { title: 'Satzung', category: 'statutes' }, file: { data: PDF_MIN, mimetype: 'application/pdf', name: 'satzung.pdf', size: PDF_MIN.length } })).id
})

afterAll(async () => {
  // Hochgeladene Testdateien wieder entfernen (Payload löscht die Dateien mit).
  await payload?.delete({ collection: 'media', where: { id: { exists: true } } })
  await payload?.delete({ collection: 'documents', where: { id: { exists: true } } })
})

const titles = async (user?: TestUser) =>
  (await payload.find({ collection: 'posts', overrideAccess: false, user, draft: false })).docs
    .map((d) => d.title)
    .sort()

describe('Erstregistrierung', () => {
  it('macht das erste Konto zum Admin', () => {
    expect(u.admin.roles).toEqual(['admin'])
  })
})

describe('Anonyme Besucher', () => {
  it('sehen nur öffentliche, veröffentlichte Beiträge', async () => {
    expect(await titles()).toEqual(['Öffentlich'])
  })

  it('sehen nur öffentliche Termine und keine Kursentwürfe', async () => {
    const events = await payload.find({ collection: 'events', overrideAccess: false })
    expect(events.docs.map((e) => e.title).sort()).toEqual(['Ohne Anmeldung', 'Turnier'])
    const courses = await payload.find({ collection: 'courses', overrideAccess: false })
    expect(courses.docs.map((c) => c.title)).toEqual(['Kurs offen'])
  })

  it('sehen nur öffentliche Medien', async () => {
    const media = await payload.find({ collection: 'media', overrideAccess: false })
    expect(media.docs.map((m) => m.id)).toEqual([ids.mediaPublic])
  })

  it('haben keinen Zugriff auf Nutzer, Dokumente und Anmeldungen', async () => {
    await expectDenied(payload.find({ collection: 'users', overrideAccess: false }))
    await expectDenied(payload.find({ collection: 'documents', overrideAccess: false }))
    await expectDenied(payload.find({ collection: 'course-registrations', overrideAccess: false }))
    await expectDenied(payload.find({ collection: 'event-registrations', overrideAccess: false }))
  })

  it('können Einsendungen und Kursanmeldungen nicht direkt über die API anlegen', async () => {
    await expectDenied(
      payload.create({
        collection: 'course-registrations',
        overrideAccess: false,
        data: { course: ids.courseOpen, status: 'unconfirmed', firstName: 'X', lastName: 'Y', birthDate: '2000-01-01', email: 'x@test.local' },
      }),
    )
    await expectDenied(
      payload.create({ collection: 'form-submissions', overrideAccess: false, data: { form: 1, submissionData: [] } }),
    )
  })
})

describe('Mitglied', () => {
  it('sieht öffentliche und interne Beiträge, aber keine Entwürfe', async () => {
    expect(await titles(u.mitglied)).toEqual(['Intern', 'Öffentlich'])
  })

  it('sieht interne Medien und Dokumente', async () => {
    const media = await payload.find({ collection: 'media', overrideAccess: false, user: u.mitglied })
    expect(media.totalDocs).toBe(2)
    const docs = await payload.find({ collection: 'documents', overrideAccess: false, user: u.mitglied })
    expect(docs.totalDocs).toBe(1)
  })

  it('hat keinen Zugang zum Admin-Panel, Staff schon', () => {
    const admin = Users.access!.admin!
    const req = (user: TestUser) => ({ req: { user } }) as never
    expect(admin(req(u.mitglied))).toBe(false)
    expect(admin(req(u.redakteur))).toBe(true)
    expect(admin(req(u.gesperrt))).toBe(false)
  })

  it('sieht nur das eigene Nutzerkonto, ohne fremde Telefonnummern', async () => {
    const res = await payload.find({ collection: 'users', overrideAccess: false, user: u.mitglied })
    expect(res.docs.map((d) => d.id)).toEqual([u.mitglied.id])
  })

  it('kann eigenen Namen ändern, aber nicht die eigenen Rollen', async () => {
    const updated = await payload.update({
      collection: 'users',
      id: u.mitglied.id,
      overrideAccess: false,
      user: u.mitglied,
      data: { name: 'mitglied-neu', roles: ['admin'] },
    })
    expect(updated.name).toBe('mitglied-neu')
    expect(updated.roles).toEqual(['mitglied'])
  })

  it('kann andere Nutzer nicht ändern', async () => {
    await expectDenied(
      payload.update({ collection: 'users', id: u.mitglied2.id, overrideAccess: false, user: u.mitglied, data: { name: 'gehackt' } }),
    )
  })

  it('kann keine Inhalte anlegen', async () => {
    await expectDenied(
      payload.create({ collection: 'posts', overrideAccess: false, user: u.mitglied, data: { title: 'x', slug: 'x', visibility: 'public', content: richText('x') } }),
    )
    await expectDenied(
      payload.create({ collection: 'events', overrideAccess: false, user: u.mitglied, data: { title: 'x', slug: 'x', eventType: 'other', visibility: 'public', startDate: new Date().toISOString() } }),
    )
  })

  it('meldet sich selbst an – auch wenn ein anderes Mitglied übergeben wird', async () => {
    const reg = await payload.create({
      collection: 'event-registrations',
      overrideAccess: false,
      user: u.mitglied,
      data: { event: ids.eventPublic, member: u.mitglied2.id, bowClass: 'recurve', status: 'confirmed' },
    })
    const member = typeof reg.member === 'object' ? reg.member.id : reg.member
    expect(member).toBe(u.mitglied.id)
    expect(reg.status).toBe('registered')
  })

  it('kann sich nicht doppelt oder für Termine ohne Anmeldung anmelden', async () => {
    const data = { event: ids.eventPublic, bowClass: 'recurve' as const, status: 'registered' as const }
    await expect(
      payload.create({ collection: 'event-registrations', overrideAccess: false, user: u.mitglied, data: { ...data, member: u.mitglied.id } }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'event-registrations',
        overrideAccess: false,
        user: u.mitglied,
        data: { event: ids.eventClosed, member: u.mitglied.id, bowClass: 'recurve', status: 'registered' },
      }),
    ).rejects.toThrow()
  })

  it('sieht nur eigene Terminanmeldungen', async () => {
    await payload.create({
      collection: 'event-registrations',
      overrideAccess: false,
      user: u.mitglied2,
      data: { event: ids.eventPublic, member: u.mitglied2.id, bowClass: 'compound', status: 'registered' },
    })
    const own = await payload.find({ collection: 'event-registrations', overrideAccess: false, user: u.mitglied })
    expect(own.totalDocs).toBe(1)
    const all = await payload.find({ collection: 'event-registrations', overrideAccess: false, user: u.trainer })
    expect(all.totalDocs).toBe(2)
  })

  it('hat keinen Zugriff auf Kursanmeldungen', async () => {
    await expectDenied(payload.find({ collection: 'course-registrations', overrideAccess: false, user: u.mitglied }))
  })
})

describe('Gesperrtes Konto', () => {
  it('hat trotz Rollen keine Rechte', async () => {
    expect(await titles(u.gesperrt)).toEqual(['Öffentlich'])
    await expectDenied(payload.find({ collection: 'users', overrideAccess: false, user: u.gesperrt }))
    await expectDenied(
      payload.create({ collection: 'events', overrideAccess: false, user: u.gesperrt, data: { title: 'x', slug: 'x', eventType: 'other', visibility: 'public', startDate: new Date().toISOString() } }),
    )
  })

  it('kann sich nicht anmelden', async () => {
    await expect(
      payload.login({ collection: 'users', data: { email: 'gesperrt@test.local', password: 'Pw-gesperrt-2026-sicher!' } }),
    ).rejects.toThrow()
  })
})

describe('Redakteur', () => {
  it('sieht Entwürfe und darf Beiträge anlegen', async () => {
    const all = await payload.find({ collection: 'posts', overrideAccess: false, user: u.redakteur, draft: true })
    expect(all.totalDocs).toBe(3)
    const post = await payload.create({
      collection: 'posts',
      overrideAccess: false,
      user: u.redakteur,
      data: { title: 'Neu', slug: 'neu', content: richText('x'), visibility: 'public' },
    })
    expect(post.id).toBeDefined()
  })

  it('darf keine Termine, Nutzer oder Kursanmeldungen verwalten', async () => {
    await expectDenied(
      payload.create({ collection: 'events', overrideAccess: false, user: u.redakteur, data: { title: 'x', slug: 'x', eventType: 'other', visibility: 'public', startDate: new Date().toISOString() } }),
    )
    await expectDenied(
      payload.create({ collection: 'users', overrideAccess: false, user: u.redakteur, data: { name: 'x', email: 'x@test.local', password: 'Pw-x-2026-sicher!', roles: ['mitglied'] } }),
    )
    await expectDenied(payload.find({ collection: 'course-registrations', overrideAccess: false, user: u.redakteur }))
  })

  it('darf Vereinsdaten nicht ändern, Header schon', async () => {
    await expectDenied(
      payload.updateGlobal({ slug: 'site-settings', overrideAccess: false, user: u.redakteur, data: { clubName: 'x' } }),
    )
    await payload.updateGlobal({ slug: 'header', overrideAccess: false, user: u.redakteur, data: { navItems: [] } })
  })
})

describe('Trainer', () => {
  it('darf Termine anlegen und Kursanmeldungen lesen, aber nicht ändern', async () => {
    const ev = await payload.create({
      collection: 'events',
      overrideAccess: false,
      user: u.trainer,
      data: { title: 'Training', slug: 'training', visibility: 'public', startDate: new Date().toISOString(), eventType: 'training' },
    })
    expect(ev.id).toBeDefined()
    const regs = await payload.find({ collection: 'course-registrations', overrideAccess: false, user: u.trainer })
    expect(regs.totalDocs).toBe(1)
    await expectDenied(
      payload.update({ collection: 'course-registrations', id: ids.courseReg, overrideAccess: false, user: u.trainer, data: { status: 'confirmed' } }),
    )
  })
})

describe('Vorstand', () => {
  it('legt Mitglieder an – Rollen kann nur der Admin vergeben', async () => {
    const created = await payload.create({
      collection: 'users',
      overrideAccess: false,
      user: u.vorstand,
      data: { name: 'neu', email: 'neu@test.local', password: 'Pw-neu-2026-sicher!', roles: ['admin'] },
    })
    expect(created.roles).toEqual(['mitglied'])
  })

  it('kann Mitglieder sperren, aber keine Admin-/Vorstandskonten ändern', async () => {
    const locked = await payload.update({
      collection: 'users',
      id: u.mitglied2.id,
      overrideAccess: false,
      user: u.vorstand,
      data: { accountDisabled: true },
    })
    expect(locked.accountDisabled).toBe(true)
    await expectDenied(
      payload.update({ collection: 'users', id: u.admin.id, overrideAccess: false, user: u.vorstand, data: { email: 'uebernahme@test.local' } }),
    )
  })

  it('verwaltet Kursanmeldungen', async () => {
    const reg = await payload.update({
      collection: 'course-registrations',
      id: ids.courseReg,
      overrideAccess: false,
      user: u.vorstand,
      data: { status: 'confirmed' },
    })
    expect(reg.status).toBe('confirmed')
  })

  it('darf keine Nutzer löschen (nur Admin)', async () => {
    await expectDenied(payload.delete({ collection: 'users', id: u.mitglied2.id, overrideAccess: false, user: u.vorstand }))
  })
})

describe('Admin', () => {
  it('darf Rollen vergeben', async () => {
    const updated = await payload.update({
      collection: 'users',
      id: u.mitglied2.id,
      overrideAccess: false,
      user: u.admin,
      data: { roles: ['mitglied', 'trainer'] },
    })
    expect(updated.roles).toEqual(['mitglied', 'trainer'])
  })
})
