import type { Metadata } from 'next'
import React from 'react'

import { AuthShell } from '@/components/auth/AuthShell'
import { Notice } from '@/components/auth/Notice'

import { NewPasswordForm } from '../passwort-zuruecksetzen/NewPasswordForm'

export const metadata: Metadata = {
  title: 'Einladung annehmen | BSV 1960 Plauen',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

type Args = { searchParams: Promise<{ token?: string | string[] }> }

export default async function InvitePage({ searchParams }: Args) {
  const { token } = await searchParams
  return (
    <AuthShell
      title="Willkommen im Mitgliederbereich"
      intro="Lege dein Passwort fest. Danach meldest du dich mit deiner E-Mail-Adresse an."
    >
      {typeof token === 'string' && token ? (
        <NewPasswordForm token={token} submitLabel="Passwort festlegen" />
      ) : (
        <Notice tone="error">Der Einladungslink ist unvollständig. Öffne ihn direkt aus der E-Mail.</Notice>
      )}
    </AuthShell>
  )
}
