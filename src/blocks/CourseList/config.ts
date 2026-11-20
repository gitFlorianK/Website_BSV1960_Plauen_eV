import type { Block } from 'payload'

import { headingFields } from '@/fields/heading'

export const CourseList: Block = {
  slug: 'courseList',
  interfaceName: 'CourseListBlock',
  labels: { singular: 'Kursliste', plural: 'Kurslisten' },
  fields: [
    ...headingFields,
    {
      name: 'emptyText',
      label: 'Text, wenn kein Kurs veröffentlicht ist',
      type: 'textarea',
      defaultValue:
        'Die Termine für die nächsten Anfängerkurse stehen noch nicht fest. Schau bald wieder vorbei oder melde dich über unsere Kontaktseite.',
    },
  ],
}
