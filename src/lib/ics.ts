/**
 * Minimaler iCalendar-Generator (RFC 5545) für den Termin-Feed.
 * Bewusst ohne Abhängigkeit: Escaping, Zeilenfaltung und Datumsformate sind hier zentral getestet.
 */
import { TIME_ZONE } from '@/utilities/dates'

export type IcsEvent = {
  uid: string
  title: string
  start: Date
  end?: Date | null
  allDay?: boolean | null
  location?: string | null
  description?: string | null
  url?: string | null
  updated?: Date | null
}

/** TEXT-Werte escapen (RFC 5545, 3.3.11). */
export const escapeText = (v: string) =>
  v
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')

/** Zeilen auf max. 75 Oktette falten, ohne UTF-8-Zeichen zu zerteilen (RFC 5545, 3.1). */
export const foldLine = (line: string) => {
  const enc = new TextEncoder()
  const parts: string[] = []
  let current = ''
  let bytes = 0
  for (const ch of line) {
    const len = enc.encode(ch).length
    const limit = parts.length === 0 ? 75 : 74 // Folgezeilen beginnen mit einem Leerzeichen
    if (bytes + len > limit) {
      parts.push(current)
      current = ''
      bytes = 0
    }
    current += ch
    bytes += len
  }
  parts.push(current)
  return parts.join('\r\n ')
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 2026-05-06T16:30:00Z → 20260506T163000Z */
export const utcStamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes(),
  )}${pad(d.getUTCSeconds())}Z`

/** Kalenderdatum in Vereins-Zeitzone als YYYYMMDD. */
export const localDate = (d: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}${get('month')}${get('day')}`
}

const nextDay = (yyyymmdd: string) => {
  const d = new Date(Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8) + 1))
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
}

/** Nur sichere URLs übernehmen; ';' und ',' sind in URI-Werten erlaubt und werden nicht escaped. */
const safeUri = (url?: string | null) =>
  url && /^https?:\/\/[^\s"<>]+$/i.test(url) ? url : null

export const buildIcs = ({
  name,
  events,
  now = new Date(),
}: {
  name: string
  events: IcsEvent[]
  now?: Date
}) => {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BSV 1960 Plauen//Termine//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    `X-WR-TIMEZONE:${TIME_ZONE}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
  ]

  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${escapeText(e.uid)}`, `DTSTAMP:${utcStamp(e.updated ?? now)}`)
    if (e.allDay) {
      const start = localDate(e.start)
      const lastDay = e.end ? localDate(e.end) : start
      lines.push(`DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${nextDay(lastDay >= start ? lastDay : start)}`)
    } else {
      lines.push(`DTSTART:${utcStamp(e.start)}`)
      if (e.end && e.end > e.start) lines.push(`DTEND:${utcStamp(e.end)}`)
    }
    lines.push(`SUMMARY:${escapeText(e.title)}`)
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`)
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`)
    const url = safeUri(e.url)
    if (url) lines.push(`URL:${url}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}
