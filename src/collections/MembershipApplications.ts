import type { CollectionConfig } from 'payload'

import { hasRole, nobody } from '@/access'

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
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'street', label: 'Straße und Hausnummer', type: 'text', required: true, maxLength: 200 },
        { name: 'postalCode', label: 'PLZ', type: 'text', required: true, maxLength: 10 },
        { name: 'city', label: 'Ort', type: 'text', required: true, maxLength: 100 },
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
    {
      name: 'guardian',
      label: 'Erziehungsberechtigte(r) (bei Minderjährigen)',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', label: 'Name', type: 'text', maxLength: 200 },
            { name: 'phone', label: 'Telefon', type: 'text', maxLength: 50 },
          ],
        },
      ],
    },
    { name: 'message', label: 'Nachricht', type: 'textarea', maxLength: 3000 },
    {
      name: 'consents',
      label: 'Einwilligungen',
      type: 'group',
      admin: { readOnly: true },
      fields: [
        { name: 'privacyAcceptedAt', label: 'Datenschutzhinweise akzeptiert am', type: 'date' },
        { name: 'guardianConsentAt', label: 'Zustimmung Erziehungsberechtigte am', type: 'date' },
      ],
    },
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
