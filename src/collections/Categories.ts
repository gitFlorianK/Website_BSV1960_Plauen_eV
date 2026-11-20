import type { CollectionConfig } from 'payload'

import { anyone, hasRole } from '@/access'
import { slugField } from '@/fields/slug'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Kategorie', plural: 'Kategorien' },
  access: {
    create: hasRole('vorstand', 'redakteur'),
    delete: hasRole('vorstand', 'redakteur'),
    read: anyone,
    update: hasRole('vorstand', 'redakteur'),
  },
  admin: {
    group: 'Inhalte',
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField({
      position: undefined,
    }),
  ],
}
