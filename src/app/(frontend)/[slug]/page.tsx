import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React, { cache } from 'react'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { LowImpactHero } from '@/heros/LowImpact'
import { generateMeta } from '@/utilities/generateMeta'
import { getPreviewUser } from '@/utilities/previewUser'
import { LivePreviewListener } from '@/components/LivePreviewListener'

type Args = { params: Promise<{ slug?: string }> }

export default async function Page({ params: paramsPromise }: Args) {
  const draft = Boolean(await getPreviewUser())
  const { slug = 'home' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const url = '/' + decodedSlug
  const page = await queryPageBySlug({ slug: decodedSlug })

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
  const { slug = 'home' } = await paramsPromise
  const page = await queryPageBySlug({ slug: decodeURIComponent(slug) })
  return generateMeta({ doc: page })
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
