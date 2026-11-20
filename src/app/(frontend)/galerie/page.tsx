import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { ImagesIcon } from 'lucide-react'

import { Media } from '@/components/Media'
import { LowImpactHero } from '@/heros/LowImpact'
import type { Media as MediaType } from '@/payload-types'
import { formatDate } from '@/utilities/dates'
import { mergeOpenGraph, SITE_NAME } from '@/utilities/mergeOpenGraph'
import { routes } from '@/utilities/routes'

export const revalidate = 600

const cover = (g: { coverImage?: number | MediaType | null; images?: (number | MediaType)[] | null }) => {
  const candidates = [g.coverImage, ...(g.images ?? [])]
  return (
    candidates.find((m): m is MediaType => typeof m === 'object' && m !== null && m.visibility === 'public') ?? null
  )
}

export default async function GalleriesPage() {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'galleries',
    depth: 1,
    limit: 200,
    overrideAccess: false,
    pagination: false,
    sort: '-date',
  })

  return (
    <div className="pb-16">
      <LowImpactHero>
        <h1>Galerie</h1>
        <p>Bilder von Turnieren, Meisterschaften und aus dem Vereinsleben.</p>
      </LowImpactHero>
      <div className="container mt-10">
        {docs.length === 0 ? (
          <p className="max-w-3xl rounded-lg border-l-4 border-brand bg-brand-soft p-6 text-lg">
            Unsere Fotoalben sind aus Rücksicht auf die abgebildeten Personen nur für Vereinsmitglieder sichtbar.
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((g) => {
              const img = cover(g)
              const count = (g.images ?? []).length
              return (
                <li key={g.id}>
                  <article className="group relative overflow-hidden rounded-xl border border-border bg-white shadow-sm hover:shadow-md focus-within:shadow-md">
                    <div className="relative aspect-[4/3] bg-muted">
                      {img ? (
                        <Media fill resource={img} imgClassName="object-cover" size="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
                      ) : (
                        <ImagesIcon aria-hidden className="absolute inset-0 m-auto size-12 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-muted-foreground">
                        {g.date && <time dateTime={g.date}>{formatDate(g.date)}</time>}
                        {count > 0 && ` · ${count} Bilder`}
                      </p>
                      <h2 className="mt-1 text-lg font-bold leading-snug">
                        <Link href={routes.gallery(g.slug)} className="after:absolute after:inset-0 after:content-[''] group-hover:underline">
                          {g.title}
                        </Link>
                      </h2>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  title: `Galerie | ${SITE_NAME}`,
  description: 'Fotos von Turnieren und aus dem Vereinsleben des BSV 1960 Plauen.',
  alternates: { canonical: routes.galleries },
  openGraph: mergeOpenGraph({ title: `Galerie | ${SITE_NAME}`, url: routes.galleries }),
}
