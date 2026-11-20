import type React from 'react'

import { getCachedDocument } from '@/utilities/getDocument'
import { getCachedRedirects } from '@/utilities/getRedirects'
import { docPath } from '@/utilities/routes'
import { isSafeUrl } from '@/utilities/safeUrl'
import { notFound, permanentRedirect } from 'next/navigation'

interface Props {
  disableNotFound?: boolean
  url: string
}

/** Im CMS gepflegte Weiterleitungen (Redirects-Plugin) serverseitig auflösen. */
export const PayloadRedirects: React.FC<Props> = async ({ disableNotFound, url }) => {
  const redirects = await getCachedRedirects()()
  const redirectItem = redirects.find((r) => r.from === url)

  if (redirectItem?.to) {
    const { to } = redirectItem
    if (to.type === 'custom' || to.url) {
      if (to.url && isSafeUrl(to.url)) permanentRedirect(to.url)
    } else if (to.reference) {
      const { relationTo, value } = to.reference
      const doc =
        typeof value === 'object' && value !== null
          ? value
          : await getCachedDocument(relationTo, String(value))()
      if (doc?.slug) permanentRedirect(docPath(relationTo, doc.slug))
    }
  }

  if (disableNotFound) return null
  notFound()
}
