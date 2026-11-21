import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { AuthShell } from '@/components/auth/AuthShell'
import { Notice } from '@/components/auth/Notice'
import { routes } from '@/utilities/routes'

import { NewPasswordForm } from './NewPasswordForm'

export const metadata: Metadata = {
  title: 'Neues Passwort | BSV 1960 Plauen',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

type Args = { searchParams: Promise<{ token?: string | string[] }> }

export default async function ResetPasswordPage({ searchParams }: Args) {
  const { token } = await searchParams
  return (
    <AuthShell title="Neues Passwort festlegen">
      {typeof token === 'string' && token ? (
        <NewPasswordForm token={token} submitLabel="Passwort speichern" />
      ) : (
        <Notice tone="error">
          Der Link ist unvollständig. Öffne ihn direkt aus der E-Mail oder{' '}
          <Link href={routes.forgotPassword} className="font-medium underline underline-offset-2">
            fordere einen neuen an
          </Link>
          .
        </Notice>
      )}
    </AuthShell>
  )
}
