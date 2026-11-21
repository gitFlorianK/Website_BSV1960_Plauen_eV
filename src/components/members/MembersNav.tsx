'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import { routes } from '@/utilities/routes'
import { cn } from '@/utilities/ui'

const ITEMS = [
  { href: routes.members, label: 'Übersicht', exact: true },
  { href: routes.membersEvents, label: 'Termine' },
  { href: routes.membersNews, label: 'Neuigkeiten' },
  { href: routes.membersGalleries, label: 'Fotos' },
  { href: routes.membersDocuments, label: 'Dokumente' },
  { href: routes.membersProfile, label: 'Profil' },
  { href: routes.membersSecurity, label: 'Sicherheit' },
]

/** Reiter des Mitgliederbereichs; auf schmalen Bildschirmen horizontal scrollbar. */
export function MembersNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Mitgliederbereich" className="-mb-px overflow-x-auto">
      <ul className="flex min-w-max gap-1">
        {ITEMS.map(({ href, label, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block rounded-t-lg px-4 py-3 text-[0.95rem] font-medium transition-colors',
                  active ? 'bg-white text-navy' : 'text-white/85 hover:bg-white/10 hover:text-white',
                )}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
