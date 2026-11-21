'use client'

import React, { useActionState } from 'react'

import { Notice } from '@/components/auth/Notice'
import { PasswordField } from '@/components/auth/PasswordField'
import { Button } from '@/components/ui/button'
import { resetPasswordAction, type SimpleState } from '@/lib/auth/actions'
import { PASSWORD_MIN_LENGTH } from '@/lib/auth/password'

/** Neues Passwort festlegen – für „Passwort vergessen“ und Einladungen (gleicher Token-Mechanismus). */
export function NewPasswordForm({ token, submitLabel }: { token: string; submitLabel: string }) {
  const [state, action, pending] = useActionState<SimpleState, FormData>(resetPasswordAction, { status: 'idle' })
  const fieldError = (f: string) => (state.status === 'error' && state.field === f ? state.message : undefined)

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="token" value={token} />
      {state.status === 'error' && !state.field && <Notice tone="error">{state.message}</Notice>}
      <PasswordField
        name="password"
        label="Neues Passwort"
        autoComplete="new-password"
        autoFocus
        error={fieldError('password')}
        hint={`Mindestens ${PASSWORD_MIN_LENGTH} Zeichen. Gut zu merken und schwer zu erraten sind mehrere zufällige Wörter, z. B. „Pfeil Wolke Tannenzapfen“.`}
      />
      <PasswordField name="confirm" label="Passwort wiederholen" autoComplete="new-password" error={fieldError('confirm')} />
      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Wird gespeichert …' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
