import type { Metadata } from 'next'
import React from 'react'

import { findPosts, findSeasons, PostListView, SeasonNav } from '@/components/PostList'
import { LowImpactHero } from '@/heros/LowImpact'
import { mergeOpenGraph, SITE_NAME } from '@/utilities/mergeOpenGraph'
import { routes } from '@/utilities/routes'

export const revalidate = 600

export default async function PostsPage() {
  const [result, seasons] = await Promise.all([findPosts({ page: 1 }), findSeasons()])
  return (
    <div className="pb-16">
      <LowImpactHero>
        <h1>Aktuelles &amp; Ergebnisse</h1>
        <p>Neuigkeiten aus dem Verein, Turnierberichte und Ergebnisse unserer Schützinnen und Schützen.</p>
      </LowImpactHero>
      <div className="pt-10">
        <SeasonNav seasons={seasons} />
        <PostListView result={result} hrefFor={(p) => (p === 1 ? routes.posts : routes.postsPage(p))} />
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  title: `Aktuelles & Ergebnisse | ${SITE_NAME}`,
  description: 'Neuigkeiten, Turnierberichte und Ergebnisse des BSV 1960 Plauen.',
  alternates: { canonical: routes.posts },
  openGraph: mergeOpenGraph({ title: `Aktuelles & Ergebnisse | ${SITE_NAME}`, url: routes.posts }),
}
