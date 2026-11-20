import type { MetadataRoute } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { getServerSideURL } from '@/utilities/getURL'
import { routes } from '@/utilities/routes'

export const revalidate = 3600

/** Sitemap aller öffentlich sichtbaren Inhalte (anonyme Abfragen mit Access-Regeln). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config: configPromise })
  const base = getServerSideURL()
  const common = { depth: 0, limit: 1000, overrideAccess: false, pagination: false } as const

  const [pages, posts, events, galleries, seasons] = await Promise.all([
    payload.find({ ...common, collection: 'pages', select: { slug: true, updatedAt: true } }),
    payload.find({ ...common, collection: 'posts', select: { slug: true, updatedAt: true } }),
    payload.find({ ...common, collection: 'events', select: { slug: true, updatedAt: true } }),
    payload.find({ ...common, collection: 'galleries', select: { slug: true, updatedAt: true } }),
    payload.find({ ...common, collection: 'seasons', select: { slug: true, updatedAt: true } }),
  ])

  const entry = (path: string, lastModified?: string) => ({
    url: `${base}${path}`,
    lastModified: lastModified ? new Date(lastModified) : undefined,
  })

  return [
    ...pages.docs.filter((d) => d.slug).map((d) => entry(routes.page(d.slug!), d.updatedAt)),
    entry(routes.posts),
    entry(routes.events),
    entry(routes.galleries),
    ...posts.docs.filter((d) => d.slug).map((d) => entry(routes.post(d.slug), d.updatedAt)),
    ...events.docs.filter((d) => d.slug).map((d) => entry(routes.event(d.slug), d.updatedAt)),
    ...galleries.docs.filter((d) => d.slug).map((d) => entry(routes.gallery(d.slug), d.updatedAt)),
    ...seasons.docs.filter((d) => d.slug).map((d) => entry(routes.season(d.slug!), d.updatedAt)),
  ]
}
