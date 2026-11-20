import type { Block } from 'payload'

import { headingFields } from '@/fields/heading'

export const UpcomingEvents: Block = {
  slug: 'upcomingEvents',
  interfaceName: 'UpcomingEventsBlock',
  labels: { singular: 'Nächste Termine', plural: 'Nächste Termine' },
  fields: [
    ...headingFields,
    { name: 'limit', label: 'Anzahl', type: 'number', defaultValue: 3, min: 1, max: 12 },
    {
      name: 'emptyText',
      label: 'Text, wenn keine Termine anstehen',
      type: 'text',
      defaultValue: 'Aktuell stehen keine öffentlichen Termine an.',
    },
  ],
}
