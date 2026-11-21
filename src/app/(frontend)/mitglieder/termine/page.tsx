import configPromise from '@payload-config'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import React from 'react'

import { DateSheet, EmptyState, MembersSection, MembersTitle, memberPageMeta } from '@/components/members/ui'
import { requireMember } from '@/lib/auth/session'
import { EVENT_TYPE_LABELS, eventWhen, eventWhere, findEvents, startOfToday } from '@/lib/events'
import { formatDate, formatTime } from '@/utilities/dates'
import { routes } from '@/utilities/routes'

import { EventRegistrationControls } from './EventRegistrationControls'

export const metadata: Metadata = memberPageMeta('Termine')

export default async function MembersEventsPage() {
  const user = await requireMember(routes.membersEvents)
  const payload = await getPayload({ config: configPromise })
  const [events, regs] = await Promise.all([
    findEvents({ from: startOfToday(), limit: 100, user }),
    payload.find({
      collection: 'event-registrations',
      where: { member: { equals: user.id } },
      depth: 0,
      limit: 200,
      overrideAccess: false,
      user,
    }),
  ])
  const regByEvent = new Map(regs.docs.map((r) => [typeof r.event === 'object' ? r.event.id : r.event, r]))
  const withRegistration = events.filter((e) => e.registration?.enabled)
  const others = events.filter((e) => !e.registration?.enabled)

  return (
    <>
      <MembersTitle
        title="Termine"
        intro="Turniere und Vereinstermine – auch die, die nur für Mitglieder gedacht sind. Für Termine mit Anmeldung meldest du dich direkt hier an."
      />

      <MembersSection title="Mit Anmeldung" className="mb-12">
        {withRegistration.length === 0 ? (
          <EmptyState>Gerade ist für keinen Termin eine Anmeldung offen.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {withRegistration.map((e) => {
              const reg = regByEvent.get(e.id)
              const deadline = e.registration?.deadline
              const closed = Boolean(deadline && new Date(deadline) < new Date())
              return (
                <li key={e.id} id={`termin-${e.id}`} className="scroll-mt-24 py-6">
                  <div className="flex gap-4">
                    <DateSheet date={e.startDate} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted-foreground">{EVENT_TYPE_LABELS[e.eventType]}</p>
                      <h3 className="text-lg font-semibold">{e.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {eventWhen(e)}
                        {eventWhere(e) && <>, {eventWhere(e)}</>}
                      </p>
                      {deadline && (
                        <p className="mt-1 text-sm">
                          Meldeschluss: {formatDate(deadline)}, {formatTime(deadline)} Uhr
                          {e.registration?.maxParticipants && <> (max. {e.registration.maxParticipants} Teilnehmende)</>}
                        </p>
                      )}
                      <EventRegistrationControls
                        eventId={e.id}
                        closed={closed}
                        registration={reg ? { id: reg.id, status: reg.status, bowClass: reg.bowClass } : null}
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </MembersSection>

      <MembersSection title="Weitere Termine" more={{ href: routes.eventsIcs, label: 'Kalender abonnieren' }}>
        {others.length === 0 ? (
          <EmptyState>Keine weiteren Termine.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {others.map((e) => (
              <li key={e.id} className="flex gap-4 py-4">
                <DateSheet date={e.startDate} />
                <div>
                  <p className="font-semibold">
                    {e.title}
                    {e.visibility === 'members' && (
                      <span className="ml-2 rounded-full bg-[#eeedf7] px-2 py-0.5 text-xs font-medium text-navy">intern</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {eventWhen(e)}
                    {eventWhere(e) && <>, {eventWhere(e)}</>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </MembersSection>
    </>
  )
}
