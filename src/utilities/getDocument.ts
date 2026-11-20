import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

type LinkTarget = 'pages' | 'posts'

/** Dokument per ID für Weiterleitungen laden – nur öffentlich lesbare Inhalte. */
async function getDocumentById(collection: LinkTarget, id: string) {
  const payload = await getPayload({ config: configPromise })
  try {
    return await payload.findByID({
      collection,
      id,
      depth: 0,
      overrideAccess: false,
      select: { slug: true },
    })
  } catch {
    return null
  }
}

export const getCachedDocument = (collection: LinkTarget, id: string) =>
  unstable_cache(async () => getDocumentById(collection, id), ['doc-by-id', collection, id], {
    tags: [`${collection}_${id}`],
  })
