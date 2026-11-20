import React from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { SponsorListBlock as Props } from '@/payload-types'
import { Media } from '@/components/Media'
import { SectionHeading } from '@/components/Section'
import { isSafeUrl } from '@/utilities/safeUrl'

export const SponsorListBlock: React.FC<Props> = async ({ heading, intro }) => {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'sponsors',
    depth: 1,
    limit: 100,
    overrideAccess: false,
    pagination: false,
    sort: ['sortOrder', 'name'],
    where: { active: { equals: true } },
  })
  if (docs.length === 0) return null

  return (
    <section className="container">
      <SectionHeading title={heading} intro={intro} />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((s) => {
          const logo = typeof s.logo === 'object' && s.logo?.visibility === 'public' ? s.logo : null
          const content = (
            <>
              {logo ? (
                <div className="relative flex h-28 items-center justify-center">
                  <Media resource={logo} imgClassName="max-h-28 w-auto object-contain" size="300px" />
                </div>
              ) : (
                <div className="flex h-28 items-center justify-center rounded-lg bg-muted px-4 text-center text-lg font-bold text-ink">
                  {s.name}
                </div>
              )}
              <p className="mt-4 font-semibold">{s.name}</p>
              {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
            </>
          )
          return (
            <li key={s.id} className="rounded-xl border border-border bg-white p-6 shadow-sm">
              {s.url && isSafeUrl(s.url) ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="block hover:[&_p:first-of-type]:underline">
                  {content}
                  <span className="sr-only"> (Website, öffnet in neuem Tab)</span>
                </a>
              ) : (
                content
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
