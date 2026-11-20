import type { CollectionConfig } from 'payload'

import { nobody } from '@/access'

/**
 * Zähler für Rate-Limits und ALTCHA-Replay-Schutz (Fixed Window). Nur intern über
 * `src/lib/rateLimit.ts` (atomares SQL) genutzt; Schlüssel enthalten nur gehashte IPs/E-Mails.
 * Als Collection definiert, damit Tabelle und Index Teil von Schema-Push und Migrationen sind.
 */
export const RateLimits: CollectionConfig<'rate-limits'> = {
  slug: 'rate-limits',
  access: { read: nobody, create: nobody, update: nobody, delete: nobody },
  admin: { hidden: true },
  timestamps: false,
  fields: [
    { name: 'key', type: 'text', required: true, unique: true },
    { name: 'count', type: 'number', required: true },
    { name: 'resetAt', type: 'date', required: true, index: true },
  ],
}
