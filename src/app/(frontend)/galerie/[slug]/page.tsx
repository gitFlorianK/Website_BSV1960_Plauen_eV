import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React, { cache } from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { ArrowLeftIcon } from 'lucide-react'

import { GalleryGrid } from '@/components/Gallery/Lightbox'
import { toLightboxImages } from '@/lib/galleries'
import { formatDate } from '@/utilities/dates'
import { mergeOpenGraph, SITE_NAME } from '@/utilities/mergeOpenGraph'
import { routes } from '@/utilities/routes'

export const revalidate = 600

type Args = { params: Promise<{ slug: string }> }

const findGallery = cache(async (slug: string) => {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'galleries',
    depth: 1,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    where: { slug: { equals: slug } },
  })
  return docs[0] ?? null
})

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'galleries',
    limit: 500,
    overrideAccess: false,
    pagination: false,
    select: { slug: true },
  })
  return docs.filter((d) => d.slug).map((d) => ({ slug: d.slug }))
}

export default async function GalleryPage({ params }: Args) {
  const gallery = await findGallery(decodeURIComponent((await params).slug))
  if (!gallery) notFound()
  const images = toLightboxImages(gallery.images)

  return (
    <article className="pb-16">
      <header className="border-b border-border bg-brand-soft">
        <div className="container py-10 md:py-14">
          <Link href={routes.galleries} className="inline-flex items-center gap-1 text-sm font-medium text-brand-text hover:text-navy">
            <ArrowLeftIcon aria-hidden className="size-4" /> Alle Alben
          </Link>
          <h1 className="mt-4 max-w-4xl text-3xl font-bold tracking-tight md:text-5xl">{gallery.title}</h1>
          {gallery.date && <p className="mt-2 text-muted-foreground">{formatDate(gallery.date)}</p>}
          {gallery.description && <p className="mt-4 max-w-3xl text-lg">{gallery.description}</p>}
        </div>
      </header>
      <div className="container mt-10">
        {images.length === 0 ? (
          <p className="rounded-lg bg-muted p-6 text-muted-foreground">In diesem Album sind noch keine öffentlichen Bilder.</p>
        ) : (
          <GalleryGrid images={images} title={gallery.title} />
        )}
      </div>
    </article>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const gallery = await findGallery(decodeURIComponent(slug))
  if (!gallery) return { title: SITE_NAME }
  const title = `${gallery.title} | Galerie | ${SITE_NAME}`
  return {
    title,
    description: gallery.description ?? undefined,
    alternates: { canonical: routes.gallery(slug) },
    openGraph: mergeOpenGraph({ title, url: routes.gallery(slug) }),
  }
}
