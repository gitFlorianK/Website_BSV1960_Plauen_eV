'use client'

import Link from 'next/link'
import React, { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { confirmCourseAction } from '@/lib/forms/actions'
import { routes } from '@/utilities/routes'

export function ConfirmForm({ token }: { token: string }) {
  const [result, action, pending] = useActionState(confirmCourseAction, null)

  if (!token) {
    return <Notice tone="error">Der Bestätigungslink ist unvollständig. Bitte öffne ihn direkt aus der E-Mail.</Notice>
  }

  if (result?.ok) {
    return (
      <Notice tone="success">
        {result.status === 'registered' ? (
          <>
            Danke! Die Anmeldung zum Kurs „{result.courseTitle}“ ist bestätigt und ein Platz ist reserviert. Du bekommst
            gleich eine E-Mail mit allen Infos.
          </>
        ) : (
          <>
            Danke für die Bestätigung! Der Kurs „{result.courseTitle}“ ist leider schon voll – die Anmeldung steht auf
            der Warteliste. Wird ein Platz frei, melden wir uns.
          </>
        )}
      </Notice>
    )
  }

  if (result && !result.ok) {
    return (
      <Notice tone="error">
        {result.reason === 'expired'
          ? 'Der Bestätigungslink ist abgelaufen. Bitte melde dich einfach noch einmal an.'
          : 'Dieser Link ist ungültig oder wurde bereits verwendet.'}{' '}
        <Link href={routes.courseRegistration} className="font-medium underline underline-offset-2">
          Zur Kursanmeldung
        </Link>
      </Notice>
    )
  }

  return (
    <form action={action} className="grid gap-6">
      <p className="text-lg">Bitte bestätige mit einem Klick, dass du die Anmeldung zum Anfängerkurs abschicken möchtest.</p>
      <input type="hidden" name="token" value={token} />
      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Wird bestätigt …' : 'Anmeldung jetzt bestätigen'}
        </Button>
      </div>
    </form>
  )
}

function Notice({ tone, children }: { tone: 'success' | 'error'; children: React.ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={
        tone === 'success'
          ? 'rounded-lg border-l-4 border-green-700 bg-success p-6 text-lg'
          : 'rounded-lg border-l-4 border-destructive bg-error p-6 text-lg'
      }
    >
      {children}
    </div>
  )
}
