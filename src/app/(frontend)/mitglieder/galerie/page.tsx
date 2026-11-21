import configPromise from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { EmptyState, MembersTitle, memberPageMeta } from '@/components/members/ui'
import { requireMember } from '@/lib/auth/session'
import type { Media } from '@/payload-types'
import { formatDate } from '@/utilities/dates'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { routes } from '@/utilities/routes'

export const metadata: Metadata = memberPageMeta('Fotos')

const cover = (m: number | Media | null | undefined) =>
  typeof m === 'object' && m?.url ? getMediaUrl(m.sizes?.small?.url || m.url, m.updatedAt) : null

export default async function MembersGalleriesPage() {
  const user = await requireMember(routes.membersGalleries)
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'galleries',
    sort: '-date',
    limit: 100,
    depth: 1,
    overrideAccess: false,
    user,
    select: { title: true, slug: true, date: true, coverImage: true, images: true, visibility: true },
  })

  return (
    <>
      <MembersTitle
        title="Fotos"
        intro="Alle Alben des Vereins, auch die nur für Mitglieder. Bitte gib interne Fotos nicht weiter – nicht alle Abgebildeten haben einer Veröffentlichung zugestimmt."
      />
      {docs.length === 0 ? (
        <EmptyState>Noch keine Alben.</EmptyState>
      ) : (
        <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((g) => {
            const src = cover(g.coverImage) ?? cover(g.images?.[0])
            return (
              <li key={g.id}>
                <Link href={routes.membersGallery(g.slug)} className="group block">
                  <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                    {src && (
                      // Interne Bilder bewusst ohne Bildoptimierer (der lädt ohne Login-Cookie)
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    )}
                  </div>
                  <p className="mt-3 font-semibold group-hover:text-navy group-hover:underline">{g.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(g.date)}, {g.images?.length ?? 0} Fotos
                    {g.visibility === 'members' ? ', intern' : ''}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
