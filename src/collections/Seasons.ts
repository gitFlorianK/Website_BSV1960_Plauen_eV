import type { CollectionConfig } from 'payload'

import { anyone, hasRole } from '@/access'

/** Wettkampfsaisons (z. B. „Halle 2025/26“). Grundlage für das Ergebnisarchiv. */
export const Seasons: CollectionConfig<'seasons'> = {
  slug: 'seasons',
  labels: { singular: 'Saison', plural: 'Saisons' },
  access: {
    read: anyone,
    create: hasRole('vorstand', 'trainer'),
    update: hasRole('vorstand', 'trainer'),
    delete: hasRole('vorstand'),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'startDate', 'endDate'],
    group: 'Verein',
  },
  defaultSort: '-startDate',
  fields: [
    { name: 'name', label: 'Bezeichnung', type: 'text', required: true, unique: true },
    {
      name: 'type',
      label: 'Art',
      type: 'select',
      required: true,
      options: [
        { label: 'Halle', value: 'indoor' },
        { label: 'Freiluft', value: 'outdoor' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'startDate', label: 'Beginn', type: 'date', required: true },
        {
          name: 'endDate',
          label: 'Ende',
          type: 'date',
          required: true,
          validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
            !value ||
            !siblingData.startDate ||
            new Date(value as string) >= new Date(siblingData.startDate as string) ||
            'Das Ende muss nach dem Beginn liegen.',
        },
      ],
    },
  ],
}
