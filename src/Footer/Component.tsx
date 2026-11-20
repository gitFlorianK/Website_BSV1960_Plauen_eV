import Link from 'next/link'
import React from 'react'
import { MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react'

import { CMSLink } from '@/components/Link'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { telHref } from '@/utilities/phone'

export async function Footer() {
  const [footer, site] = await Promise.all([
    getCachedGlobal('footer', 1)(),
    getCachedGlobal('site-settings', 0)(),
  ])
  const navItems = footer?.navItems ?? []
  const { address, register } = site ?? {}
  const phoneHref = site?.phone ? telHref(site.phone) : null

  return (
    <footer className="mt-auto bg-ink text-white">
      <div className="h-1 bg-brand" aria-hidden />
      <div className="container grid gap-10 py-12 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold">{site?.clubName}</p>
          <p className="mt-2 text-sm text-neutral-300">
            Bogensport in Plauen seit 1960 – Recurve, Compound, Langbogen und Jagdbogen.
          </p>
        </div>

        <address className="not-italic text-sm leading-relaxed text-neutral-200">
          <p className="mb-3 font-semibold text-white">Kontakt</p>
          {address?.street && (
            <p className="flex gap-2">
              <MapPinIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
              <span>
                {address.careOf && (
                  <>
                    z. Hd. {address.careOf}
                    <br />
                  </>
                )}
                {address.street}
                <br />
                {address.postalCode} {address.city}
              </span>
            </p>
          )}
          {site?.phone && phoneHref && (
            <p className="mt-2 flex gap-2">
              <PhoneIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
              <a className="hover:underline" href={phoneHref}>
                {site.phone}
              </a>
            </p>
          )}
          {site?.email && (
            <p className="mt-2 flex gap-2">
              <MailIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
              <a className="hover:underline" href={`mailto:${site.email}`}>
                {site.email}
              </a>
            </p>
          )}
        </address>

        <nav aria-label="Fußzeile">
          <p className="mb-3 text-sm font-semibold">Verein</p>
          <ul className="space-y-2 text-sm">
            {navItems.map(({ link }, i) => (
              <li key={i}>
                <CMSLink {...link} className="text-neutral-200 hover:text-white hover:underline" />
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="container flex flex-col gap-2 py-5 text-xs text-neutral-400 md:flex-row md:justify-between">
          <p>
            © {new Date().getFullYear()} {site?.clubName}
          </p>
          {register?.number && (
            <p>
              Eingetragen im Vereinsregister: {register.court}, {register.number}
            </p>
          )}
          <p>
            <Link className="hover:text-white hover:underline" href="/impressum">
              Impressum
            </Link>
            {' · '}
            <Link className="hover:text-white hover:underline" href="/datenschutz">
              Datenschutz
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
