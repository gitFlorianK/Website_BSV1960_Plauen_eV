'use client'

import React, { useActionState } from 'react'

import { Notice } from '@/components/auth/Notice'
import { SelectField, TextField } from '@/components/forms/Fields'
import { Button } from '@/components/ui/button'
import {
  cancelEventRegistrationAction,
  type EventRegState,
  registerForEventAction,
} from '@/lib/members/actions'
import type { EventRegistration } from '@/payload-types'

const BOW_CLASSES = [
  { value: 'recurve', label: 'Recurve' },
  { value: 'compound', label: 'Compound' },
  { value: 'barebow', label: 'Blankbogen' },
  { value: 'longbow', label: 'Langbogen' },
  { value: 'hunting', label: 'Jagdbogen' },
]

const STATUS: Record<EventRegistration['status'], string> = {
  registered: 'Du bist angemeldet.',
  confirmed: 'Du bist angemeldet, der Verein hat deine Meldung bestätigt.',
  cancelled: 'Du hast dich abgemeldet.',
}

type Props = {
  eventId: number
  closed: boolean
  registration: Pick<EventRegistration, 'id' | 'status' | 'bowClass'> | null
}

export function EventRegistrationControls({ eventId, closed, registration }: Props) {
  const [regState, register, registering] = useActionState<EventRegState, FormData>(registerForEventAction, { status: 'idle' })
  const [cancelState, cancel, cancelling] = useActionState<EventRegState, FormData>(cancelEventRegistrationAction, { status: 'idle' })
  const error = regState.status === 'error' ? regState.message : cancelState.status === 'error' ? cancelState.message : null
  const active = registration && registration.status !== 'cancelled'

  return (
    <div className="mt-4">
      {error && (
        <Notice tone="error" className="mb-4">
          {error}
        </Notice>
      )}
      {active ? (
        <div className="flex flex-wrap items-center gap-4 rounded-lg bg-success/60 px-4 py-3">
          <p className="font-medium text-green-900">
            {STATUS[registration.status]} Bogenklasse: {BOW_CLASSES.find((b) => b.value === registration.bowClass)?.label}
          </p>
          {!closed && (
            <form action={cancel}>
              <input type="hidden" name="registration" value={registration.id} />
              <Button type="submit" variant="outline" size="sm" disabled={cancelling}>
                {cancelling ? 'Wird abgemeldet …' : 'Abmelden'}
              </Button>
            </form>
          )}
        </div>
      ) : closed ? (
        <p className="text-muted-foreground">Der Meldeschluss ist vorbei.</p>
      ) : (
        <form action={register} className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
          <input type="hidden" name="event" value={eventId} />
          <SelectField
            name="bowClass"
            label="Bogenklasse"
            required
            options={BOW_CLASSES}
            defaultValue={registration?.bowClass ?? 'recurve'}
            idPrefix={`termin-${eventId}`}
          />
          <TextField name="note" label="Bemerkung" maxLength={1000} idPrefix={`termin-${eventId}`} placeholder="z. B. Fahrgemeinschaft gesucht" />
          <Button type="submit" disabled={registering}>
            {registering ? 'Wird angemeldet …' : registration ? 'Wieder anmelden' : 'Anmelden'}
          </Button>
        </form>
      )}
    </div>
  )
}
