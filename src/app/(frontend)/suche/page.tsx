import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { SearchIcon } from 'lucide-react'

import { LowImpactHero } from '@/heros/LowImpact'
import { eventWhen } from '@/lib/events'
import { formatDate } from '@/utilities/dates'
import { SITE_NAME } from '@/utilities/mergeOpenGraph'
import { routes } from '@/utilities/routes'

type Args = { searchParams: Promise<{ q?: string | string[] }> }

type Hit = { key: string; href: string; title: string; kind: string; meta?: string | null; text?: string | null }

const search = async (q: string): Promise<Hit[]> => {
  const payload = await getPayload({ config: configPromise })
  const common = { depth: 0, limit: 20, overrideAccess: false, pagination: false } as const
  const [posts, pages, events] = await Promise.all([
    payload.find({
      ...common,
      collection: 'posts',
      sort: '-publishedAt',
      select: { title: true, slug: true, publishedAt: true, meta: { description: true } },
      where: { or: [{ title: { like: q } }, { 'meta.description': { like: q } }] },
    }),
    payload.find({
      ...common,
      collection: 'pages',
      select: { title: true, slug: true, meta: { description: true } },
      where: { or: [{ title: { like: q } }, { 'meta.description': { like: q } }] },
    }),
    payload.find({
      ...common,
      collection: 'events',
      sort: '-startDate',
      select: { title: true, slug: true, startDate: true, endDate: true, allDay: true },
      where: { or: [{ title: { like: q } }, { locationText: { like: q } }] },
    }),
  ])
  return [
    ...pages.docs.map((p) => ({
      key: `page-${p.id}`,
      href: routes.page(p.slug ?? ''),
      title: p.title,
      kind: 'Seite',
      text: p.meta?.description,
    })),
    ...posts.docs.map((p) => ({
      key: `post-${p.id}`,
      href: routes.post(p.slug),
      title: p.title,
      kind: 'Beitrag',
      meta: p.publishedAt ? formatDate(p.publishedAt) : null,
      text: p.meta?.description,
    })),
    ...events.docs.map((e) => ({
      key: `event-${e.id}`,
      href: routes.event(e.slug),
      title: e.title,
      kind: 'Termin',
      meta: eventWhen(e),
    })),
  ]
}

export default async function SearchPage({ searchParams }: Args) {
  const raw = (await searchParams).q
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 100) ?? ''
  const hits = q.length >= 2 ? await search(q) : []

  return (
    <div className="pb-16">
      <LowImpactHero>
        <h1>Suche</h1>
      </LowImpactHero>
      <div className="container mt-10 max-w-3xl">
        <form role="search" action={routes.search} method="get" className="flex gap-2">
          <label htmlFor="q" className="sr-only">
            Suchbegriff
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            minLength={2}
            maxLength={100}
            required
            placeholder="z. B. Anfängerkurs, Hallenturnier …"
            className="h-12 min-w-0 flex-1 rounded-md border-2 border-input bg-white px-4 text-base focus-visible:border-navy"
          />
          <button type="submit" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-md bg-brand px-5 font-semibold text-primary-foreground hover:bg-brand-hover">
            <SearchIcon aria-hidden className="size-5" /> Suchen
          </button>
        </form>

        {q.length >= 2 && (
          <section aria-live="polite" className="mt-10">
            <h2 className="mb-4 text-lg font-semibold">
              {hits.length === 0 ? `Keine Treffer für „${q}“` : `${hits.length} Treffer für „${q}“`}
            </h2>
            <ul className="divide-y divide-border rounded-xl border border-border bg-white">
              {hits.map((h) => (
                <li key={h.key} className="relative p-5 hover:bg-brand-soft">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-text">
                    {h.kind}
                    {h.meta && ` · ${h.meta}`}
                  </p>
                  <Link href={h.href} className="mt-1 block text-lg font-semibold after:absolute after:inset-0 after:content-[''] hover:underline">
                    {h.title}
                  </Link>
                  {h.text && <p className="mt-1 line-clamp-2 text-muted-foreground">{h.text}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  title: `Suche | ${SITE_NAME}`,
  robots: { index: false, follow: true },
}
