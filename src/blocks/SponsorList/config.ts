import type { Block } from 'payload'

import { headingFields } from '@/fields/heading'

export const SponsorList: Block = {
  slug: 'sponsorList',
  interfaceName: 'SponsorListBlock',
  labels: { singular: 'Sponsorenliste', plural: 'Sponsorenlisten' },
  fields: [...headingFields],
}
