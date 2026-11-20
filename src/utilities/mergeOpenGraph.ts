import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'

export const SITE_NAME = 'BSV 1960 Plauen'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  locale: 'de_DE',
  description:
    'Bogensportverein 1960 Plauen e. V. – Recurve, Compound, Langbogen und Jagdbogen im Vogtland. Training, Anfängerkurse, Turniere.',
  images: [{ url: `${getServerSideURL()}/brand/og-default.jpg`, width: 1200, height: 630 }],
  siteName: SITE_NAME,
  title: SITE_NAME,
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
