/**
 * Testdaten für Playwright. Läuft über `payload run` (tsx), weil die Payload-Config im
 * Playwright-Prozess (natives ESM) nicht lädt. Auftrag als JSON in E2E_SEED, Ergebnis als
 * JSON in der letzten Ausgabezeile.
 */
import { getPayload } from 'payload'
import sharp from 'sharp'
import config from '@payload-config'

import { encryptSecret } from '@/lib/auth/crypto'

type Role = 'admin' | 'vorstand' | 'trainer' | 'redakteur' | 'mitglied'
type Task =
  | { action: 'user'; email: string; password: string; name: string; roles: Role[]; totpSecret?: string; invite?: boolean }
  | { action: 'deleteUser'; email: string }
  | { action: 'event'; title: string; slug: string; startDate: string; deadline?: string; visibility: 'public' | 'members' }
  | { action: 'deleteEvent'; slug: string }
  | { action: 'cleanup'; eventSlugPrefix: string; emailPrefix: string }
  | { action: 'deleteEmptyDrafts' }
  | { action: 'post'; title: string; slug: string; text: string; visibility: 'public' | 'members'; status: 'draft' | 'published'; image?: number }
  | { action: 'deletePost'; slug: string }
  | { action: 'course'; title: string; audience: 'adults' | 'youth'; deadline: string }
  | { action: 'deleteCourses'; titlePrefix: string }
  | { action: 'media'; name: string; alt: string; visibility: 'public' | 'members' }
  | { action: 'deleteMedia'; id: number }
  | { action: 'baseUser' }

const task = JSON.parse(process.env.E2E_SEED ?? '{}') as Task
const payload = await getPayload({ config })
const context = { disableRevalidate: true }
let result: unknown = null

switch (task.action) {
  case 'baseUser': {
    // Auf leerer Datenbank würde sonst das nächste Testkonto automatisch Administrator
    // (Users-Hook „erstes Konto“) – z. B. in der CI, wenn ein Test seine Konten wieder löscht.
    // Das Basiskonto ist gesperrt und hat damit keinerlei Rechte.
    const { totalDocs } = await payload.count({ collection: 'users' })
    if (totalDocs === 0) {
      await payload.create({
        collection: 'users',
        data: { email: 'e2e-basis@test.local', name: 'E2E Basiskonto', password: crypto.randomUUID(), roles: ['mitglied'], accountDisabled: true },
      })
    }
    result = { created: totalDocs === 0 }
    break
  }
  case 'user': {
    await payload.delete({ collection: 'users', where: { email: { equals: task.email } } })
    const user = await payload.create({
      collection: 'users',
      data: { email: task.email, password: task.password, name: task.name, roles: task.roles, sendInvite: Boolean(task.invite) },
    })
    if (task.totpSecret) {
      await payload.db.updateOne({
        collection: 'users',
        id: user.id,
        data: { twoFactorEnabled: true, twoFactorSecret: encryptSecret(task.totpSecret), twoFactorRecoveryCodes: [] },
        returning: false,
      })
    }
    result = { id: user.id }
    break
  }
  case 'post': {
    await payload.delete({ collection: 'posts', where: { slug: { equals: task.slug } }, context })
    const paragraph = { type: 'paragraph', version: 1, direction: null, format: '', indent: 0, textFormat: 0, textStyle: '' }
    const text = { type: 'text', version: 1, text: task.text, format: 0, mode: 'normal', style: '', detail: 0 }
    const post = await payload.create({
      collection: 'posts',
      draft: task.status === 'draft',
      data: {
        title: task.title,
        slug: task.slug,
        visibility: task.visibility,
        _status: task.status,
        // Titelbild und Vorschaubild (SEO) – Startseite und Beitragsliste nutzen beide
        ...(task.image ? { heroImage: task.image, meta: { image: task.image } } : {}),
        content: { root: { type: 'root', version: 1, direction: null, format: '', indent: 0, children: [{ ...paragraph, children: [text] }] } },
      } as never,
      context,
    })
    result = { id: post.id }
    break
  }
  case 'media': {
    // Kleines erzeugtes PNG; Payload legt daraus alle Bildgrößen an
    const data = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#5b7c99' } }).png().toBuffer()
    const media = await payload.create({
      collection: 'media',
      data: { alt: task.alt, visibility: task.visibility },
      file: { data, mimetype: 'image/png', name: task.name, size: data.length },
      context,
    })
    result = { id: media.id, filename: media.filename }
    break
  }
  case 'deleteMedia':
    await payload.delete({ collection: 'media', id: task.id, context })
    break
  case 'deletePost':
    await payload.delete({ collection: 'posts', where: { slug: { equals: task.slug } }, context })
    break
  case 'deleteUser':
    await payload.delete({ collection: 'users', where: { email: { equals: task.email } } })
    break
  case 'event': {
    await payload.delete({ collection: 'events', where: { slug: { equals: task.slug } }, context })
    const ev = await payload.create({
      collection: 'events',
      data: {
        title: task.title,
        slug: task.slug,
        startDate: task.startDate,
        eventType: 'tournament',
        visibility: task.visibility,
        registration: { enabled: true, deadline: task.deadline },
      },
      context,
    })
    result = { id: ev.id }
    break
  }
  case 'course': {
    await payload.delete({ collection: 'courses', where: { title: { equals: task.title } }, context })
    const course = await payload.create({
      collection: 'courses',
      data: { title: task.title, audience: task.audience, status: 'open', capacity: 10, registrationDeadline: task.deadline, sessions: [{ start: task.deadline }] },
      context,
    })
    result = { id: course.id }
    break
  }
  case 'deleteCourses':
    await payload.delete({ collection: 'courses', where: { title: { like: task.titlePrefix } }, context })
    break
  case 'deleteEvent':
    await payload.delete({ collection: 'events', where: { slug: { equals: task.slug } }, context })
    break
  case 'cleanup':
    // Reste abgebrochener Läufe
    await payload.delete({ collection: 'events', where: { slug: { like: task.eventSlugPrefix } }, context })
    await payload.delete({ collection: 'users', where: { email: { like: task.emailPrefix } } })
    break
  case 'deleteEmptyDrafts':
    // Die Create-Ansicht im Admin legt per Autosave sofort einen leeren Entwurf an
    for (const collection of ['pages', 'posts'] as const) {
      await payload.delete({
        collection,
        where: { or: [{ title: { exists: false } }, { title: { equals: '' } }] },
        context,
      })
    }
    break
  default:
    throw new Error(`Unbekannter Auftrag: ${JSON.stringify(task)}`)
}

console.log(JSON.stringify({ result }))
process.exit(0)
