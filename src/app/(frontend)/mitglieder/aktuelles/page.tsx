import configPromise from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { EmptyState, MembersTitle, memberPageMeta } from '@/components/members/ui'
import { requireMember } from '@/lib/auth/session'
import { formatDate } from '@/utilities/dates'
import { routes } from '@/utilities/routes'

export const metadata: Metadata = memberPageMeta('Neuigkeiten')

export default async function MembersNewsPage() {
  const user = await requireMember(routes.membersNews)
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'posts',
    where: { visibility: { equals: 'members' } },
    sort: '-publishedAt',
    limit: 50,
    depth: 0,
    overrideAccess: false,
    user,
    select: { title: true, slug: true, publishedAt: true, meta: { description: true } },
  })

  return (
    <>
      <MembersTitle
        title="Neuigkeiten"
        intro={
          <>
            Interne Nachrichten aus dem Verein. Öffentliche Berichte und Ergebnisse findest du unter{' '}
            <Link href={routes.posts} className="font-medium text-brand-text underline underline-offset-2">
              Aktuelles
            </Link>
            .
          </>
        }
      />
      {docs.length === 0 ? (
        <EmptyState>Noch keine internen Neuigkeiten.</EmptyState>
      ) : (
        <ul className="max-w-3xl divide-y divide-border border-y border-border">
          {docs.map((p) => (
            <li key={p.id} className="py-5">
              {p.publishedAt && <p className="text-sm text-muted-foreground">{formatDate(p.publishedAt)}</p>}
              <h2 className="text-xl font-semibold">
                <Link href={routes.membersPost(p.slug)} className="hover:text-navy hover:underline">
                  {p.title}
                </Link>
              </h2>
              {p.meta?.description && <p className="mt-1 text-muted-foreground">{p.meta.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
