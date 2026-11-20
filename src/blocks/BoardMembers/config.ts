import type { Block } from 'payload'

export const BoardMembers: Block = {
  slug: 'boardMembers',
  interfaceName: 'BoardMembersBlock',
  labels: { singular: 'Vorstand', plural: 'Vorstand' },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'heading',
          label: 'Überschrift',
          type: 'text',
          admin: { description: 'Die Personen werden unter „Verwaltung → Vereinsdaten“ gepflegt.' },
        },
        { name: 'intro', label: 'Einleitung', type: 'textarea' },
      ],
    },
  ],
}
