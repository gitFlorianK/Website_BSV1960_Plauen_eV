import type { Block } from 'payload'

import { headingFields } from '@/fields/heading'

export const ContactInfo: Block = {
  slug: 'contactInfo',
  interfaceName: 'ContactInfoBlock',
  labels: { singular: 'Kontaktdaten', plural: 'Kontaktdaten' },
  fields: [
    ...headingFields,
    {
      name: 'showLocations',
      label: 'Trainingsorte anzeigen',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
}
