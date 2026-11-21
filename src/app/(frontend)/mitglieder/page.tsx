import configPromise from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { DateSheet, EmptyState, MembersSection, MembersTitle, memberPageMeta } from '@/components/members/ui'
import { requireMember } from '@/lib/auth/session'
import { eventWhen, eventWhere, findEvents, startOfToday } from '@/lib/events'
import { formatDate } from '@/utilities/dates'
import { routes } from '@/utilities/routes'

export const metadata: Metadata = memberPageMeta('Übersicht')

export default async function MembersHome() {
  const user = await requireMember(routes.members)
  const payload = await getPayload({ config: configPromise })

  const [events, regs, posts, documents] = await Promise.all([
    findEvents({ from: startOfToday(), limit: 5, user }),
    payload.find({
      collection: 'event-registrations',
      where: { and: [{ member: { equals: user.id } }, { status: { not_equals: 'cancelled' } }] },
      depth: 0,
      limit: 100,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'posts',
      where: { visibility: { equals: 'members' } },
      sort: '-publishedAt',
      limit: 3,
      depth: 0,
      overrideAccess: false,
      user,
      select: { title: true, slug: true, publishedAt: true },
    }),
    payload.find({
      collection: 'documents',
      sort: '-updatedAt',
      limit: 4,
      depth: 0,
      overrideAccess: false,
      user,
      select: { title: true, url: true, updatedAt: true },
    }),
  ])
  const registered = new Set(regs.docs.map((r) => (typeof r.event === 'object' ? r.event.id : r.event)))
  const firstName = user.name.split(' ')[0]

  return (
    <>
      <MembersTitle title={`Hallo ${firstName}!`} intro="Hier findest du, was gerade im Verein ansteht." />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <MembersSection title="Als Nächstes" more={{ href: routes.membersEvents, label: 'Alle Termine' }}>
          {events.length === 0 ? (
            <EmptyState>Gerade stehen keine Termine an.</EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {events.map((e) => {
                const open = e.registration?.enabled && (!e.registration.deadline || new Date(e.registration.deadline) > new Date())
                return (
                  <li key={e.id} className="flex gap-4 py-4">
                    <DateSheet date={e.startDate} />
                    <div className="min-w-0">
                      <p className="font-semibold">{e.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {eventWhen(e)}
                        {eventWhere(e) && <>, {eventWhere(e)}</>}
                      </p>
                      {registered.has(e.id) ? (
                        <p className="mt-1 text-sm font-medium text-green-800">Du bist angemeldet.</p>
                      ) : open ? (
                        <Link
                          href={`${routes.membersEvents}#termin-${e.id}`}
                          className="mt-1 inline-block text-sm font-medium text-brand-text underline underline-offset-2"
                        >
                          Anmeldung offen
                          {e.registration?.deadline && ` bis ${formatDate(e.registration.deadline)}`}
                        </Link>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </MembersSection>

        <div className="grid content-start gap-12">
          <MembersSection title="Neu im Verein" more={{ href: routes.membersNews, label: 'Alle Neuigkeiten' }}>
            {posts.docs.length === 0 ? (
              <EmptyState>Noch keine internen Neuigkeiten.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {posts.docs.map((p) => (
                  <li key={p.id} className="py-3">
                    <Link href={routes.membersPost(p.slug)} className="font-medium hover:text-navy hover:underline">
                      {p.title}
                    </Link>
                    {p.publishedAt && <p className="text-sm text-muted-foreground">{formatDate(p.publishedAt)}</p>}
                  </li>
                ))}
              </ul>
            )}
          </MembersSection>

          <MembersSection title="Dokumente" more={{ href: routes.membersDocuments, label: 'Alle Dokumente' }}>
            {documents.docs.length === 0 ? (
              <EmptyState>Noch keine Dokumente hochgeladen.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {documents.docs.map((d) => (
                  <li key={d.id} className="py-3">
                    {d.url ? (
                      <a href={d.url} className="font-medium hover:text-navy hover:underline">
                        {d.title}
                      </a>
                    ) : (
                      <span className="font-medium">{d.title}</span>
                    )}
                    <p className="text-sm text-muted-foreground">aktualisiert am {formatDate(d.updatedAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </MembersSection>
        </div>
      </div>
    </>
  )
}
