import Link from 'next/link'
import React from 'react'
import configPromise from '@payload-config'
import { getPayload, type Where } from 'payload'

import { CollectionArchive } from '@/components/CollectionArchive'
import { Pagination } from '@/components/Pagination'
import { routes } from '@/utilities/routes'
import { cn } from '@/utilities/ui'

export const POSTS_PER_PAGE = 12

/** Öffentliche Beiträge seitenweise laden (Access-Regeln greifen über overrideAccess: false). */
export const findPosts = async ({ page = 1, seasonId }: { page?: number; seasonId?: number }) => {
  const payload = await getPayload({ config: configPromise })
  const where: Where | undefined = seasonId ? { season: { equals: seasonId } } : undefined
  return payload.find({
    collection: 'posts',
    depth: 1,
    limit: POSTS_PER_PAGE,
    page,
    overrideAccess: false,
    sort: '-publishedAt',
    where,
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
      heroImage: true,
      publishedAt: true,
      visibility: true,
    },
  })
}

export const findSeasons = async () => {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'seasons',
    depth: 0,
    limit: 100,
    overrideAccess: false,
    pagination: false,
    sort: '-startDate',
    select: { name: true, slug: true },
  })
  return docs
}

/** Navigation „Alle / Saison …“ für das Ergebnisarchiv. */
export const SeasonNav: React.FC<{
  seasons: Awaited<ReturnType<typeof findSeasons>>
  activeSlug?: string
}> = ({ seasons, activeSlug }) => {
  if (seasons.length === 0) return null
  const pill = 'inline-block rounded-full border px-4 py-1.5 text-sm font-medium transition-colors'
  const state = (active: boolean) =>
    active ? 'border-ink bg-ink text-white' : 'border-border hover:border-ink'
  return (
    <nav aria-label="Ergebnisarchiv nach Saison" className="container mb-8">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href={routes.posts}
            aria-current={!activeSlug ? 'page' : undefined}
            className={cn(pill, state(!activeSlug))}
          >
            Alle
          </Link>
        </li>
        {seasons.map((s) =>
          s.slug ? (
            <li key={s.id}>
              <Link
                href={routes.season(s.slug)}
                aria-current={activeSlug === s.slug ? 'page' : undefined}
                className={cn(pill, state(activeSlug === s.slug))}
              >
                {s.name}
              </Link>
            </li>
          ) : null,
        )}
      </ul>
    </nav>
  )
}

export const PostListView: React.FC<{
  result: Awaited<ReturnType<typeof findPosts>>
  hrefFor: (page: number) => string
}> = ({ result, hrefFor }) => (
  <>
    <p className="container mb-4 text-sm text-muted-foreground">
      {result.totalDocs === 0
        ? 'Keine Beiträge'
        : `${result.totalDocs} ${result.totalDocs === 1 ? 'Beitrag' : 'Beiträge'}${
            result.totalPages > 1 ? ` · Seite ${result.page} von ${result.totalPages}` : ''
          }`}
    </p>
    <CollectionArchive posts={result.docs} headingLevel="h2" />
    <Pagination page={result.page ?? 1} totalPages={result.totalPages} hrefFor={hrefFor} />
  </>
)
