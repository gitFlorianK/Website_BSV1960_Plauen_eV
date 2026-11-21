import configPromise from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'
import { ArrowLeftIcon } from 'lucide-react'

import { GalleryGrid } from '@/components/Gallery/Lightbox'
import { memberPageMeta } from '@/components/members/ui'
import { requireMember } from '@/lib/auth/session'
import { toLightboxImages } from '@/lib/galleries'
import { formatDate } from '@/utilities/dates'
import { routes } from '@/utilities/routes'

export const metadata: Metadata = memberPageMeta('Album')

type Args = { params: Promise<{ slug: string }> }

export default async function MembersGalleryPage({ params }: Args) {
  const slug = decodeURIComponent((await params).slug)
  const user = await requireMember(routes.membersGallery(slug))
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'galleries',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
    overrideAccess: false,
    user,
  })
  const gallery = docs[0]
  if (!gallery) notFound()
  const images = toLightboxImages(gallery.images, { members: true })

  return (
    <>
      <Link href={routes.membersGalleries} className="inline-flex items-center gap-1 text-sm font-medium text-brand-text hover:text-navy">
        <ArrowLeftIcon aria-hidden className="size-4" /> Alle Alben
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">{gallery.title}</h1>
      <p className="mt-2 text-muted-foreground">
        {formatDate(gallery.date)}, {images.length} Fotos
      </p>
      {gallery.description && <p className="mt-4 max-w-3xl text-lg">{gallery.description}</p>}
      <div className="mt-8">
        <GalleryGrid images={images} title={gallery.title} />
      </div>
    </>
  )
}
