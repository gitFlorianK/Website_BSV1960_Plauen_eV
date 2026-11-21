import Link from 'next/link'
import React from 'react'

import { calendarSheet } from '@/utilities/dates'
import { cn } from '@/utilities/ui'

/** Seitentitel im Mitgliederbereich. */
export function MembersTitle({ title, intro }: { title: string; intro?: React.ReactNode }) {
  return (
    <div className="mb-8 max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      {intro && <p className="mt-3 text-lg text-muted-foreground">{intro}</p>}
    </div>
  )
}

/** Abschnitt mit Überschrift und optionalem Link „alle …“. */
export function MembersSection({
  title,
  more,
  children,
  className,
}: {
  title: string
  more?: { href: string; label: string }
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b-2 border-navy pb-2">
        <h2 className="text-xl font-bold">{title}</h2>
        {more && (
          <Link href={more.href} className="text-sm font-medium text-brand-text underline underline-offset-2 hover:text-navy">
            {more.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/** Kompaktes Kalenderblatt (Tag + Monat) für Terminlisten. */
export function DateSheet({ date, className }: { date: string; className?: string }) {
  const { day, month } = calendarSheet(date)
  return (
    <div
      className={cn('flex w-14 shrink-0 flex-col items-center self-start overflow-hidden rounded-md border border-navy/20 text-center', className)}
      aria-hidden
    >
      <span className="w-full bg-navy py-0.5 text-xs font-semibold text-white">{month}</span>
      <span className="py-1 text-xl font-bold tabular-nums">{day}</span>
    </div>
  )
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-muted px-4 py-5 text-muted-foreground">{children}</p>
}

export const memberPageMeta = (title: string) => ({
  title: `${title} | Mitgliederbereich BSV 1960 Plauen`,
  robots: { index: false, follow: false },
})
