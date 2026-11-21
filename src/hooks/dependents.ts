import type { CollectionBeforeDeleteHook, CollectionSlug } from 'payload'
import { APIError } from 'payload'

/*
 * Abhängige Datensätze beim Löschen. Die Pflicht-Relationen (NOT NULL) haben in der DB
 * `ON DELETE SET NULL` – ohne diese Hooks scheitert das Löschen mit einem Datenbankfehler.
 */

/** Löscht abhängige Datensätze mit (z. B. Turnieranmeldungen eines gelöschten Termins/Kontos). */
export const deleteDependents =
  (collection: CollectionSlug, field: string): CollectionBeforeDeleteHook =>
  async ({ id, req }) => {
    await req.payload.delete({ collection, where: { [field]: { equals: id } }, req, overrideAccess: true })
  }

/** Verhindert das Löschen, solange abhängige Datensätze existieren (mit verständlicher Meldung). */
export const preventDeleteWhileUsed =
  (collection: CollectionSlug, field: string, message: (count: number) => string): CollectionBeforeDeleteHook =>
  async ({ id, req }) => {
    const { totalDocs } = await req.payload.count({ collection, where: { [field]: { equals: id } }, req, overrideAccess: true })
    if (totalDocs > 0) throw new APIError(message(totalDocs), 409, null, true)
  }
