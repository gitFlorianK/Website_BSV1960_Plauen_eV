import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React, { cache } from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { findPosts, findSeasons, PostListView, SeasonNav } from '@/components/PostList'
import { LowImpactHero } from '@/heros/LowImpact'
import { formatDate } from '@/utilities/dates'
import { SITE_NAME } from '@/utilities/mergeOpenGraph'
import { routes } from '@/utilities/routes'

type Args = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ seite?: string }>
}

const findSeason = cache(async (slug: string) => {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'seasons',
    limit: 1,
    overrideAccess: false,
    pagination: false,
    where: { slug: { equals: slug } },
  })
  return docs[0] ?? null
})

export default async function SeasonPage({ params, searchParams }: Args) {
  const { slug } = await params
  const season = await findSeason(decodeURIComponent(slug))
  if (!season) notFound()

  const pageParam = (await searchParams).seite
  const page = pageParam && /^\d{1,4}$/.test(pageParam) ? Number(pageParam) : 1
  const [result, seasons] = await Promise.all([findPosts({ page, seasonId: season.id }), findSeasons()])
  if (page > 1 && page > result.totalPages) notFound()

  return (
    <div className="pb-16">
      <LowImpactHero>
        <h1>{season.name}</h1>
        <p>
          {season.type === 'indoor' ? 'Hallensaison' : 'Freiluftsaison'} · {formatDate(season.startDate)} bis{' '}
          {formatDate(season.endDate)}
        </p>
      </LowImpactHero>
      <div className="pt-10">
        <SeasonNav seasons={seasons} activeSlug={season.slug ?? undefined} />
        <PostListView
          result={result}
          hrefFor={(p) => (p === 1 ? routes.season(slug) : `${routes.season(slug)}?seite=${p}`)}
        />
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const season = await findSeason(decodeURIComponent(slug))
  return {
    title: season ? `Ergebnisse ${season.name} | ${SITE_NAME}` : SITE_NAME,
    alternates: { canonical: routes.season(slug) },
  }
}
