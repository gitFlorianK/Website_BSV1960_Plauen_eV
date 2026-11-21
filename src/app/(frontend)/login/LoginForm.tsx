'use client'

import Link from 'next/link'
import React, { useActionState, useRef, useState } from 'react'

import { Notice } from '@/components/auth/Notice'
import { PasswordField } from '@/components/auth/PasswordField'
import { TextField } from '@/components/forms/Fields'
import { Button } from '@/components/ui/button'
import { loginAction, type LoginState } from '@/lib/auth/actions'
import { routes } from '@/utilities/routes'

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { step: 'password' })
  // E-Mail/Passwort bleiben im Browser (für den zweiten Schritt) – der Server schickt sie nie zurück
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [backToPassword, setBackToPassword] = useState(false)
  const [prevState, setPrevState] = useState(state)
  if (prevState !== state) {
    // Neue Server-Antwort: deren Schritt gilt wieder
    setPrevState(state)
    setBackToPassword(false)
  }
  const formRef = useRef<HTMLFormElement>(null)

  const step = backToPassword ? 'password' : state.step

  // Passwortfeld ist unkontrolliert (PasswordField); Wert beim Absenden merken
  const rememberPassword = () => {
    const el = formRef.current?.elements.namedItem('password')
    if (el instanceof HTMLInputElement) setPassword(el.value)
  }

  return (
    <form ref={formRef} action={action} onSubmit={rememberPassword} className="grid gap-5">
      <input type="hidden" name="redirect" value={returnTo} />
      {state.error && <Notice tone="error">{state.error}</Notice>}

      {step === 'password' ? (
        <>
          <TextField
            name="email"
            label="E-Mail-Adresse"
            type="email"
            required
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <PasswordField name="password" label="Passwort" autoComplete="current-password" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? 'Wird geprüft …' : 'Anmelden'}
            </Button>
            <Link href={routes.forgotPassword} className="text-sm font-medium text-brand-text underline underline-offset-2">
              Passwort vergessen?
            </Link>
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="password" value={password} />
          <div>
            <p className="mb-4">
              Öffne deine Authenticator-App und gib den sechsstelligen Code für <strong>{email}</strong> ein.
            </p>
            <TextField
              name="code"
              label="Bestätigungscode"
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={20}
              className="max-w-xs"
              hint="Handy nicht zur Hand? Dann einen deiner Wiederherstellungscodes eingeben."
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? 'Wird geprüft …' : 'Code bestätigen'}
            </Button>
            <button
              type="button"
              onClick={() => setBackToPassword(true)}
              className="text-sm font-medium text-brand-text underline underline-offset-2"
            >
              Andere E-Mail-Adresse verwenden
            </button>
          </div>
        </>
      )}
    </form>
  )
}
