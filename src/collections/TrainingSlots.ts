import type { CollectionConfig } from 'payload'

import { anyone, hasRole } from '@/access'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const validateTime = (value: unknown) =>
  !value || TIME_RE.test(String(value)) || 'Bitte im Format HH:MM angeben, z. B. 17:30.'

export const WEEKDAYS = [
  { label: 'Montag', value: '1' },
  { label: 'Dienstag', value: '2' },
  { label: 'Mittwoch', value: '3' },
  { label: 'Donnerstag', value: '4' },
  { label: 'Freitag', value: '5' },
  { label: 'Samstag', value: '6' },
  { label: 'Sonntag', value: '7' },
]

/**
 * Regelmäßige Trainingszeiten. Saisontyp: Halle (1.10.–31.3.) bzw. Freiluft (1.4.–30.9.);
 * das Frontend hebt die aktuelle Saison hervor.
 */
export const TrainingSlots: CollectionConfig<'training-slots'> = {
  slug: 'training-slots',
  labels: { singular: 'Trainingszeit', plural: 'Trainingszeiten' },
  access: {
    read: anyone,
    create: hasRole('vorstand', 'trainer'),
    update: hasRole('vorstand', 'trainer'),
    delete: hasRole('vorstand', 'trainer'),
  },
  admin: {
    useAsTitle: 'group',
    defaultColumns: ['seasonType', 'weekday', 'startTime', 'endTime', 'group', 'location'],
    group: 'Termine & Kurse',
  },
  defaultSort: ['seasonType', 'weekday', 'startTime'],
  fields: [
    {
      name: 'seasonType',
      label: 'Saison',
      type: 'select',
      required: true,
      options: [
        { label: 'Halle (1.10.–31.3.)', value: 'indoor' },
        { label: 'Freiluft (1.4.–30.9.)', value: 'outdoor' },
      ],
    },
    { name: 'weekday', label: 'Wochentag', type: 'select', required: true, options: WEEKDAYS },
    {
      type: 'row',
      fields: [
        { name: 'startTime', label: 'Beginn', type: 'text', required: true, validate: validateTime },
        {
          name: 'endTime',
          label: 'Ende (leer = offenes Ende)',
          type: 'text',
          validate: validateTime,
        },
      ],
    },
    {
      name: 'group',
      label: 'Gruppe',
      type: 'text',
      required: true,
      admin: { description: 'z. B. „Kinder und Jugend“, „Bögen ohne Visier“' },
    },
    { name: 'location', label: 'Ort', type: 'relationship', relationTo: 'locations', required: true },
    { name: 'note', label: 'Hinweis', type: 'text' },
  ],
}
