'use client'

import React, { useActionState, useState } from 'react'

import { Notice } from '@/components/auth/Notice'
import { Altcha } from '@/components/forms/Altcha'
import { TextField } from '@/components/forms/Fields'
import { Button } from '@/components/ui/button'
import { forgotPasswordAction, type SimpleState } from '@/lib/auth/actions'

export function ForgotForm() {
  const [state, action, pending] = useActionState<SimpleState, FormData>(forgotPasswordAction, { status: 'idle' })
  // Nach jeder Antwort neue ALTCHA-Challenge (Lösungen gelten nur einmal)
  const [round, setRound] = useState(0)
  const [prevState, setPrevState] = useState(state)
  if (prevState !== state) {
    setPrevState(state)
    setRound((r) => r + 1)
  }

  if (state.status === 'success') return <Notice tone="success">{state.message}</Notice>

  return (
    <form key={round} action={action} className="grid gap-5">
      {state.status === 'error' && <Notice tone="error">{state.message}</Notice>}
      <TextField name="email" label="E-Mail-Adresse" type="email" required autoComplete="email" autoFocus />
      <Altcha resetKey={round} auto="onload" />
      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Wird gesendet …' : 'Link anfordern'}
        </Button>
      </div>
    </form>
  )
}
