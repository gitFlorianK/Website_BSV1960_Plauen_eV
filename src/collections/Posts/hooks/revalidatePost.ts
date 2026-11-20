import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

import type { Post } from '../../../payload-types'

/**
 * Beiträge erscheinen auf Detailseite, Übersicht, Saisonarchiv und Startseite (Archiv-Block).
 * Bei Veröffentlichung/Rückzug wird daher das gesamte Layout neu validiert.
 */
export const revalidatePost: CollectionAfterChangeHook<Post> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) return doc
  const wasPublished = previousDoc?._status === 'published'
  if (doc._status === 'published' || wasPublished) {
    payload.logger.info(`Revalidiere nach Änderung an Beitrag "${doc.slug}"`)
    revalidatePath('/', 'layout')
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Post> = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidatePath('/', 'layout')
  }
  return doc
}
