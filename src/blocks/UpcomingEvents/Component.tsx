import Link from 'next/link'
import React from 'react'
import { ArrowRightIcon, CalendarPlusIcon } from 'lucide-react'

import type { UpcomingEventsBlock as Props } from '@/payload-types'
import { EventCard } from '@/components/EventCard'
import { findEvents, startOfToday } from '@/lib/events'
import { SectionHeading } from '@/components/Section'
import { routes } from '@/utilities/routes'

export const UpcomingEventsBlock: React.FC<Props> = async ({ heading, intro, limit, emptyText }) => {
  const docs = await findEvents({ from: startOfToday(), limit: limit ?? 3 })

  return (
    <section className="container">
      <SectionHeading title={heading} intro={intro} />
      {docs.length === 0 ? (
        <p className="rounded-lg bg-muted p-6 text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docs.map((e) => (
            <li key={e.id}>
              <EventCard event={e} />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
        <Link href={routes.events} className="inline-flex items-center gap-1 font-semibold text-brand-text hover:text-navy">
          Alle Termine <ArrowRightIcon aria-hidden className="size-4" />
        </Link>
        <a href={routes.eventsIcs} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy">
          <CalendarPlusIcon aria-hidden className="size-4" /> Kalender abonnieren (iCal)
        </a>
      </div>
    </section>
  )
}
