import type { CollectionAfterDeleteHook, CollectionConfig } from 'payload'

import { audit, requestActor, requestIp } from '@/lib/audit'

/** Collections ohne Löschprotokoll: das Protokoll selbst und interne Zähler. */
const SKIP = new Set(['audit-log', 'rate-limits'])

/**
 * Protokolliert Löschungen durch angemeldete Personen (Admin-Panel, Server Actions).
 * Löschungen ohne Nutzer (Lösch-Jobs, Skripte) schreiben stattdessen einen Sammeleintrag.
 */
const auditDelete: CollectionAfterDeleteHook = async ({ collection, id, req }) => {
  const actor = requestActor(req)
  if (!actor) return
  await audit(req.payload, { action: 'doc.deleted', actor, target: { collection: collection.slug, id }, ip: requestIp(req) }, req)
}

export function withDeleteAudit(config: CollectionConfig): CollectionConfig {
  if (SKIP.has(config.slug)) return config
  return { ...config, hooks: { ...config.hooks, afterDelete: [...(config.hooks?.afterDelete ?? []), auditDelete] } }
}
