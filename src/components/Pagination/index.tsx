import Link from 'next/link'
import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { cn } from '@/utilities/ui'

/** Seitennavigation mit echten Links (funktioniert ohne JavaScript, crawlbar). */
export const Pagination: React.FC<{
  className?: string
  page: number
  totalPages: number
  hrefFor: (page: number) => string
}> = ({ className, page, totalPages, hrefFor }) => {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  )
  const item = 'inline-flex h-10 min-w-10 items-center justify-center rounded-md px-3 font-medium'

  return (
    <nav aria-label="Seitennavigation" className={cn('container my-12', className)}>
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          {page > 1 ? (
            <Link className={cn(item, 'hover:bg-muted')} href={hrefFor(page - 1)} rel="prev">
              <ChevronLeftIcon aria-hidden className="size-4" /> Zurück
            </Link>
          ) : (
            <span className={cn(item, 'text-muted-foreground/60')} aria-hidden>
              <ChevronLeftIcon className="size-4" /> Zurück
            </span>
          )}
        </li>
        {pages.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && p - pages[i - 1]! > 1 && (
              <li aria-hidden className="px-1 text-muted-foreground">
                …
              </li>
            )}
            <li>
              <Link
                href={hrefFor(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Seite ${p}`}
                className={cn(item, p === page ? 'bg-ink text-white' : 'hover:bg-muted')}
              >
                {p}
              </Link>
            </li>
          </React.Fragment>
        ))}
        <li>
          {page < totalPages ? (
            <Link className={cn(item, 'hover:bg-muted')} href={hrefFor(page + 1)} rel="next">
              Weiter <ChevronRightIcon aria-hidden className="size-4" />
            </Link>
          ) : (
            <span className={cn(item, 'text-muted-foreground/60')} aria-hidden>
              Weiter <ChevronRightIcon className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  )
}
