import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'

/*
 * Cache-Invalidierung nach Änderungen im CMS. Daten aus diesen Collections/Globals erscheinen
 * in Blöcken auf beliebigen Seiten – daher wird das gesamte Layout neu validiert (kleine Website).
 * Skripte schreiben mit `context: { disableRevalidate: true }` (außerhalb von Next gibt es kein revalidatePath).
 */

const revalidateLayout = () => revalidatePath('/', 'layout')

const revalidateAll = (reason: string, logger: { info: (msg: string) => void }) => {
  logger.info(`Revalidiere Website (${reason})`)
  revalidateLayout()
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
    // expire: 0 – wer im Admin speichert und die Seite öffnet, sieht sofort den neuen Stand (nicht erst beim zweiten Aufruf)
    revalidateTag(`global_${global.slug}`, { expire: 0 })
    revalidateAll(`global ${global.slug}`, req.payload.logger)
  }
  return doc
}

/* ------------------------------------------------ Collections mit Entwürfen */

type Versioned = { id: number | string; _status?: 'draft' | 'published' | null; slug?: string | null }

/** Seiten werden in Header/Footer verlinkt (gecachte Globals) – deren Cache gleich mit verwerfen. */
const revalidateLayoutAndNavigation = () => {
  revalidateLayout()
  revalidateTag('global_header', { expire: 0 })
  revalidateTag('global_footer', { expire: 0 })
}

/**
 * Hooks für Collections mit Entwürfen: Revalidiert nur bei Veröffentlichung oder Rückzug
 * (Entwürfe und Autosave ändern die Website nicht) und beim Löschen.
 */
function revalidateOnPublish(label: string, revalidate: () => void) {
  const afterChange: CollectionAfterChangeHook<Versioned> = ({ doc, previousDoc, req: { payload, context } }) => {
    if (context.disableRevalidate) return doc
    if (doc._status === 'published' || previousDoc?._status === 'published') {
      payload.logger.info(`Revalidiere nach Änderung an ${label} "${doc.slug}"`)
      revalidate()
    }
    return doc
  }
  const afterDelete: CollectionAfterDeleteHook<Versioned> = ({ doc, req: { context } }) => {
    if (!context.disableRevalidate) revalidate()
    return doc
  }
  return { afterChange, afterDelete }
}

/** Beiträge erscheinen auf Detailseite, Übersicht, Saisonarchiv und Startseite (Archiv-Block). */
export const revalidatePosts = revalidateOnPublish('Beitrag', revalidateLayout)

/** Seiten: Layout plus Navigation (Slug-Änderung, Rückzug). */
export const revalidatePages = revalidateOnPublish('Seite', revalidateLayoutAndNavigation)
