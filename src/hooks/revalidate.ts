import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'

/*
 * Cache-Invalidierung nach Änderungen im CMS. Daten aus diesen Collections/Globals erscheinen
 * in Blöcken auf beliebigen Seiten – daher wird das gesamte Layout neu validiert (kleine Website).
 */

const revalidateAll = (reason: string, logger: { info: (msg: string) => void }) => {
  logger.info(`Revalidiere Website (${reason})`)
  revalidatePath('/', 'layout')
}

export const revalidateSiteAfterChange: CollectionAfterChangeHook = ({ doc, collection, req }) => {
  if (!req.context.disableRevalidate) revalidateAll(collection.slug, req.payload.logger)
  return doc
}

export const revalidateSiteAfterDelete: CollectionAfterDeleteHook = ({ doc, collection, req }) => {
  if (!req.context.disableRevalidate) revalidateAll(collection.slug, req.payload.logger)
  return doc
}

/** Für Globals, die über getCachedGlobal (Tag `global_<slug>`) gelesen werden. */
export const revalidateGlobal: GlobalAfterChangeHook = ({ doc, global, req }) => {
  if (!req.context.disableRevalidate) {
    revalidateTag(`global_${global.slug}`, 'max')
    revalidateAll(`global ${global.slug}`, req.payload.logger)
  }
  return doc
}
