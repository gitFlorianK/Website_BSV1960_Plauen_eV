import React from 'react'
import { ExternalLinkIcon } from 'lucide-react'

import type { LinkListBlock as Props } from '@/payload-types'
import { SectionHeading } from '@/components/Section'
import { isSafeUrl } from '@/utilities/safeUrl'

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export const LinkListBlock: React.FC<Props> = ({ heading, intro, groups }) => (
  <section className="container">
    <SectionHeading title={heading} intro={intro} />
    <div className="grid gap-10 lg:grid-cols-2">
      {(groups ?? []).map((g, gi) => (
        <div key={g.id ?? gi}>
          <h3 className="mb-3 text-xl font-bold">{g.title}</h3>
          <ul className="divide-y divide-border rounded-xl border border-border bg-white">
            {(g.links ?? []).filter((l) => isSafeUrl(l.url)).map((l, li) => {
              const external = /^https?:/i.test(l.url)
              return (
                <li key={l.id ?? li}>
                  <a
                    href={l.url}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="group flex items-start justify-between gap-4 p-4 hover:bg-brand-soft"
                  >
                    <span>
                      <span className="font-semibold group-hover:underline">{l.label}</span>
                      {(l.description || (external && hostOf(l.url))) && (
                        <span className="block text-sm text-muted-foreground">{l.description || hostOf(l.url)}</span>
                      )}
                    </span>
                    {external && (
                      <>
                        <ExternalLinkIcon aria-hidden className="mt-1 size-4 shrink-0 text-brand-text" />
                        <span className="sr-only">(öffnet in neuem Tab)</span>
                      </>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  </section>
)
