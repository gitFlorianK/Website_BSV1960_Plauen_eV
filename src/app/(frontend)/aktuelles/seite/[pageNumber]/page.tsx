import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import React from 'react'

import { findPosts, findSeasons, PostListView, SeasonNav } from '@/components/PostList'
import { LowImpactHero } from '@/heros/LowImpact'
import { SITE_NAME } from '@/utilities/mergeOpenGraph'
import { routes } from '@/utilities/routes'

export const revalidate = 600

type Args = { params: Promise<{ pageNumber: string }> }

const parsePage = (v: string) => (/^\d{1,4}$/.test(v) ? Number(v) : NaN)

export default async function PostsPageN({ params }: Args) {
  const page = parsePage((await params).pageNumber)
  if (!Number.isInteger(page) || page < 1) notFound()
  if (page === 1) permanentRedirect(routes.posts)

  const [result, seasons] = await Promise.all([findPosts({ page }), findSeasons()])
  if (page > result.totalPages) notFound()

  return (
    <div className="pb-16">
      <LowImpactHero>
        <h1>Aktuelles &amp; Ergebnisse</h1>
      </LowImpactHero>
      <div className="pt-10">
        <SeasonNav seasons={seasons} />
        <PostListView result={result} hrefFor={(p) => (p === 1 ? routes.posts : routes.postsPage(p))} />
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { pageNumber } = await params
  return {
    title: `Aktuelles – Seite ${parsePage(pageNumber) || ''} | ${SITE_NAME}`,
    alternates: { canonical: routes.postsPage(parsePage(pageNumber)) },
  }
}
