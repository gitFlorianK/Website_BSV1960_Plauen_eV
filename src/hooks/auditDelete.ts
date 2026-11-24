import type { CollectionAfterDeleteHook, CollectionConfig } from 'payload'

import { auditRequest, requestActor } from '@/lib/audit'

/** Collections ohne Löschprotokoll: das Protokoll selbst und interne Zähler. */
const SKIP = new Set(['audit-log', 'rate-limits'])

/**
 * Protokolliert Löschungen durch angemeldete Personen (Admin-Panel, Server Actions).
 * Löschungen ohne Nutzer (Lösch-Jobs, Skripte) schreiben stattdessen einen Sammeleintrag.
 */
const auditDelete: CollectionAfterDeleteHook = async ({ collection, id, req }) => {
  if (!requestActor(req)) return
  await auditRequest(req, { action: 'doc.deleted', target: { collection: collection.slug, id } })
}

export function withDeleteAudit(config: CollectionConfig): CollectionConfig {
  if (SKIP.has(config.slug)) return config
  return { ...config, hooks: { ...config.hooks, afterDelete: [...(config.hooks?.afterDelete ?? []), auditDelete] } }
}
