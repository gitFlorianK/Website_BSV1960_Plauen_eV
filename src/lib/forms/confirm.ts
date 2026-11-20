import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { adminDocUrl, clubAddress, sendText } from '@/lib/mail'
import { hashToken } from '@/lib/secrets'

/*
 * Double-Opt-in für Kursanmeldungen. Platzvergabe atomar: Ein Advisory-Lock je Kurs serialisiert
 * gleichzeitige Bestätigungen, damit die Kapazität nie überschritten wird.
 * Der Token wird nur als SHA-256-Hash gespeichert und nach Verwendung gelöscht.
 */

export type ConfirmResult =
  | { ok: true; status: 'registered' | 'waitlist'; courseTitle: string }
  | { ok: false; reason: 'invalid' | 'expired' }

type Rows = { rows: Record<string, unknown>[] }
type Tx = { execute: (q: ReturnType<typeof sql>) => Promise<Rows> }
type Drizzle = Tx & { transaction: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T> }

const LOCK_NAMESPACE = 196001

export async function confirmCourseRegistration(payload: Payload, token: unknown): Promise<ConfirmResult> {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,64}$/.test(token)) return { ok: false, reason: 'invalid' }
  const hash = hashToken(token)
  const db = (payload.db as unknown as { drizzle: Drizzle }).drizzle

  const result = await db.transaction(async (tx) => {
    const found = await tx.execute(sql`
      SELECT id, course_id, confirm_token_expires_at < now() AS expired
      FROM course_registrations
      WHERE confirm_token_hash = ${hash} AND status = 'unconfirmed'
      FOR UPDATE`)
    const reg = found.rows[0]
    if (!reg) return { ok: false as const, reason: 'invalid' as const }
    if (reg.expired) return { ok: false as const, reason: 'expired' as const }

    const courseId = Number(reg.course_id)
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${LOCK_NAMESPACE}, ${courseId})`)

    const courseRows = await tx.execute(sql`SELECT title, status, capacity FROM courses WHERE id = ${courseId}`)
    const course = courseRows.rows[0]
    const taken = await tx.execute(sql`
      SELECT count(*)::int AS n FROM course_registrations
      WHERE course_id = ${courseId} AND status IN ('registered', 'confirmed')`)
    const free = course && course.status === 'open' && Number(taken.rows[0]?.n ?? 0) < Number(course.capacity)
    const status = free ? ('registered' as const) : ('waitlist' as const)

    await tx.execute(sql`
      UPDATE course_registrations
      SET status = ${status}, confirmed_at = now(), confirm_token_hash = NULL,
          confirm_token_expires_at = NULL, updated_at = now()
      WHERE id = ${reg.id}`)

    return {
      ok: true as const,
      status,
      courseTitle: String(course?.title ?? 'Anfängerkurs'),
      registrationId: Number(reg.id),
    }
  })

  if (!result.ok) return result

  const reg = await payload.findByID({
    collection: 'course-registrations',
    id: result.registrationId,
    depth: 0,
    overrideAccess: true,
  })
  const onList = result.status === 'waitlist'

  await sendText(payload, {
    to: reg.email,
    subject: onList ? `Warteliste: ${result.courseTitle}` : `Anmeldung bestätigt: ${result.courseTitle}`,
    text: [
      'Hallo,',
      '',
      onList
        ? `danke für die Bestätigung! Der Kurs „${result.courseTitle}“ ist leider schon voll – die Anmeldung steht auf der Warteliste. Wird ein Platz frei, melden wir uns.`
        : `danke für die Bestätigung! Die Anmeldung zum Kurs „${result.courseTitle}“ ist eingegangen und ein Platz ist reserviert.`,
      '',
      onList ? '' : 'Vor Kursbeginn bekommst du von uns alle weiteren Infos. Bogen, Pfeile und Zubehör werden gestellt – bring einfach bequeme Sportkleidung mit.',
      '',
      'Falls du doch nicht teilnehmen kannst, sag uns bitte kurz Bescheid, damit wir den Platz weitergeben können.',
    ].join('\n'),
  })

  const club = await clubAddress(payload)
  if (club) {
    await sendText(payload, {
      to: club,
      subject: `Kursanmeldung (${onList ? 'Warteliste' : 'Platz'}): ${result.courseTitle}`,
      text: [
        `Eine Anmeldung zum Kurs „${result.courseTitle}“ wurde per E-Mail bestätigt.`,
        `Status: ${onList ? 'Warteliste' : 'Angemeldet (Platz reserviert)'}`,
        '',
        `Details im Admin: ${adminDocUrl('course-registrations', result.registrationId)}`,
      ].join('\n'),
    })
  }

  return { ok: true, status: result.status, courseTitle: result.courseTitle }
}
