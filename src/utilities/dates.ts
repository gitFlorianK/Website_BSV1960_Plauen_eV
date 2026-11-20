/** Datumsformatierung für die Website – immer deutsch und in Vereins-Zeitzone. */
export const TIME_ZONE = 'Europe/Berlin'

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('de-DE', { timeZone: TIME_ZONE, ...options })

const dateLong = fmt({ day: 'numeric', month: 'long', year: 'numeric' })
const dateShort = fmt({ day: '2-digit', month: '2-digit', year: 'numeric' })
const weekdayDate = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const time = fmt({ hour: '2-digit', minute: '2-digit' })
const monthYear = fmt({ month: 'long', year: 'numeric' })
const dayNum = fmt({ day: 'numeric' })
const monthShort = fmt({ month: 'short' })

const d = (v: string | Date) => (typeof v === 'string' ? new Date(v) : v)

/** „18. Juni 1960“ */
export const formatDate = (v: string | Date) => dateLong.format(d(v))
/** „18.06.1960“ */
export const formatDateShort = (v: string | Date) => dateShort.format(d(v))
/** „Mittwoch, 6. Mai 2026“ */
export const formatWeekdayDate = (v: string | Date) => weekdayDate.format(d(v))
/** „18:30“ */
export const formatTime = (v: string | Date) => time.format(d(v))
/** „Mai 2026“ */
export const formatMonthYear = (v: string | Date) => monthYear.format(d(v))
/** Für Kalenderblätter: { day: '6', month: 'Mai' } */
export const calendarSheet = (v: string | Date) => ({
  day: dayNum.format(d(v)),
  month: monthShort.format(d(v)).replace('.', ''),
})

/** Monat (1–12) in Vereins-Zeitzone. */
export const monthInClubTz = (v: Date = new Date()) =>
  Number(fmt({ month: 'numeric' }).format(v))

/** Freiluftsaison 1.4.–30.9., sonst Halle. */
export const currentSeasonType = (now: Date = new Date()): 'indoor' | 'outdoor' => {
  const m = monthInClubTz(now)
  return m >= 4 && m <= 9 ? 'outdoor' : 'indoor'
}

const isoDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Kalendertag in Vereinszeitzone als `YYYY-MM-DD` (für Tagesvergleiche wie Anmeldeschluss). */
export const dayInClubTz = (v: string | Date = new Date()) => isoDay.format(d(v))

/** Alter in vollendeten Jahren am Stichtag (Geburtsdatum `YYYY-MM-DD`). */
export function ageOn(birthDate: string, on: string | Date = new Date()): number {
  const [by, bm, bd] = birthDate.slice(0, 10).split('-').map(Number)
  const [y, m, dd] = dayInClubTz(on).split('-').map(Number)
  return y - by - (m < bm || (m === bm && dd < bd) ? 1 : 0)
}
