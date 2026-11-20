import type { Metadata } from 'next'
import React from 'react'
import { CalendarPlusIcon } from 'lucide-react'

import { EventCard } from '@/components/EventCard'
import { LowImpactHero } from '@/heros/LowImpact'
import { findEvents, startOfToday } from '@/lib/events'
import type { Event } from '@/payload-types'
import { formatMonthYear } from '@/utilities/dates'
import { getServerSideURL } from '@/utilities/getURL'
import { mergeOpenGraph, SITE_NAME } from '@/utilities/mergeOpenGraph'
import { routes } from '@/utilities/routes'

export const revalidate = 600

const groupByMonth = (events: Event[]) => {
  const groups = new Map<string, Event[]>()
  for (const e of events) {
    const key = formatMonthYear(e.startDate)
    groups.set(key, [...(groups.get(key) ?? []), e])
  }
  return [...groups.entries()]
}

export default async function EventsPage() {
  const today = startOfToday()
  const yearAgo = new Date(today)
  yearAgo.setFullYear(today.getFullYear() - 1)

  const [upcoming, past] = await Promise.all([
    findEvents({ from: today }),
    findEvents({ from: yearAgo, until: today, sort: '-startDate', limit: 30 }),
  ])
  const pastOnly = past.filter((e) => new Date(e.endDate ?? e.startDate) < today)
  const webcal = `${getServerSideURL().replace(/^https?:/, 'webcal:')}${routes.eventsIcs}`

  return (
    <div className="pb-16">
      <LowImpactHero>
        <h1>Termine</h1>
        <p>Turniere, Vereinsveranstaltungen und besondere Trainingstermine.</p>
      </LowImpactHero>

      <div className="container mt-10">
        <div className="mb-10 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-white p-5">
          <CalendarPlusIcon aria-hidden className="size-6 text-brand-text" />
          <p className="flex-1">
            Alle öffentlichen Termine automatisch im eigenen Kalender (Smartphone, Outlook, Thunderbird …):
          </p>
          <a href={webcal} className="rounded-md bg-brand px-4 py-2 font-semibold text-primary-foreground hover:bg-brand-hover">
            Kalender abonnieren
          </a>
          <a href={routes.eventsIcs} className="text-sm font-medium text-brand-text underline underline-offset-2 hover:text-navy">
            .ics herunterladen
          </a>
        </div>

        <h2 className="sr-only">Kommende Termine</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-lg bg-muted p-6 text-muted-foreground">Aktuell stehen keine öffentlichen Termine an.</p>
        ) : (
          groupByMonth(upcoming).map(([month, events]) => (
            <section key={month} className="mb-10" aria-labelledby={`m-${month}`}>
              <h3 id={`m-${month}`} className="mb-4 border-b-2 border-brand pb-2 text-xl font-bold">
                {month}
              </h3>
              <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.map((e) => (
                  <li key={e.id}>
                    <EventCard event={e} headingLevel="h3" />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {pastOnly.length > 0 && (
          <details className="mt-12 rounded-xl border border-border bg-white p-5">
            <summary className="cursor-pointer text-lg font-semibold">Vergangene Termine (letzte 12 Monate)</summary>
            <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pastOnly.map((e) => (
                <li key={e.id} className="opacity-80">
                  <EventCard event={e} />
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  title: `Termine | ${SITE_NAME}`,
  description: 'Turniere, Vereinsveranstaltungen und Trainingstermine des BSV 1960 Plauen – auch als Kalender-Abo.',
  alternates: {
    canonical: routes.events,
    types: { 'text/calendar': routes.eventsIcs },
  },
  openGraph: mergeOpenGraph({ title: `Termine | ${SITE_NAME}`, url: routes.events }),
}
