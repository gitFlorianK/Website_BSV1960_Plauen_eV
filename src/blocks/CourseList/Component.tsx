import Link from 'next/link'
import React from 'react'
import { CalendarIcon, EuroIcon, MapPinIcon, UsersIcon } from 'lucide-react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Course, CourseListBlock as Props } from '@/payload-types'
import RichText from '@/components/RichText'
import { SectionHeading } from '@/components/Section'
import { formatDate, formatTime, formatWeekdayDate } from '@/utilities/dates'
import { routes } from '@/utilities/routes'
import { cn } from '@/utilities/ui'

const STATUS: Record<Exclude<Course['status'], 'draft'>, { label: string; className: string }> = {
  open: { label: 'Anmeldung offen', className: 'bg-success text-ink' },
  waitlist: { label: 'Nur noch Warteliste', className: 'bg-warning text-ink' },
  closed: { label: 'Anmeldung geschlossen', className: 'bg-muted text-muted-foreground' },
}

const AUDIENCE: Record<Course['audience'], string> = {
  adults: 'Erwachsene',
  youth: 'Kinder und Jugendliche',
}

const ageText = (c: Course) =>
  c.minAge && c.maxAge ? `${c.minAge}–${c.maxAge} Jahre` : c.minAge ? `ab ${c.minAge} Jahren` : null

export const CourseListBlock: React.FC<Props> = async ({ heading, intro, emptyText }) => {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'courses',
    depth: 1,
    limit: 20,
    overrideAccess: false,
    sort: 'registrationDeadline',
    where: { status: { not_equals: 'draft' } },
  })

  return (
    <section className="container">
      <SectionHeading title={heading} intro={intro} />
      {docs.length === 0 ? (
        <p className="max-w-3xl rounded-lg border-l-4 border-brand bg-brand-soft p-6 text-lg">{emptyText}</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {docs.map((c) => {
            const status = c.status !== 'draft' ? STATUS[c.status] : null
            const loc = typeof c.location === 'object' ? c.location : null
            return (
              <article key={c.id} className="flex flex-col rounded-xl border border-border bg-white p-6 shadow-sm">
                <header className="mb-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-brand-text">
                    {AUDIENCE[c.audience]}
                    {ageText(c) && ` · ${ageText(c)}`}
                  </p>
                  <h3 className="mt-1 text-xl font-bold">{c.title}</h3>
                  {status && (
                    <span className={cn('mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold', status.className)}>
                      {status.label}
                    </span>
                  )}
                </header>

                {c.description && <RichText data={c.description} enableGutter={false} className="mb-4" />}

                <dl className="grid gap-2 text-sm">
                  {typeof c.fee === 'number' && (
                    <div className="flex gap-2">
                      <dt><EuroIcon aria-label="Gebühr" className="size-4 text-brand-text" /></dt>
                      <dd>{c.fee} € Unkostenbeitrag – Bogen, Pfeile und Zubehör werden gestellt</dd>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <dt><UsersIcon aria-label="Plätze" className="size-4 text-brand-text" /></dt>
                    <dd>{c.capacity} Plätze</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt><CalendarIcon aria-label="Anmeldeschluss" className="size-4 text-brand-text" /></dt>
                    <dd>Anmeldeschluss: {formatDate(c.registrationDeadline)}</dd>
                  </div>
                  {loc && (
                    <div className="flex gap-2">
                      <dt><MapPinIcon aria-label="Ort" className="size-4 text-brand-text" /></dt>
                      <dd>{loc.name}, {loc.street}</dd>
                    </div>
                  )}
                </dl>

                {c.sessions && c.sessions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="mb-2 font-semibold">Termine</h4>
                    <ol className="space-y-1 text-sm">
                      {c.sessions.map((s, i) => (
                        <li key={s.id ?? i} className="flex flex-wrap gap-x-2">
                          <span className="font-medium">{formatWeekdayDate(s.start)}</span>
                          <span className="text-muted-foreground">
                            {formatTime(s.start)}
                            {s.end && `–${formatTime(s.end)}`} Uhr
                          </span>
                          {s.note && <span className="w-full text-brand-text">{s.note}</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {(c.status === 'open' || c.status === 'waitlist') && (
                  <div className="mt-6 border-t border-border pt-4">
                    <Link
                      href={routes.courseRegistration}
                      className="inline-flex h-11 items-center rounded-md bg-brand px-6 font-semibold text-primary-foreground hover:bg-brand-hover"
                    >
                      {c.status === 'waitlist' ? 'Auf die Warteliste' : 'Jetzt anmelden'}
                    </Link>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
