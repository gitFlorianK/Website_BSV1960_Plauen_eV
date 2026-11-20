import type { CollectionConfig } from 'payload'

import { anyone, hasRole } from '@/access'

export const Sponsors: CollectionConfig<'sponsors'> = {
  slug: 'sponsors',
  labels: { singular: 'Sponsor', plural: 'Sponsoren' },
  access: {
    read: anyone,
    create: hasRole('vorstand', 'redakteur'),
    update: hasRole('vorstand', 'redakteur'),
    delete: hasRole('vorstand', 'redakteur'),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'url', 'sortOrder', 'active'],
    group: 'Verein',
  },
  defaultSort: 'sortOrder',
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'logo', label: 'Logo', type: 'upload', relationTo: 'media' },
    {
      name: 'url',
      label: 'Website',
      type: 'text',
      validate: (value: unknown) =>
        !value || /^https?:\/\/\S+$/.test(String(value)) || 'Bitte eine vollständige Adresse angeben.',
    },
    { name: 'description', label: 'Beschreibung', type: 'textarea' },
    { name: 'sortOrder', label: 'Reihenfolge', type: 'number', defaultValue: 100 },
    { name: 'active', label: 'Aktiv', type: 'checkbox', defaultValue: true },
  ],
}
