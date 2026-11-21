'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useId, useState } from 'react'
import { MenuIcon, UserRoundIcon, XIcon } from 'lucide-react'

import type { Header } from '@/payload-types'

import { Logo } from '@/components/Logo'
import { cn } from '@/utilities/ui'
import { docPath, routes } from '@/utilities/routes'

type NavLink = { href: string; label: string; newTab: boolean }

const toNavLinks = (data: Header): NavLink[] =>
  (data?.navItems ?? [])
    .map(({ link }) => {
      const ref = link.reference
      const href =
        link.type === 'reference' && ref && typeof ref.value === 'object' && ref.value.slug
          ? docPath(ref.relationTo, ref.value.slug)
          : link.url
      return href ? { href, label: link.label, newTab: Boolean(link.newTab) } : null
    })
    .filter((l): l is NavLink => l !== null)

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

export const HeaderClient: React.FC<{ data: Header }> = ({ data }) => {
  const pathname = usePathname()
  const links = toNavLinks(data)

  return (
    <header className="sticky top-0 z-30 border-b-4 border-brand bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <a
        href="#inhalt"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Zum Inhalt springen
      </a>
      <div className="container flex items-center justify-between gap-6 py-3">
        <Link href="/" aria-label="Startseite BSV 1960 Plauen" className="shrink-0">
          <Logo priority />
        </Link>

        <nav aria-label="Hauptnavigation" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <NavItem link={l} active={isActive(pathname, l.href)} />
              </li>
            ))}
          </ul>
        </nav>

        <MembersLink active={isActive(pathname, routes.members)} className="hidden lg:inline-flex" />

        {/* key: Menü schließt sich bei Seitenwechsel automatisch */}
        <MobileMenu key={pathname} links={links} pathname={pathname} />
      </div>
    </header>
  )
}

const NavItem: React.FC<{ link: NavLink; active: boolean; mobile?: boolean }> = ({
  link,
  active,
  mobile,
}) => (
  <Link
    href={link.href}
    {...(link.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    aria-current={active ? 'page' : undefined}
    className={cn(
      'block rounded-md font-medium transition-colors',
      mobile ? 'px-4 py-3 text-lg' : 'px-3 py-2 text-[0.95rem]',
      active
        ? 'bg-brand-soft text-ink underline decoration-brand decoration-[3px] underline-offset-[6px]'
        : 'text-foreground hover:bg-muted hover:text-ink',
    )}
  >
    {link.label}
  </Link>
)

/**
 * Statischer Link (kein Login-Status im Header: öffentliche Seiten sind ISR und lesen keine Cookies).
 * /mitglieder leitet Nicht-Angemeldete zur Anmeldung weiter.
 */
const MembersLink: React.FC<{ active: boolean; className?: string }> = ({ active, className }) => (
  <Link
    href={routes.members}
    aria-current={active ? 'page' : undefined}
    className={cn(
      'items-center gap-2 rounded-md border-2 border-navy px-3 py-1.5 font-semibold text-navy transition-colors hover:bg-navy hover:text-white',
      active && 'bg-navy text-white',
      className,
    )}
  >
    <UserRoundIcon aria-hidden className="size-4" />
    Mitgliederbereich
  </Link>
)

const MobileMenu: React.FC<{ links: NavLink[]; pathname: string }> = ({ links, pathname }) => {
  const [open, setOpen] = useState(false)
  const menuId = useId()

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-md border-2 border-ink px-3 py-2 font-semibold text-ink"
      >
        {open ? <XIcon aria-hidden className="size-5" /> : <MenuIcon aria-hidden className="size-5" />}
        Menü
      </button>
      <nav
        id={menuId}
        aria-label="Hauptnavigation (mobil)"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b-4 border-brand bg-white shadow-lg"
      >
        <ul className="container flex flex-col py-3">
          {links.map((l) => (
            <li key={l.href}>
              <NavItem link={l} active={isActive(pathname, l.href)} mobile />
            </li>
          ))}
          <li className="mt-2 border-t border-border pt-3">
            <MembersLink active={isActive(pathname, routes.members)} className="flex px-4 py-3 text-lg" />
          </li>
        </ul>
      </nav>
    </div>
  )
}
