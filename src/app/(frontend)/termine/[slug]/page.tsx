import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React, { cache } from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { ArrowLeftIcon, CalendarIcon, ExternalLinkIcon, MapPinIcon } from 'lucide-react'

import { EVENT_TYPE_LABELS, eventWhen } from '@/lib/events'
import RichText from '@/components/RichText'
import { SITE_NAME, mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { osmLink } from '@/utilities/osm'
import { routes } from '@/utilities/routes'
import { isSafeUrl } from '@/utilities/safeUrl'

type Args = { params: Promise<{ slug: string }> }

const findEvent = cache(async (slug: string) => {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'events',
    depth: 1,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    where: { slug: { equals: slug } },
  })
  return docs[0] ?? null
})

export default async function EventPage({ params }: Args) {
  const event = await findEvent(decodeURIComponent((await params).slug))
  if (!event) notFound()
  const loc = typeof event.location === 'object' ? event.location : null

  return (
    <article className="pb-16">
      <header className="border-b border-border bg-brand-soft">
        <div className="container py-10 md:py-14">
          <Link href={routes.events} className="inline-flex items-center gap-1 text-sm font-medium text-brand-text hover:text-navy">
            <ArrowLeftIcon aria-hidden className="size-4" /> Alle Termine
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-brand-text">
            {EVENT_TYPE_LABELS[event.eventType]}
          </p>
          <h1 className="mt-1 max-w-4xl text-3xl font-bold tracking-tight md:text-5xl">{event.title}</h1>
        </div>
      </header>

      <div className="container mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div>
          {event.description ? (
            <RichText className="max-w-3xl" data={event.description} enableGutter={false} />
          ) : (
            <p className="text-muted-foreground">Weitere Informationen folgen.</p>
          )}
        </div>
        <aside className="h-fit space-y-4 rounded-xl border border-border bg-white p-6">
          <p className="flex gap-3">
            <CalendarIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-text" />
            <span>
              <span className="sr-only">Wann: </span>
              {eventWhen(event)}
            </span>
          </p>
          {(loc || event.locationText) && (
            <p className="flex gap-3">
              <MapPinIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-text" />
              <span>
                <span className="sr-only">Wo: </span>
                {loc ? (
                  <>
                    {loc.name}
                    <br />
                    {loc.street}, {loc.postalCode} {loc.city}
                    <br />
                    <a
                      className="text-sm font-medium text-brand-text underline underline-offset-2 hover:text-navy"
                      href={osmLink(loc)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Karte (OpenStreetMap)<span className="sr-only">, öffnet in neuem Tab</span>
                    </a>
                  </>
                ) : (
                  event.locationText
                )}
              </span>
            </p>
          )}
          {event.externalUrl && isSafeUrl(event.externalUrl) && (
            <a
              href={event.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-semibold text-brand-text underline underline-offset-2 hover:text-navy"
            >
              <ExternalLinkIcon aria-hidden className="size-4" /> Ausschreibung / weitere Infos
              <span className="sr-only">(öffnet in neuem Tab)</span>
            </a>
          )}
        </aside>
      </div>
    </article>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const event = await findEvent(decodeURIComponent(slug))
  if (!event) return { title: SITE_NAME }
  const title = `${event.title} | ${SITE_NAME}`
  return {
    title,
    description: `${EVENT_TYPE_LABELS[event.eventType]}: ${eventWhen(event)}`,
    alternates: { canonical: routes.event(slug) },
    openGraph: mergeOpenGraph({ title, url: routes.event(slug) }),
  }
}
