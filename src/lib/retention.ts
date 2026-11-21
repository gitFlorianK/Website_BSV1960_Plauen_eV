import type { Payload, Where } from 'payload'

import { audit } from '@/lib/audit'
import { purgeExpired } from '@/lib/rateLimit'

/*
 * Löschfristen (docs/konzept.md, Abschnitt 6). Läuft stündlich als Job `purge-retention`
 * (src/payload.config.ts). Gelöscht wird endgültig; ein Sammeleintrag im Sicherheitsprotokoll
 * hält fest, wie viele Datensätze betroffen waren (ohne Inhalte).
 */

const HOUR = 60 * 60 * 1000

/** Fristen – zentral, damit Datenschutzerklärung und Code übereinstimmen. */
export const RETENTION = {
  /** Kursanmeldung ohne Bestätigung per E-Mail-Link (so in der Bestätigungsmail zugesagt) */
  unconfirmedCourseRegistrationHours: 48,
  /** Kursanmeldungen nach dem letzten Kurstermin */
  courseRegistrationMonthsAfterCourse: 12,
  /** Turnier-/Terminanmeldungen von Mitgliedern nach dem Termin */
  eventRegistrationMonthsAfterEvent: 12,
  contactRequestMonths: 6,
  rejectedApplicationMonths: 3,
  auditLogMonths: 12,
  /** Zähler zur Missbrauchsabwehr (Rate-Limits, längstes Zeitfenster) */
  rateLimitHours: 24,
  /** Betrieb (Phase 8, Caddy/restic) – hier nur dokumentiert, damit die Datenschutzerklärung stimmt */
  serverLogDays: 14,
  backupDays: 30,
} as const

const monthsAgo = (now: Date, months: number) => {
  const d = new Date(now)
  d.setMonth(d.getMonth() - months)
  return d
}

export type RetentionResult = Record<
  | 'unconfirmedCourseRegistrations'
  | 'courseRegistrations'
  | 'eventRegistrations'
  | 'contactRequests'
  | 'rejectedApplications'
  | 'auditLog',
  number
>

export async function purgeRetention(payload: Payload, now: Date = new Date()): Promise<RetentionResult> {
  const context = { disableRevalidate: true }
  const remove = async (collection: Parameters<Payload['delete']>[0]['collection'], where: Where) => {
    const { docs } = await payload.delete({ collection, where, overrideAccess: true, depth: 0, context })
    return docs.length
  }
  const iso = (d: Date) => d.toISOString()

  const unconfirmedCourseRegistrations = await remove('course-registrations', {
    and: [
      { status: { equals: 'unconfirmed' } },
      { createdAt: { less_than: iso(new Date(now.getTime() - RETENTION.unconfirmedCourseRegistrationHours * HOUR)) } },
    ],
  })

  // Kursende = letzter Termin (Ende, sonst Beginn); nur Kurse, deren sämtliche Termine vor der Frist liegen
  const courseCutoff = monthsAgo(now, RETENTION.courseRegistrationMonthsAfterCourse)
  const { docs: courses } = await payload.find({
    collection: 'courses',
    where: { 'sessions.start': { less_than: iso(courseCutoff) } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { sessions: true },
  })
  const finished = courses
    .filter((c) => {
      const ends = (c.sessions ?? []).map((s) => new Date((s as { end?: string | null }).end || s.start).getTime())
      return ends.length > 0 && Math.max(...ends) < courseCutoff.getTime()
    })
    .map((c) => c.id)
  const courseRegistrations = finished.length ? await remove('course-registrations', { course: { in: finished } }) : 0

  // Termine: Ende (sonst Beginn) vor der Frist
  const eventCutoff = iso(monthsAgo(now, RETENTION.eventRegistrationMonthsAfterEvent))
  const { docs: pastEvents } = await payload.find({
    collection: 'events',
    where: {
      or: [
        { endDate: { less_than: eventCutoff } },
        { and: [{ endDate: { exists: false } }, { startDate: { less_than: eventCutoff } }] },
      ],
    },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: {},
  })
  const eventRegistrations = pastEvents.length
    ? await remove('event-registrations', { event: { in: pastEvents.map((e) => e.id) } })
    : 0

  const contactRequests = await remove('contact-requests', {
    createdAt: { less_than: iso(monthsAgo(now, RETENTION.contactRequestMonths)) },
  })
  const rejectedApplications = await remove('membership-applications', {
    and: [
      { status: { equals: 'rejected' } },
      { updatedAt: { less_than: iso(monthsAgo(now, RETENTION.rejectedApplicationMonths)) } },
    ],
  })
  const auditLog = await remove('audit-log', { createdAt: { less_than: iso(monthsAgo(now, RETENTION.auditLogMonths)) } })
  await purgeExpired(payload)

  const result = {
    unconfirmedCourseRegistrations,
    courseRegistrations,
    eventRegistrations,
    contactRequests,
    rejectedApplications,
    auditLog,
  }
  if (Object.values(result).some((n) => n > 0)) await audit(payload, { action: 'retention.purged', details: result })
  return result
}
