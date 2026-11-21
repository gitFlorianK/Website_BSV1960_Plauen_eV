import React from 'react'

import { RETENTION } from '@/lib/retention'
import type { LegalNoticeBlock as Props } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'

const months = (n: number) => (n === 1 ? '1 Monat' : `${n} Monate`)

/** Speicherdauer je Datenart – direkt aus der Konfiguration der Lösch-Jobs. */
function RetentionTable() {
  const rows: [string, string][] = [
    [
      'Server-Logdateien (IP-Adresse, Zeitpunkt, aufgerufene Seite)',
      `${RETENTION.serverLogDays} Tage`,
    ],
    [
      'Zähler zur Missbrauchsabwehr (nur gehashte IP- bzw. E-Mail-Adresse)',
      `höchstens ${RETENTION.rateLimitHours} Stunden`,
    ],
    ['Kontaktanfragen', `${months(RETENTION.contactRequestMonths)} nach Eingang`],
    [
      'Kursanmeldungen ohne Bestätigung des E-Mail-Links',
      `${RETENTION.unconfirmedCourseRegistrationHours} Stunden`,
    ],
    [
      'Kursanmeldungen',
      `${months(RETENTION.courseRegistrationMonthsAfterCourse)} nach dem letzten Kurstermin`,
    ],
    [
      'Abgelehnte Mitgliedsanträge',
      `${months(RETENTION.rejectedApplicationMonths)} nach der letzten Bearbeitung`,
    ],
    [
      'Angenommene Mitgliedsanträge und Mitgliedskonten',
      'bis zum Ende der Mitgliedschaft (Löschung durch den Vorstand)',
    ],
    [
      'Anmeldungen von Mitgliedern zu Turnieren und Terminen',
      `${months(RETENTION.eventRegistrationMonthsAfterEvent)} nach dem Termin`,
    ],
    ['Sicherheitsprotokoll (Anmeldungen, Kontoänderungen)', `${months(RETENTION.auditLogMonths)}`],
    [
      'Datensicherungen (Backups)',
      `${RETENTION.backupDays} Tage (danach sind gelöschte Daten auch dort entfernt)`,
    ],
  ]
  return (
    <section className="container">
      <div className="prose md:prose-md max-w-3xl">
        <h2>Speicherdauer</h2>
        <p>
          Wir löschen personenbezogene Daten, sobald sie für den Zweck nicht mehr nötig sind. Die
          folgenden Fristen setzt die Website automatisch um (stündliche Prüfung):
        </p>
        <table>
          <thead>
            <tr>
              <th scope="col">Daten</th>
              <th scope="col">Speicherdauer</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([what, when]) => (
              <tr key={what}>
                <td>{what}</td>
                <td>{when}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Gesetzliche Aufbewahrungspflichten (z. B. für Beitragsunterlagen nach Steuer- und
          Handelsrecht) bleiben unberührt.
        </p>
      </div>
    </section>
  )
}

export const LegalNoticeBlock: React.FC<Props> = async ({ variant }) => {
  if (variant === 'retention') return <RetentionTable />
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
          {site.email && (
            <>
              E-Mail: <a href={`mailto:${site.email}`}>{site.email}</a>
              <br />
            </>
          )}
          {site.phone && <>Telefon: {site.phone}</>}
        </p>
        {reps.length > 0 && (
          <p>
            Vertreten durch den Vorstand nach § 26 BGB:{' '}
            {reps.map((r) => `${r.name} (${r.position})`).join(', ')}
          </p>
        )}
        {site.privacyContact?.name && (
          <>
            <h3>Ansprechpartner für den Datenschutz</h3>
            <p>
              {site.privacyContact.name}
              {site.privacyContact.email && (
                <>
                  <br />
                  E-Mail:{' '}
                  <a href={`mailto:${site.privacyContact.email}`}>{site.privacyContact.email}</a>
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
        {site.phone && (
          <>
            Telefon: {site.phone}
            <br />
          </>
        )}
        {site.email && (
          <>
            E-Mail: <a href={`mailto:${site.email}`}>{site.email}</a>
          </>
        )}
      </p>
      {site.editorialResponsible?.name && (
        <>
          <h3>Verantwortlich für redaktionelle Inhalte nach § 18 Abs. 2 MStV</h3>
          <p>
            {site.editorialResponsible.name}
            <br />
            {address?.street}
            <br />
            {address?.postalCode} {address?.city}
          </p>
        </>
      )}
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
