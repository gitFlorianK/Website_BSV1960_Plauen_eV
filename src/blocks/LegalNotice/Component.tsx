import React from 'react'

import type { LegalNoticeBlock as Props } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'

export const LegalNoticeBlock: React.FC<Props> = async ({ variant }) => {
  const site = await getCachedGlobal('site-settings', 0)()
  if (!site) return null
  const { address, register } = site
  const reps = (site.board ?? []).filter((m) => m.representative)

  const addressLines = (
    <>
      {site.clubName}
      <br />
      {address?.careOf && (
        <>
          z. Hd. {address.careOf}
          <br />
        </>
      )}
      {address?.street}
      <br />
      {address?.postalCode} {address?.city}
    </>
  )

  if (variant === 'controller') {
    return (
      <section className="container prose md:prose-md">
        <h2>Verantwortlicher</h2>
        <p>{addressLines}</p>
        <p>
          {site.email && <>E-Mail: <a href={`mailto:${site.email}`}>{site.email}</a><br /></>}
          {site.phone && <>Telefon: {site.phone}</>}
        </p>
        {reps.length > 0 && (
          <p>Vertreten durch den Vorstand nach § 26 BGB: {reps.map((r) => `${r.name} (${r.position})`).join(', ')}</p>
        )}
        {site.privacyContact?.name && (
          <>
            <h3>Ansprechpartner für den Datenschutz</h3>
            <p>
              {site.privacyContact.name}
              {site.privacyContact.email && (
                <>
                  <br />
                  E-Mail: <a href={`mailto:${site.privacyContact.email}`}>{site.privacyContact.email}</a>
                </>
              )}
            </p>
          </>
        )}
      </section>
    )
  }

  return (
    <section className="container prose md:prose-md">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>{addressLines}</p>
      {reps.length > 0 && (
        <>
          <h3>Vertreten durch den Vorstand nach § 26 BGB</h3>
          <ul>
            {reps.map((r, i) => (
              <li key={r.id ?? i}>
                {r.name} ({r.position})
              </li>
            ))}
          </ul>
        </>
      )}
      <h3>Kontakt</h3>
      <p>
        {site.phone && <>Telefon: {site.phone}<br /></>}
        {site.email && <>E-Mail: <a href={`mailto:${site.email}`}>{site.email}</a></>}
      </p>
      {register?.number && (
        <>
          <h3>Registereintrag</h3>
          <p>
            Eintragung im Vereinsregister
            <br />
            Registergericht: {register.court}
            <br />
            Registernummer: {register.number}
          </p>
        </>
      )}
    </section>
  )
}
