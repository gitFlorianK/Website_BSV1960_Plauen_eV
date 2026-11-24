import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React, { cache } from 'react'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { LowImpactHero } from '@/heros/LowImpact'
import { generateMeta, notFoundMeta } from '@/utilities/generateMeta'
import { getPreviewUser } from '@/utilities/previewUser'
import { LivePreviewListener } from '@/components/LivePreviewListener'

/**
 * Seiten aus dem CMS. Catch-all statt `[slug]`, damit auch tiefe unbekannte Adressen (`/a/b`,
 * `/aktuelles/x/y`) hier landen: CMS-Weiterleitungen werden geprüft, sonst kommt die eigene
 * 404-Seite. Ohne Catch-all zeigte Next dafür seine Standardseite ohne Layout (zwei Root-Layouts).
 */
type Args = { params: Promise<{ slug?: string[] }> }

/** Seiten-Slug aus den Segmenten; mehrteilige Pfade sind nie eine Seite. */
const resolve = async (paramsPromise: Args['params']) => {
  const { slug: segments = ['home'] } = await paramsPromise
  const decoded = segments.map((s) => decodeURIComponent(s))
  return { url: '/' + decoded.join('/'), slug: decoded.length === 1 ? decoded[0] : null }
}

export default async function Page({ params: paramsPromise }: Args) {
  const draft = Boolean(await getPreviewUser())
  const { url, slug } = await resolve(paramsPromise)
  const page = slug ? await queryPageBySlug({ slug }) : null

  if (!page) return <PayloadRedirects url={url} />

  const { hero, layout } = page
  const hasHero = hero?.type && hero.type !== 'none'

  return (
    <article className="pb-16">
      <PayloadRedirects disableNotFound url={url} />
      {draft && <LivePreviewListener />}

      {hasHero ? (
        <RenderHero {...hero} />
      ) : (
        // Jede Seite bekommt eine H1 – auch ohne gepflegten Seitenkopf
        <LowImpactHero>
          <h1>{page.title}</h1>
        </LowImpactHero>
      )}
      <RenderBlocks blocks={layout} />
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug } = await resolve(paramsPromise)
  const page = slug ? await queryPageBySlug({ slug }) : null
  return page ? generateMeta({ doc: page }) : notFoundMeta
}

const queryPageBySlug = cache(async ({ slug }: { slug: string }) => {
  const previewUser = await getPreviewUser()
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'pages',
    draft: Boolean(previewUser),
    limit: 1,
    pagination: false,
    // Access immer prüfen – im Entwurfsmodus mit der Staff-Sitzung (src/utilities/previewUser.ts)
    overrideAccess: false,
    user: previewUser,
    where: { slug: { equals: slug } },
  })
  return result.docs?.[0] || null
})
