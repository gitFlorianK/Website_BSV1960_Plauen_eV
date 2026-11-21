import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { AuthShell } from '@/components/auth/AuthShell'
import { routes } from '@/utilities/routes'

import { ForgotForm } from './ForgotForm'

export const metadata: Metadata = {
  title: 'Passwort vergessen | BSV 1960 Plauen',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Passwort vergessen"
      intro="Gib die E-Mail-Adresse deines Kontos ein. Wir schicken dir einen Link, mit dem du ein neues Passwort festlegst."
      footer={
        <Link href={routes.login} className="font-medium text-brand-text underline underline-offset-2">
          Zurück zur Anmeldung
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  )
}
