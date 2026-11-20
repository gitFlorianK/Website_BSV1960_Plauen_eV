import type { GlobalConfig } from 'payload'

import { anyone, hasRole } from '@/access'

import { link } from '@/fields/link'
import { revalidateGlobal } from '@/hooks/revalidate'

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'Fußzeile',
  access: {
    read: anyone,
    update: hasRole('vorstand', 'redakteur'),
  },
  admin: { group: 'Inhalte' },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      fields: [
        link({
          appearances: false,
        }),
      ],
      maxRows: 8,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/Footer/RowLabel#RowLabel',
        },
      },
    },
  ],
  hooks: {
    afterChange: [revalidateGlobal],
  },
}
