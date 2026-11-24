import type { Metadata } from 'next'
import Link from 'next/link'
import React, { cache } from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { ArrowLeftIcon, ImagesIcon } from 'lucide-react'

import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Media } from '@/components/Media'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import RichText from '@/components/RichText'
import type { Post } from '@/payload-types'
import { formatDate } from '@/utilities/dates'
import { generateMeta } from '@/utilities/generateMeta'
import { getPreviewUser } from '@/utilities/previewUser'
import { publicMedia } from '@/utilities/publicMedia'
import { routes } from '@/utilities/routes'

type Args = { params: Promise<{ slug?: string }> }

export default async function PostPage({ params }: Args) {
  const draft = Boolean(await getPreviewUser())
  const { slug = '' } = await params
  const decodedSlug = decodeURIComponent(slug)
  const url = routes.post(decodedSlug)
  const post = await queryPostBySlug({ slug: decodedSlug })

  if (!post) return <PayloadRedirects url={url} />

  const hero = publicMedia(post.heroImage)
  const categories = (post.categories ?? []).filter((c) => typeof c === 'object' && c !== null)
  const season = typeof post.season === 'object' ? post.season : null
  const gallery = typeof post.gallery === 'object' ? post.gallery : null
  const related = (post.relatedPosts ?? []).filter((p): p is Post => typeof p === 'object' && p !== null)

  return (
    <article className="pb-16">
      <PayloadRedirects disableNotFound url={url} />
      {draft && <LivePreviewListener />}

      <header className="border-b border-border bg-brand-soft">
        <div className="container py-10 md:py-14">
          <Link href={routes.posts} className="inline-flex items-center gap-1 text-sm font-medium text-brand-text hover:text-navy">
            <ArrowLeftIcon aria-hidden className="size-4" /> Alle Beiträge
          </Link>
          <p className="mt-4 flex flex-wrap gap-x-2 text-sm font-semibold uppercase tracking-wide text-brand-text">
            {post.publishedAt && <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>}
            {categories.length > 0 && <span>· {categories.map((c) => (typeof c === 'object' ? c.title : '')).join(', ')}</span>}
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-bold tracking-tight md:text-5xl">{post.title}</h1>
          {season?.slug && (
            <p className="mt-4">
              Saison:{' '}
              <Link className="font-medium text-brand-text underline underline-offset-2 hover:text-navy" href={routes.season(season.slug)}>
                {season.name}
              </Link>
            </p>
          )}
        </div>
      </header>

      {hero && (
        <div className="container mt-10">
          <Media
            resource={hero}
            priority
            className="overflow-hidden rounded-xl"
            imgClassName="w-full h-auto max-h-[36rem] object-cover"
            size="(min-width: 1280px) 1280px, 100vw"
          />
        </div>
      )}

      <div className="container mt-10">
        <RichText className="max-w-3xl" data={post.content} enableGutter={false} />

        {gallery?.slug && (
          <p className="mt-10">
            <Link
              href={routes.gallery(gallery.slug)}
              className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 font-semibold text-white hover:bg-black"
            >
              <ImagesIcon aria-hidden className="size-5" /> Fotos: {gallery.title}
            </Link>
          </p>
        )}
      </div>

      {related.length > 0 && <RelatedPosts className="container mt-16" docs={related} />}
    </article>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug = '' } = await params
  const post = await queryPostBySlug({ slug: decodeURIComponent(slug) })
  return generateMeta({ doc: post, collection: 'posts' })
}

const queryPostBySlug = cache(async ({ slug }: { slug: string }) => {
  const previewUser = await getPreviewUser()
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'posts',
    draft: Boolean(previewUser),
    limit: 1,
    // Access immer prüfen – im Entwurfsmodus mit der Staff-Sitzung (src/utilities/previewUser.ts)
    overrideAccess: false,
    user: previewUser,
    pagination: false,
    where: { slug: { equals: slug } },
  })
  return result.docs?.[0] || null
})
