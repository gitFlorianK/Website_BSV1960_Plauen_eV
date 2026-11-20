import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Page } from '../../../payload-types'

/**
 * Seiten werden in Header/Footer verlinkt (gecachte Globals) – bei Veröffentlichung, Rückzug oder
 * Slug-Änderung daher Layout und Navigations-Cache neu validieren.
 */
const revalidateAll = () => {
  revalidatePath('/', 'layout')
  revalidateTag('global_header', 'max')
  revalidateTag('global_footer', 'max')
}

export const revalidatePage: CollectionAfterChangeHook<Page> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) return doc
  if (doc._status === 'published' || previousDoc?._status === 'published') {
    payload.logger.info(`Revalidiere nach Änderung an Seite "${doc.slug}"`)
    revalidateAll()
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Page> = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) revalidateAll()
  return doc
}
