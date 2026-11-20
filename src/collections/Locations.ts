import type { CollectionConfig } from 'payload'

import { anyone, hasRole } from '@/access'

/** Trainings- und Veranstaltungsorte. */
export const Locations: CollectionConfig<'locations'> = {
  slug: 'locations',
  labels: { singular: 'Ort', plural: 'Orte' },
  access: {
    read: anyone,
    create: hasRole('vorstand', 'trainer'),
    update: hasRole('vorstand', 'trainer'),
    delete: hasRole('vorstand'),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'street', 'city'],
    group: 'Verein',
  },
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'street', label: 'Straße und Hausnummer', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'postalCode', label: 'PLZ', type: 'text', required: true },
        { name: 'city', label: 'Ort', type: 'text', required: true, defaultValue: 'Plauen' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'latitude', label: 'Breitengrad', type: 'number', min: -90, max: 90 },
        { name: 'longitude', label: 'Längengrad', type: 'number', min: -180, max: 180 },
      ],
    },
    { name: 'notes', label: 'Hinweise (z. B. Anfahrt, Parken)', type: 'textarea' },
  ],
}
