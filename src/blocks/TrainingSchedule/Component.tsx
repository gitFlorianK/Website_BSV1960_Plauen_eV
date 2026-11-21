import React from 'react'
import { ClockIcon, MapPinIcon } from 'lucide-react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Location, TrainingScheduleBlock as Props, TrainingSlot } from '@/payload-types'
import { WEEKDAYS } from '@/collections/TrainingSlots'
import { SectionHeading } from '@/components/Section'
import { currentSeasonType } from '@/utilities/dates'
import { osmLink } from '@/utilities/osm'
import { cn } from '@/utilities/ui'

const SEASONS = {
  outdoor: { title: 'Freiluftsaison', period: '1. April bis 30. September' },
  indoor: { title: 'Hallensaison', period: '1. Oktober bis 31. März' },
} as const

const weekdayLabel = (v: string) => WEEKDAYS.find((w) => w.value === v)?.label ?? v

export const TrainingScheduleBlock: React.FC<Props> = async ({ heading, intro, show }) => {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'training-slots',
    depth: 1,
    limit: 100,
    overrideAccess: false,
    pagination: false,
    sort: ['weekday', 'startTime'],
  })

  const current = currentSeasonType()
  const order: Array<'indoor' | 'outdoor'> =
    show === 'current' ? [current] : current === 'outdoor' ? ['outdoor', 'indoor'] : ['indoor', 'outdoor']

  // Saison-Titel eine Ebene unter der Block-Überschrift; ohne sie direkt unter der Seiten-h1
  const SeasonHeading = heading ? 'h3' : 'h2'
  return (
    <section className="container" aria-labelledby={heading ? 'training-heading' : undefined}>
      <SectionHeading id="training-heading" title={heading} intro={intro} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {order.map((season) => {
          const slots = docs.filter((s) => s.seasonType === season)
          const locations = [
            ...new Map(
              slots
                .map((s) => s.location)
                .filter((l): l is Location => typeof l === 'object' && l !== null)
                .map((l) => [l.id, l]),
            ).values(),
          ]
          const isCurrent = season === current
          return (
            <article
              key={season}
              className={cn(
                'rounded-xl border bg-white p-6 shadow-sm',
                isCurrent ? 'border-2 border-brand' : 'border-border',
              )}
            >
              <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <SeasonHeading className="text-xl font-bold">{SEASONS[season].title}</SeasonHeading>
                {isCurrent && (
                  <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Aktuell
                  </span>
                )}
                <p className="w-full text-sm text-muted-foreground">{SEASONS[season].period}</p>
              </header>

              {slots.length === 0 ? (
                <p className="text-muted-foreground">Derzeit sind keine Trainingszeiten eingetragen.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {slots.map((s: TrainingSlot) => (
                    <li key={s.id} className="grid grid-cols-[9.5rem_minmax(0,1fr)] gap-3 py-3">
                      <div>
                        <p className="font-semibold">{weekdayLabel(s.weekday)}</p>
                        <p className="flex items-center gap-1 whitespace-nowrap text-sm text-muted-foreground">
                          <ClockIcon aria-hidden className="size-3.5" />
                          {s.endTime ? `${s.startTime}–${s.endTime}` : `ab ${s.startTime}`} Uhr
                        </p>
                      </div>
                      <div>
                        <p>{s.group}</p>
                        {s.note && <p className="text-sm text-muted-foreground">{s.note}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {locations.map((loc) => (
                <div key={loc.id} className="mt-5 flex gap-3 rounded-lg bg-muted p-4 text-sm">
                  <MapPinIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-text" />
                  <div>
                    <p className="font-semibold">{loc.name}</p>
                    <p>
                      {loc.street}, {loc.postalCode} {loc.city}
                    </p>
                    {loc.notes && <p className="mt-1 text-muted-foreground">{loc.notes}</p>}
                    <a
                      className="mt-1 inline-block font-medium text-brand-text underline underline-offset-2 hover:text-navy"
                      href={osmLink(loc)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Karte öffnen (OpenStreetMap)<span className="sr-only">, öffnet in neuem Tab</span>
                    </a>
                  </div>
                </div>
              ))}
            </article>
          )
        })}
      </div>
    </section>
  )
}
