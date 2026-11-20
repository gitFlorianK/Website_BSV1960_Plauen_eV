import type { CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'

import { hasRole, publicOrMembers } from '@/access'
import { visibilityField } from '@/fields/visibility'

/** Turniere, Vereinsveranstaltungen und Sondertermine. */
export const Events: CollectionConfig<'events'> = {
  slug: 'events',
  labels: { singular: 'Termin', plural: 'Termine' },
  access: {
    read: publicOrMembers,
    create: hasRole('vorstand', 'trainer'),
    update: hasRole('vorstand', 'trainer'),
    delete: hasRole('vorstand', 'trainer'),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'eventType', 'startDate', 'visibility'],
    group: 'Termine & Kurse',
  },
  defaultSort: 'startDate',
  fields: [
    { name: 'title', label: 'Titel', type: 'text', required: true },
    {
      name: 'eventType',
      label: 'Art',
      type: 'select',
      required: true,
      defaultValue: 'tournament',
      options: [
        { label: 'Turnier', value: 'tournament' },
        { label: 'Vereinsveranstaltung', value: 'club' },
        { label: 'Training (Sondertermin)', value: 'training' },
        { label: 'Sonstiges', value: 'other' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startDate',
          label: 'Beginn',
          type: 'date',
          required: true,
          index: true,
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'endDate',
          label: 'Ende',
          type: 'date',
          admin: { date: { pickerAppearance: 'dayAndTime' } },
          validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
            !value ||
            !siblingData.startDate ||
            new Date(value as string) >= new Date(siblingData.startDate as string) ||
            'Das Ende muss nach dem Beginn liegen.',
        },
      ],
    },
    { name: 'allDay', label: 'Ganztägig', type: 'checkbox', defaultValue: false },
    { name: 'location', label: 'Ort (Verein)', type: 'relationship', relationTo: 'locations' },
    {
      name: 'locationText',
      label: 'Ort (extern)',
      type: 'text',
      admin: { description: 'Für auswärtige Turniere, wenn kein Vereinsort gewählt ist.' },
    },
    { name: 'description', label: 'Beschreibung', type: 'richText' },
    {
      name: 'externalUrl',
      label: 'Ausschreibung / Link',
      type: 'text',
      validate: (value: unknown) =>
        !value || /^https:\/\/\S+$/.test(String(value)) || 'Bitte eine https://-Adresse angeben.',
    },
    {
      name: 'registration',
      label: 'Anmeldung für Mitglieder',
      type: 'group',
      fields: [
        { name: 'enabled', label: 'Anmeldung aktiv', type: 'checkbox', defaultValue: false },
        {
          name: 'deadline',
          label: 'Meldeschluss',
          type: 'date',
          admin: {
            condition: (_, siblingData) => Boolean(siblingData?.enabled),
            date: { pickerAppearance: 'dayAndTime' },
          },
        },
        {
          name: 'maxParticipants',
          label: 'Max. Teilnehmer',
          type: 'number',
          min: 1,
          admin: { condition: (_, siblingData) => Boolean(siblingData?.enabled) },
        },
      ],
    },
    visibilityField,
    slugField({ useAsSlug: 'title' }),
  ],
}
