import type { Metadata } from 'next'

import type { Media, Page, Post, Config } from '../payload-types'

import { mergeOpenGraph, SITE_NAME } from './mergeOpenGraph'
import { getServerSideURL } from './getURL'
import { docPath, type LinkableCollection } from './routes'

/** Metadaten der 404-Seite – auch für Routen, deren Dokument fehlt (deren generateMetadata läuft zuerst). */
export const notFoundMeta: Metadata = {
  title: `Seite nicht gefunden | ${SITE_NAME}`,
  robots: { index: false },
}

const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null) => {
  const serverUrl = getServerSideURL()
  // Nur öffentliche Bilder als Vorschaubild verwenden
  if (image && typeof image === 'object' && 'url' in image && image.visibility === 'public') {
    const ogUrl = image.sizes?.og?.url
    return ogUrl ? serverUrl + ogUrl : serverUrl + image.url
  }
  return `${serverUrl}/brand/og-default.jpg`
}

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | null
  collection?: LinkableCollection
}): Promise<Metadata> => {
  const { doc, collection = 'pages' } = args

  const ogImage = getImageURL(doc?.meta?.image)
  // Gepflegte SEO-Titel enthalten den Vereinsnamen bereits (siehe generateTitle im SEO-Plugin)
  const title =
    doc?.meta?.title ||
    (doc?.title && doc.slug !== 'home' ? `${doc.title} | ${SITE_NAME}` : `${SITE_NAME} – Bogensport im Vogtland`)
  const path = typeof doc?.slug === 'string' ? docPath(collection, doc.slug) : '/'

  return {
    description: doc?.meta?.description,
    alternates: { canonical: path },
    openGraph: mergeOpenGraph({
      description: doc?.meta?.description || undefined,
      images: [{ url: ogImage }],
      title,
      url: path,
    }),
    title,
  }
}
