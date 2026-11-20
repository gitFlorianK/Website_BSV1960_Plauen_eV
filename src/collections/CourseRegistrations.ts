import type { CollectionConfig } from 'payload'

import { hasRole, nobody } from '@/access'

/**
 * Anmeldungen zu Anfängerkursen. Personenbezogene Daten (auch von Minderjährigen)!
 * - Anlegen nur serverseitig über das validierte Anmeldeformular (overrideAccess), nie direkt über die API.
 * - Lesen nur Vorstand/Trainer, Ändern/Löschen nur Vorstand.
 * - Löschfristen werden per Job durchgesetzt (siehe docs/konzept.md, Abschnitt 6).
 */
export const CourseRegistrations: CollectionConfig<'course-registrations'> = {
  slug: 'course-registrations',
  labels: { singular: 'Kursanmeldung', plural: 'Kursanmeldungen' },
  access: {
    read: hasRole('vorstand', 'trainer'),
    create: nobody,
    update: hasRole('vorstand'),
    delete: hasRole('vorstand'),
  },
  admin: {
    defaultColumns: ['lastName', 'firstName', 'course', 'status', 'createdAt'],
    useAsTitle: 'lastName',
    group: 'Termine & Kurse',
  },
  fields: [
    { name: 'course', label: 'Kurs', type: 'relationship', relationTo: 'courses', required: true },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'unconfirmed',
      index: true,
      options: [
        { label: 'E-Mail unbestätigt', value: 'unconfirmed' },
        { label: 'Angemeldet', value: 'registered' },
        { label: 'Warteliste', value: 'waitlist' },
        { label: 'Teilnahme bestätigt', value: 'confirmed' },
        { label: 'Storniert', value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        { name: 'firstName', label: 'Vorname', type: 'text', required: true, maxLength: 100 },
        { name: 'lastName', label: 'Nachname', type: 'text', required: true, maxLength: 100 },
        {
          name: 'birthDate',
          label: 'Geburtsdatum',
          type: 'date',
          required: true,
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'email', label: 'E-Mail', type: 'email', required: true },
        { name: 'phone', label: 'Telefon', type: 'text', maxLength: 50 },
      ],
    },
    {
      name: 'guardian',
      label: 'Erziehungsberechtigte(r) (bei Minderjährigen)',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', label: 'Name', type: 'text', maxLength: 200 },
            { name: 'email', label: 'E-Mail', type: 'email' },
            { name: 'phone', label: 'Telefon', type: 'text', maxLength: 50 },
          ],
        },
      ],
    },
    { name: 'message', label: 'Nachricht', type: 'textarea', maxLength: 2000 },
    {
      name: 'consents',
      label: 'Einwilligungen',
      type: 'group',
      admin: { readOnly: true },
      fields: [
        { name: 'privacyAcceptedAt', label: 'Datenschutzhinweise akzeptiert am', type: 'date' },
        { name: 'photosAllowed', label: 'Fotos erlaubt', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      name: 'confirmedAt',
      label: 'E-Mail bestätigt am',
      type: 'date',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      // Double-Opt-in-Token (nur Hash speichern). Nie über API/Admin auslesbar.
      name: 'confirmTokenHash',
      type: 'text',
      index: true,
      hidden: true,
    },
  ],
}
