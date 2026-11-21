import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import React from 'react'

import { AuthShell } from '@/components/auth/AuthShell'
import { Notice } from '@/components/auth/Notice'
import { getSessionUser, safeReturnPath } from '@/lib/auth/session'
import { routes } from '@/utilities/routes'

import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Anmelden | BSV 1960 Plauen',
  robots: { index: false, follow: false },
}

type Args = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function LoginPage({ searchParams }: Args) {
  const params = await searchParams
  const returnTo = safeReturnPath(params.redirect, routes.members)
  if (await getSessionUser()) redirect(returnTo)

  return (
    <AuthShell
      title="Anmelden"
      intro="Für Vereinsmitglieder, Trainer und Vorstand."
      footer={
        <p className="text-muted-foreground">
          Noch kein Zugang? Den Mitgliederbereich gibt es nur auf Einladung – sprich den Vorstand an oder schreib uns über die{' '}
          <Link href={routes.contact} className="font-medium text-brand-text underline underline-offset-2">
            Kontaktseite
          </Link>
          .
        </p>
      }
    >
      {params.abgemeldet && (
        <Notice tone="success" className="mb-6">
          Du bist abgemeldet.
        </Notice>
      )}
      {params.passwort === 'neu' && (
        <Notice tone="success" className="mb-6">
          Dein Passwort ist gespeichert. Melde dich jetzt damit an.
        </Notice>
      )}
      <LoginForm returnTo={returnTo} />
    </AuthShell>
  )
}
