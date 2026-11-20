import React from 'react'
import { UserIcon } from 'lucide-react'

import type { BoardMembersBlock as Props } from '@/payload-types'
import { Media } from '@/components/Media'
import { SectionHeading } from '@/components/Section'
import { getCachedGlobal } from '@/utilities/getGlobals'

export const BoardMembersBlock: React.FC<Props> = async ({ heading, intro }) => {
  const site = await getCachedGlobal('site-settings', 1)()
  const board = site?.board ?? []
  if (board.length === 0) return null

  return (
    <section className="container">
      <SectionHeading title={heading} intro={intro} />
      {/* Fotos liegen nur in ca. 240 × 300 px vor – Karten daher schmal halten */}
      <ul className="grid max-w-4xl grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
        {board.map((m, i) => {
          const photo = typeof m.photo === 'object' && m.photo?.visibility === 'public' ? m.photo : null
          return (
            <li key={m.id ?? i} className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
              <div className="relative aspect-[4/5] bg-muted">
                {photo ? (
                  <Media fill resource={photo} imgClassName="object-cover object-top" size="(min-width: 1024px) 280px, 50vw" />
                ) : (
                  <UserIcon aria-hidden className="absolute inset-0 m-auto size-20 text-muted-foreground/40" />
                )}
              </div>
              <div className="border-t-4 border-brand p-4 sm:p-5">
                <p className="text-lg font-bold">{m.name}</p>
                <p className="text-muted-foreground">{m.position}</p>
              </div>
            </li>
          )
        })}
      </ul>
      {site?.email && (
        <p className="mt-6">
          Du erreichst den Vorstand unter{' '}
          <a className="font-medium text-brand-text underline underline-offset-2 hover:text-navy" href={`mailto:${site.email}`}>
            {site.email}
          </a>
          .
        </p>
      )}
    </section>
  )
}
