import configPromise from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'
import { ArrowLeftIcon } from 'lucide-react'

import RichText from '@/components/RichText'
import { memberPageMeta } from '@/components/members/ui'
import { requireMember } from '@/lib/auth/session'
import { formatDate } from '@/utilities/dates'
import { routes } from '@/utilities/routes'

export const metadata: Metadata = memberPageMeta('Neuigkeit')

type Args = { params: Promise<{ slug: string }> }

export default async function MembersPostPage({ params }: Args) {
  const slug = decodeURIComponent((await params).slug)
  const user = await requireMember(routes.membersPost(slug))
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
    overrideAccess: false,
    user,
  })
  const post = docs[0]
  if (!post) notFound()
  // Öffentliche Beiträge haben ihre eigene, statische Seite
  const publicLink = post.visibility === 'public' ? routes.post(post.slug) : null

  return (
    <article className="max-w-3xl">
      <Link href={routes.membersNews} className="inline-flex items-center gap-1 text-sm font-medium text-brand-text hover:text-navy">
        <ArrowLeftIcon aria-hidden className="size-4" /> Alle Neuigkeiten
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">{post.title}</h1>
      <p className="mt-2 text-muted-foreground">
        {post.publishedAt && formatDate(post.publishedAt)}
        {post.visibility === 'members' && <> – nur für Mitglieder</>}
      </p>
      {publicLink && (
        <p className="mt-2">
          <Link href={publicLink} className="text-brand-text underline">
            Öffentliche Ansicht
          </Link>
        </p>
      )}
      <RichText data={post.content} enableGutter={false} className="mt-8" />
    </article>
  )
}
