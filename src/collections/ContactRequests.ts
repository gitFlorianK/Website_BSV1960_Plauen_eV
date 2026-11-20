import type { CollectionConfig } from 'payload'

import { hasRole, nobody } from '@/access'

/**
 * Kontaktanfragen aus dem Formular auf /kontakt.
 * Anlegen nur serverseitig (validiert, Spamschutz, Rate-Limit). Löschfrist: 6 Monate (Job, Phase 6).
 */
export const ContactRequests: CollectionConfig<'contact-requests'> = {
  slug: 'contact-requests',
  labels: { singular: 'Kontaktanfrage', plural: 'Kontaktanfragen' },
  access: {
    read: hasRole('vorstand'),
    create: nobody,
    update: hasRole('vorstand'),
    delete: hasRole('vorstand'),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'topic', 'status', 'createdAt'],
    group: 'Verwaltung',
  },
  defaultSort: '-createdAt',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true, maxLength: 200, admin: { readOnly: true } },
        { name: 'email', label: 'E-Mail', type: 'email', required: true, admin: { readOnly: true } },
        { name: 'phone', label: 'Telefon', type: 'text', maxLength: 50, admin: { readOnly: true } },
      ],
    },
    {
      name: 'topic',
      label: 'Thema',
      type: 'select',
      required: true,
      options: [
        { label: 'Allgemeine Frage', value: 'general' },
        { label: 'Anfängerkurs / Probetraining', value: 'beginners' },
        { label: 'Bogenschießen bei einer Veranstaltung', value: 'event' },
        { label: 'Sonstiges', value: 'other' },
      ],
      admin: { readOnly: true },
    },
    { name: 'message', label: 'Nachricht', type: 'textarea', required: true, maxLength: 5000, admin: { readOnly: true } },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'Neu', value: 'new' },
        { label: 'Erledigt', value: 'done' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'internalNote', label: 'Interne Notiz', type: 'textarea', maxLength: 2000, admin: { position: 'sidebar' } },
  ],
}
