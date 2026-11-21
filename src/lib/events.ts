import configPromise from '@payload-config'
import { getPayload, type Where } from 'payload'

import type { Event, User } from '@/payload-types'
import { formatDateShort, formatTime, formatWeekdayDate } from '@/utilities/dates'

/** Beginn des heutigen Tages (Termine von heute bleiben sichtbar). */
export const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Termine mit Access-Regeln (overrideAccess: false): ohne `user` nur öffentliche, mit Mitglied auch interne. */
export const findEvents = async ({
  from,
  until,
  limit = 200,
  sort = 'startDate',
  user,
}: {
  from?: Date
  until?: Date
  limit?: number
  sort?: string
  user?: User | null
}) => {
  const payload = await getPayload({ config: configPromise })
  const and: Where[] = []
  // Mehrtägige Termine bleiben sichtbar, solange sie laufen
  if (from)
    and.push({
      or: [
        { startDate: { greater_than_equal: from.toISOString() } },
        { endDate: { greater_than_equal: from.toISOString() } },
      ],
    })
  if (until) and.push({ startDate: { less_than: until.toISOString() } })
  const { docs } = await payload.find({
    collection: 'events',
    depth: 1,
    limit,
    overrideAccess: false,
    user: user ?? undefined,
    pagination: false,
    sort,
    where: and.length ? { and } : undefined,
  })
  return docs
}

export const EVENT_TYPE_LABELS: Record<Event['eventType'], string> = {
  tournament: 'Turnier',
  club: 'Verein',
  training: 'Training',
  other: 'Termin',
}

export const eventWhen = (e: Pick<Event, 'startDate' | 'endDate' | 'allDay'>) => {
  const start = formatWeekdayDate(e.startDate)
  if (e.endDate && formatDateShort(e.endDate) !== formatDateShort(e.startDate)) {
    return `${formatDateShort(e.startDate)} – ${formatDateShort(e.endDate)}`
  }
  if (e.allDay) return start
  return `${start}, ${formatTime(e.startDate)}${e.endDate ? `–${formatTime(e.endDate)}` : ''} Uhr`
}

export const eventWhere = (e: Pick<Event, 'location' | 'locationText'>) =>
  typeof e.location === 'object' && e.location ? e.location.name : e.locationText
