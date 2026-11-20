import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'

import { buildIcs } from '@/lib/ics'
import { eventWhere, findEvents } from '@/lib/events'
import { getServerSideURL } from '@/utilities/getURL'
import { routes } from '@/utilities/routes'

export const revalidate = 3600

/** Kalender-Abo: nur öffentliche Termine (anonyme Abfrage mit Access-Regeln). */
export async function GET() {
  const since = new Date()
  since.setMonth(since.getMonth() - 6)
  const events = await findEvents({ from: since, limit: 500 })
  const base = getServerSideURL()
  const host = new URL(base).hostname

  const body = buildIcs({
    name: 'BSV 1960 Plauen – Termine',
    events: events.map((e) => {
      const url = `${base}${routes.event(e.slug)}`
      const text = e.description ? convertLexicalToPlaintext({ data: e.description }).trim() : ''
      return {
        uid: `event-${e.id}@${host}`,
        title: e.title,
        start: new Date(e.startDate),
        end: e.endDate ? new Date(e.endDate) : null,
        allDay: e.allDay,
        location: eventWhere(e),
        description: [text, url].filter(Boolean).join('\n\n'),
        url,
        updated: new Date(e.updatedAt),
      }
    }),
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="bsv1960-termine.ics"',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
