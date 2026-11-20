import type { Access, CollectionConfig, Where } from 'payload'

import { hasRole, isStaffUser } from '@/access'
import type { User } from '@/payload-types'

/** Anonyme sehen keine Kurse im Entwurf. */
const readCourses: Access = ({ req: { user } }) =>
  isStaffUser(user as User | null) || ({ status: { not_equals: 'draft' } } as Where)

/** Anfängerkurse (Erwachsene / Kinder & Jugend). Anmeldungen: siehe course-registrations. */
export const Courses: CollectionConfig<'courses'> = {
  slug: 'courses',
  labels: { singular: 'Kurs', plural: 'Kurse' },
  access: {
    read: readCourses,
    create: hasRole('vorstand', 'trainer'),
    update: hasRole('vorstand', 'trainer'),
    delete: hasRole('vorstand'),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'audience', 'status', 'registrationDeadline', 'capacity'],
    group: 'Termine & Kurse',
  },
  fields: [
    { name: 'title', label: 'Titel', type: 'text', required: true },
    {
      name: 'audience',
      label: 'Zielgruppe',
      type: 'select',
      required: true,
      options: [
        { label: 'Erwachsene', value: 'adults' },
        { label: 'Kinder und Jugendliche', value: 'youth' },
      ],
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Entwurf (nicht sichtbar)', value: 'draft' },
        { label: 'Anmeldung offen', value: 'open' },
        { label: 'Nur Warteliste', value: 'waitlist' },
        { label: 'Geschlossen', value: 'closed' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'description', label: 'Beschreibung', type: 'richText' },
    {
      type: 'row',
      fields: [
        { name: 'minAge', label: 'Mindestalter', type: 'number', min: 0, max: 99 },
        { name: 'maxAge', label: 'Höchstalter', type: 'number', min: 0, max: 99 },
        { name: 'fee', label: 'Gebühr (€)', type: 'number', min: 0 },
        { name: 'capacity', label: 'Plätze', type: 'number', min: 1, required: true },
      ],
    },
    {
      name: 'registrationDeadline',
      label: 'Anmeldeschluss',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    { name: 'location', label: 'Ort', type: 'relationship', relationTo: 'locations' },
    {
      name: 'sessions',
      label: 'Termine',
      type: 'array',
      minRows: 1,
      labels: { singular: 'Termin', plural: 'Termine' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'start',
              label: 'Beginn',
              type: 'date',
              required: true,
              admin: { date: { pickerAppearance: 'dayAndTime' } },
            },
            {
              name: 'end',
              label: 'Ende',
              type: 'date',
              admin: { date: { pickerAppearance: 'dayAndTime' } },
            },
          ],
        },
        { name: 'note', label: 'Hinweis', type: 'text' },
      ],
    },
  ],
}
