'use client'

import { CheckCircle2Icon, CircleAlertIcon } from 'lucide-react'
import Link from 'next/link'
import React, { useActionState, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { initialFormState, type FormState } from '@/lib/forms/types'
import { routes } from '@/utilities/routes'

import { Altcha } from './Altcha'
import { CheckboxField, Honeypot } from './Fields'

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>
  submitLabel: string
  /** Felder; erhalten die vorherigen Eingaben und Fehler (nach einer Server-Antwort). */
  children: (ctx: { values: Record<string, string>; errors: Record<string, string> }) => React.ReactNode
  privacyText?: React.ReactNode
}

/**
 * Gemeinsamer Rahmen der öffentlichen Formulare: Server Action, Fehlerzusammenfassung,
 * Honeypot, ALTCHA, Datenschutz-Bestätigung. Nach jeder Antwort wird das Formular neu
 * aufgebaut (frische ALTCHA-Challenge, Eingaben bleiben über defaultValue erhalten).
 */
export function FormShell({ action, submitLabel, children, privacyText }: Props) {
  const [state, formAction, pending] = useActionState(action, initialFormState)
  // Zähler je Server-Antwort (Muster „Zustand aus vorherigem Render“) → neuer Formular-Key
  const [prevState, setPrevState] = useState(state)
  const [round, setRound] = useState(0)
  if (prevState !== state) {
    setPrevState(state)
    setRound((r) => r + 1)
  }
  const messageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state.status !== 'idle') messageRef.current?.focus()
  }, [state])

  if (state.status === 'success') {
    return (
      <div
        ref={messageRef}
        tabIndex={-1}
        role="status"
        className="flex gap-3 rounded-lg border-l-4 border-green-700 bg-success p-6 text-lg"
      >
        <CheckCircle2Icon className="mt-1 size-6 shrink-0 text-green-800" aria-hidden />
        <p>{state.message}</p>
      </div>
    )
  }

  const values = state.values ?? {}
  const errors = state.fieldErrors ?? {}

  return (
    <form key={round} action={formAction} className="relative grid gap-6" aria-busy={pending}>
      {state.status === 'error' && (
        <div
          ref={messageRef}
          tabIndex={-1}
          role="alert"
          className="flex gap-3 rounded-lg border-l-4 border-destructive bg-error p-4"
        >
          <CircleAlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
          <p className="font-medium">{state.message}</p>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Pflichtfelder sind mit <span className="text-destructive">*</span> markiert.
      </p>

      {children({ values, errors })}

      <Honeypot />

      <CheckboxField
        name="privacy"
        required
        defaultChecked={values.privacy === 'on'}
        error={errors.privacy}
        label={
          privacyText ?? (
            <>
              Ich habe die{' '}
              <Link href={routes.privacy} className="font-medium text-brand-text underline underline-offset-2" target="_blank">
                Datenschutzhinweise
              </Link>{' '}
              gelesen und bin mit der Verarbeitung meiner Angaben zur Bearbeitung der Anfrage einverstanden.
            </>
          )
        }
      />

      <Altcha resetKey={round} error={errors.altcha} />

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Wird gesendet …' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
