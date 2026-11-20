import type { Block } from 'payload'

import { headingFields } from '@/fields/heading'
import { validateSafeUrl } from '@/utilities/safeUrl'

export const LinkList: Block = {
  slug: 'linkList',
  interfaceName: 'LinkListBlock',
  labels: { singular: 'Linkliste', plural: 'Linklisten' },
  fields: [
    ...headingFields,
    {
      name: 'groups',
      label: 'Gruppen',
      type: 'array',
      minRows: 1,
      labels: { singular: 'Gruppe', plural: 'Gruppen' },
      fields: [
        { name: 'title', label: 'Titel', type: 'text', required: true },
        {
          name: 'links',
          label: 'Links',
          type: 'array',
          labels: { singular: 'Link', plural: 'Links' },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'label', label: 'Bezeichnung', type: 'text', required: true },
                { name: 'url', label: 'URL', type: 'text', required: true, validate: validateSafeUrl },
              ],
            },
            { name: 'description', label: 'Beschreibung', type: 'text' },
          ],
        },
      ],
    },
  ],
}
