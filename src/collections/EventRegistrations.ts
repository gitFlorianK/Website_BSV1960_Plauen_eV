import type { Access, CollectionConfig, Where } from 'payload'
import { ValidationError } from 'payload'

import { hasRole, isLoggedIn, userHasRole } from '@/access'
import type { User } from '@/payload-types'

const asUser = (u: unknown) => u as User | null | undefined
const relId = (v: unknown) => (typeof v === 'object' && v !== null ? (v as { id: number }).id : v)

/** Staff mit Zuständigkeit für Termine sieht alles, Mitglieder nur eigene Anmeldungen. */
const ownOrStaff: Access = ({ req: { user } }) => {
  const u = asUser(user)
  if (userHasRole(u, 'vorstand', 'trainer')) return true
  if (u && !u.accountDisabled) return { member: { equals: u.id } } as Where
  return false
}

/** Turnier-/Terminanmeldungen von Mitgliedern. */
export const EventRegistrations: CollectionConfig<'event-registrations'> = {
  slug: 'event-registrations',
  labels: { singular: 'Terminanmeldung', plural: 'Terminanmeldungen' },
  access: {
    read: ownOrStaff,
    create: isLoggedIn,
    update: ownOrStaff,
    delete: hasRole('vorstand', 'trainer'),
  },
  admin: {
    defaultColumns: ['event', 'member', 'bowClass', 'status', 'createdAt'],
    group: 'Termine & Kurse',
  },
  fields: [
    { name: 'event', label: 'Termin', type: 'relationship', relationTo: 'events', required: true },
    {
      name: 'member',
      label: 'Mitglied',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      access: {
        update: ({ req: { user } }) => userHasRole(asUser(user), 'vorstand', 'trainer'),
      },
    },
    {
      name: 'bowClass',
      label: 'Bogenklasse',
      type: 'select',
      required: true,
      options: [
        { label: 'Recurve', value: 'recurve' },
        { label: 'Compound', value: 'compound' },
        { label: 'Blankbogen', value: 'barebow' },
        { label: 'Langbogen', value: 'longbow' },
        { label: 'Jagdbogen', value: 'hunting' },
      ],
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'registered',
      options: [
        { label: 'Angemeldet', value: 'registered' },
        { label: 'Bestätigt', value: 'confirmed' },
        { label: 'Abgemeldet', value: 'cancelled' },
      ],
    },
    { name: 'note', label: 'Bemerkung', type: 'textarea', maxLength: 1000 },
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation, req }) => {
        // Mitglieder können nur sich selbst anmelden.
        const u = asUser(req.user)
        if (operation === 'create' && data && u && !userHasRole(u, 'vorstand', 'trainer')) {
          data.member = u.id
          data.status = 'registered'
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create') return data

        // Mitglieder dürfen sich nur für freigegebene Termine vor Meldeschluss anmelden.
        if (!userHasRole(asUser(req.user), 'vorstand', 'trainer')) {
          const event = await req.payload.findByID({
            collection: 'events',
            id: relId(data.event) as number,
            depth: 0,
            disableErrors: true,
            req,
          })
          const reg = event?.registration
          const closed =
            !event ||
            !reg?.enabled ||
            (reg.deadline && new Date(reg.deadline) < new Date())
          if (closed) {
            throw new ValidationError({
              errors: [{ path: 'event', message: 'Für diesen Termin ist keine Anmeldung möglich.' }],
            })
          }
          if (reg?.maxParticipants) {
            const { totalDocs: taken } = await req.payload.count({
              collection: 'event-registrations',
              where: {
                and: [
                  { event: { equals: event.id } },
                  { status: { not_equals: 'cancelled' } },
                ],
              },
              req,
            })
            if (taken >= reg.maxParticipants) {
              throw new ValidationError({
                errors: [{ path: 'event', message: 'Alle Plätze für diesen Termin sind vergeben.' }],
              })
            }
          }
        }

        const { totalDocs } = await req.payload.count({
          collection: 'event-registrations',
          where: {
            and: [
              { event: { equals: relId(data.event) } },
              { member: { equals: relId(data.member) } },
            ],
          },
          req,
        })
        if (totalDocs > 0) {
          throw new ValidationError({
            errors: [{ path: 'event', message: 'Für diesen Termin besteht bereits eine Anmeldung.' }],
          })
        }
        return data
      },
    ],
  },
}
