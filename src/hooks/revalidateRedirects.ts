import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidateTag } from 'next/cache'

/** Weiterleitungen werden gemeinsam gecacht (getCachedRedirects) – bei jeder Änderung neu laden. */
export const revalidateRedirects: CollectionAfterChangeHook & CollectionAfterDeleteHook = ({ doc, req: { payload, context } }) => {
  if (context.disableRevalidate) return doc
  payload.logger.info('Weiterleitungen neu laden')
  revalidateTag('redirects', { expire: 0 }) // sofort, nicht erst nach einem veralteten Aufruf
  return doc
}
