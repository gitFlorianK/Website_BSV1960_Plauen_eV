import Link from 'next/link'
import React from 'react'
import { LockIcon } from 'lucide-react'

import type { Media as MediaType, Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { formatDate } from '@/utilities/dates'
import { routes } from '@/utilities/routes'
import { publicMedia } from '@/utilities/publicMedia'
import { cn } from '@/utilities/ui'

export type CardPostData = Pick<Post, 'slug' | 'categories' | 'meta' | 'title'> &
  Partial<Pick<Post, 'publishedAt' | 'heroImage' | 'visibility'>>

const publicImage = (doc: CardPostData): MediaType | null => {
  for (const img of [doc.meta?.image, doc.heroImage]) {
    const pub = publicMedia(img)
    if (pub) return pub
  }
  return null
}

/** Beitragskarte; die ganze Karte ist über einen gestreckten Link klickbar (ohne Client-JS). */
export const Card: React.FC<{
  className?: string
  doc: CardPostData
  showCategories?: boolean
  headingLevel?: 'h2' | 'h3'
}> = ({ className, doc, showCategories = true, headingLevel: H = 'h3' }) => {
  const image = publicImage(doc)
  const categories = (doc.categories ?? []).filter(
    (c): c is Exclude<typeof c, number | string> => typeof c === 'object' && c !== null,
  )
  const description = doc.meta?.description?.replace(/\s/g, ' ')

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md',
        className,
      )}
    >
      <div className="relative aspect-[16/9] bg-muted">
        {image ? (
          <Media fill resource={image} imgClassName="object-cover" size="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
        ) : (
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--brand)_0_12%,var(--brand-soft)_12%_24%,transparent_24%)] opacity-60" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="flex flex-wrap items-center gap-x-2 text-xs font-semibold uppercase tracking-wide text-brand-text">
          {doc.publishedAt && <time dateTime={doc.publishedAt}>{formatDate(doc.publishedAt)}</time>}
          {showCategories && categories.length > 0 && <span>· {categories.map((c) => c.title).join(', ')}</span>}
          {doc.visibility === 'members' && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              · <LockIcon aria-hidden className="size-3" /> Mitglieder
            </span>
          )}
        </p>
        <H className="mt-1 text-lg font-bold leading-snug">
          <Link href={routes.post(doc.slug)} className="after:absolute after:inset-0 after:content-[''] group-hover:underline">
            {doc.title}
          </Link>
        </H>
        {description && <p className="mt-2 line-clamp-3 text-muted-foreground">{description}</p>}
      </div>
    </article>
  )
}
