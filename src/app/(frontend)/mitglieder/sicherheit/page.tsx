import configPromise from '@payload-config'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import React from 'react'

import { TWO_FACTOR_ROLES } from '@/access'
import { MembersSection, MembersTitle, memberPageMeta } from '@/components/members/ui'
import { requireMember } from '@/lib/auth/session'
import { remainingRecoveryCodes } from '@/lib/auth/twoFactor'
import { formatDate, formatTime } from '@/utilities/dates'
import { routes } from '@/utilities/routes'

import { OtherDevicesForm, TwoFactorPanel } from './SecurityForms'

export const metadata: Metadata = memberPageMeta('Sicherheit')

type Args = { searchParams: Promise<{ einrichten?: string }> }

export default async function SecurityPage({ searchParams }: Args) {
  const user = await requireMember(routes.membersSecurity)
  const payload = await getPayload({ config: configPromise })
  const { einrichten } = await searchParams
  const sessions = ((user as { sessions?: { id: string }[] }).sessions ?? []).length
  const required = (user.roles ?? []).some((r) => TWO_FACTOR_ROLES.includes(r))

  return (
    <>
      <MembersTitle title="Sicherheit" />
      <div className="grid max-w-3xl gap-12">
        <MembersSection title="Zwei-Faktor-Anmeldung">
          <p className="mb-6">
            Mit der Zwei-Faktor-Anmeldung brauchst du beim Anmelden zusätzlich zum Passwort einen Code aus einer
            Authenticator-App auf deinem Handy (z. B. Aegis, FreeOTP, Google oder Microsoft Authenticator). Wer nur dein
            Passwort kennt, kommt so nicht in dein Konto.
            {required && ' Für Vorstand und Administratoren ist sie Pflicht.'}
          </p>
          <TwoFactorPanel
            enabled={Boolean(user.twoFactorEnabled)}
            required={required}
            remainingCodes={user.twoFactorEnabled ? await remainingRecoveryCodes(payload, user.id) : 0}
            autoStart={einrichten === '1' && !user.twoFactorEnabled}
          />
        </MembersSection>

        <MembersSection title="Angemeldete Geräte">
          <p className="mb-4">
            Du bist gerade auf {sessions === 1 ? 'einem Gerät' : `${sessions} Geräten`} angemeldet.
            {user.lastLoginAt && (
              <> Letzte Anmeldung: {formatDate(user.lastLoginAt)}, {formatTime(user.lastLoginAt)} Uhr.</>
            )}
          </p>
          <OtherDevicesForm disabled={sessions <= 1} />
        </MembersSection>
      </div>
    </>
  )
}
