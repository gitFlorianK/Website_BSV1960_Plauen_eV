import type { Block } from 'payload'

import { headingFields } from '@/fields/heading'

export const TrainingSchedule: Block = {
  slug: 'trainingSchedule',
  interfaceName: 'TrainingScheduleBlock',
  labels: { singular: 'Trainingszeiten', plural: 'Trainingszeiten' },
  fields: [
    ...headingFields,
    {
      name: 'show',
      label: 'Anzeigen',
      type: 'select',
      defaultValue: 'both',
      required: true,
      options: [
        { label: 'Halle und Freiluft (aktuelle Saison zuerst)', value: 'both' },
        { label: 'Nur aktuelle Saison', value: 'current' },
      ],
    },
  ],
}
