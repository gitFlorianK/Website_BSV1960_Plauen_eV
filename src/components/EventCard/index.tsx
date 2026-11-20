import Link from 'next/link'
import React from 'react'
import { MapPinIcon } from 'lucide-react'

import type { Event } from '@/payload-types'
import { EVENT_TYPE_LABELS, eventWhen, eventWhere } from '@/lib/events'
import { calendarSheet } from '@/utilities/dates'
import { routes } from '@/utilities/routes'

export const EventCard: React.FC<{ event: Event; headingLevel?: 'h3' | 'h2' }> = ({
  event,
  headingLevel: H = 'h3',
}) => {
  const sheet = calendarSheet(event.startDate)
  const where = eventWhere(event)
  return (
    <article className="relative flex gap-4 rounded-xl border border-border bg-white p-4 shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md">
      <div
        aria-hidden
        className="flex w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-ink py-2 text-white"
      >
        <span className="text-2xl font-bold leading-none">{sheet.day}</span>
        <span className="text-xs uppercase tracking-wide text-brand">{sheet.month}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-text">
          {EVENT_TYPE_LABELS[event.eventType]}
          {event.visibility === 'members' && ' · nur Mitglieder'}
        </p>
        <H className="mt-0.5 text-lg font-semibold leading-snug">
          <Link
            href={routes.event(event.slug)}
            className="after:absolute after:inset-0 after:content-[''] hover:underline"
          >
            {event.title}
          </Link>
        </H>
        <p className="text-sm text-muted-foreground">{eventWhen(event)}</p>
        {where && (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPinIcon aria-hidden className="size-3.5" /> {where}
          </p>
        )}
      </div>
    </article>
  )
}
