'use client'

import React, { useActionState } from 'react'

import { Notice } from '@/components/auth/Notice'
import { PasswordField } from '@/components/auth/PasswordField'
import { TextField } from '@/components/forms/Fields'
import { Button } from '@/components/ui/button'
import { changePasswordAction, type SimpleState, updateProfileAction } from '@/lib/auth/actions'
import { PASSWORD_MIN_LENGTH } from '@/lib/auth/password'

const fieldError = (state: SimpleState, field: string) =>
  state.status === 'error' && state.field === field ? state.message : undefined

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action, pending] = useActionState<SimpleState, FormData>(updateProfileAction, { status: 'idle' })
  return (
    <form action={action} className="grid gap-5">
      {state.status === 'success' && <Notice tone="success">{state.message}</Notice>}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label="Name" required maxLength={200} autoComplete="name" defaultValue={name} error={fieldError(state, 'name')} />
        <TextField
          name="phone"
          label="Telefon"
          type="tel"
          maxLength={50}
          autoComplete="tel"
          defaultValue={phone}
          error={fieldError(state, 'phone')}
          hint="Sieht nur der Vorstand."
        />
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Wird gespeichert …' : 'Angaben speichern'}
        </Button>
      </div>
    </form>
  )
}

export function PasswordChangeForm() {
  const [state, action, pending] = useActionState<SimpleState, FormData>(changePasswordAction, { status: 'idle' })
  return (
    <form action={action} className="grid max-w-md gap-5">
      {state.status === 'success' && <Notice tone="success">{state.message}</Notice>}
      {state.status === 'error' && !state.field && <Notice tone="error">{state.message}</Notice>}
      <PasswordField name="current" label="Aktuelles Passwort" autoComplete="current-password" error={fieldError(state, 'current')} />
      <PasswordField
        name="password"
        label="Neues Passwort"
        autoComplete="new-password"
        error={fieldError(state, 'password')}
        hint={`Mindestens ${PASSWORD_MIN_LENGTH} Zeichen. Mehrere zufällige Wörter sind sicher und gut zu merken.`}
      />
      <PasswordField name="confirm" label="Neues Passwort wiederholen" autoComplete="new-password" error={fieldError(state, 'confirm')} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Wird gespeichert …' : 'Passwort ändern'}
        </Button>
      </div>
    </form>
  )
}
