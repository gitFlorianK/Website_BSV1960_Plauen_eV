import React from 'react'
import { MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { ContactInfoBlock as Props } from '@/payload-types'
import { SectionHeading } from '@/components/Section'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { osmLink } from '@/utilities/osm'
import { telHref } from '@/utilities/phone'

export const ContactInfoBlock: React.FC<Props> = async ({ heading, intro, showLocations }) => {
  const site = await getCachedGlobal('site-settings', 0)()
  const payload = await getPayload({ config: configPromise })
  const locations = showLocations
    ? (
        await payload.find({
          collection: 'locations',
          limit: 10,
          overrideAccess: false,
          pagination: false,
          sort: 'name',
        })
      ).docs
    : []
  const a = site?.address

  return (
    <section className="container">
      <SectionHeading title={heading} intro={intro} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border-2 border-brand bg-white p-6">
          <h3 className="mb-4 text-lg font-bold">Postanschrift</h3>
          <address className="not-italic leading-relaxed">
            {site?.clubName}
            <br />
            {a?.careOf && (
              <>
                z. Hd. {a.careOf}
                <br />
              </>
            )}
            {a?.street}
            <br />
            {a?.postalCode} {a?.city}
          </address>
          <ul className="mt-4 space-y-2">
            {site?.email && (
              <li className="flex items-center gap-2">
                <MailIcon aria-hidden className="size-4 text-brand-text" />
                <a className="font-medium text-brand-text underline underline-offset-2 hover:text-navy" href={`mailto:${site.email}`}>
                  {site.email}
                </a>
              </li>
            )}
            {site?.phone && (
              <li className="flex items-center gap-2">
                <PhoneIcon aria-hidden className="size-4 text-brand-text" />
                {telHref(site.phone) ? (
                  <a className="hover:underline" href={telHref(site.phone)!}>
                    {site.phone}
                  </a>
                ) : (
                  site.phone
                )}
              </li>
            )}
          </ul>
        </div>
        {locations.map((l) => (
          <div key={l.id} className="rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <MapPinIcon aria-hidden className="size-5 text-brand-text" /> {l.name}
            </h3>
            <p>
              {l.street}
              <br />
              {l.postalCode} {l.city}
            </p>
            {l.notes && <p className="mt-2 text-sm text-muted-foreground">{l.notes}</p>}
            <a
              className="mt-3 inline-block font-medium text-brand-text underline underline-offset-2 hover:text-navy"
              href={osmLink(l)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Karte öffnen (OpenStreetMap)<span className="sr-only">, öffnet in neuem Tab</span>
            </a>
          </div>
        ))}
      </div>
    </section>
  )
}
