import type { GlobalConfig } from 'payload'

import { anyone, hasRole } from '@/access'

import { link } from '@/fields/link'
import { revalidateGlobal } from '@/hooks/revalidate'

export const Header: GlobalConfig = {
  slug: 'header',
  label: 'Hauptnavigation',
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
          RowLabel: '@/Header/RowLabel#RowLabel',
        },
      },
    },
  ],
  hooks: {
    afterChange: [revalidateGlobal],
  },
}
