import type { CollectionConfig } from 'payload'

import { hasRole, nobody } from '@/access'
import { consentsGroup, contactRow, guardianGroup, personRow } from '@/fields/applicant'

/**
 * Online-Mitgliedsanträge (Anfrage an den Vorstand, kein automatischer Vereinsbeitritt).
 * Anlegen nur serverseitig. Abgelehnte Anträge werden nach 3 Monaten gelöscht (Job, Phase 6).
 */
export const MembershipApplications: CollectionConfig<'membership-applications'> = {
  slug: 'membership-applications',
  labels: { singular: 'Mitgliedsantrag', plural: 'Mitgliedsanträge' },
  access: {
    read: hasRole('vorstand'),
    create: nobody,
    update: hasRole('vorstand'),
    delete: hasRole('vorstand'),
  },
  admin: {
    useAsTitle: 'lastName',
    defaultColumns: ['lastName', 'firstName', 'status', 'createdAt'],
    group: 'Verwaltung',
  },
  defaultSort: '-createdAt',
  fields: [
    personRow,
    {
      type: 'row',
      fields: [
        { name: 'street', label: 'Straße und Hausnummer', type: 'text', required: true, maxLength: 200 },
        { name: 'postalCode', label: 'PLZ', type: 'text', required: true, maxLength: 10 },
        { name: 'city', label: 'Ort', type: 'text', required: true, maxLength: 100 },
      ],
    },
    contactRow(),
    {
      name: 'bowType',
      label: 'Bogenart',
      type: 'select',
      required: true,
      options: [
        { label: 'Recurve', value: 'recurve' },
        { label: 'Compound', value: 'compound' },
        { label: 'Langbogen', value: 'longbow' },
        { label: 'Jagdbogen', value: 'hunting' },
        { label: 'Noch offen', value: 'undecided' },
      ],
    },
    {
      name: 'courseCompleted',
      label: 'Anfängerkurs bereits absolviert',
      type: 'checkbox',
      defaultValue: false,
    },
    guardianGroup,
    { name: 'message', label: 'Nachricht', type: 'textarea', maxLength: 3000 },
    consentsGroup(),
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'Neu', value: 'new' },
        { label: 'In Bearbeitung', value: 'in_review' },
        { label: 'Aufgenommen', value: 'accepted' },
        { label: 'Abgelehnt', value: 'rejected' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'internalNote', label: 'Interne Notiz', type: 'textarea', maxLength: 2000, admin: { position: 'sidebar' } },
  ],
}
