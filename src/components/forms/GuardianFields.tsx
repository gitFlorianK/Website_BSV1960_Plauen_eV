'use client'

import React, { useEffect, useRef, useState } from 'react'

import { ageOn } from '@/utilities/dates'

import { CheckboxField, Fieldset, TextField } from './Fields'

type Props = {
  values: Record<string, string>
  errors: Record<string, string>
  birthDateLabel?: string
  /** Text der Zustimmung (je nach Formular) */
  consentLabel: string
}

const today = () => new Date().toISOString().slice(0, 10)

/** Geburtsdatum + Angaben der Erziehungsberechtigten (nur bei Minderjährigen eingeblendet). */
export function BirthDateWithGuardian({ values, errors, birthDateLabel = 'Geburtsdatum', consentLabel }: Props) {
  const [birthDate, setBirthDate] = useState(values.birthDate ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  // Eingaben vor der Hydrierung (langsame Verbindung) übernehmen
  useEffect(() => {
    if (inputRef.current?.value) setBirthDate(inputRef.current.value)
  }, [])
  const minor = /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && ageOn(birthDate) < 18

  return (
    <>
      <TextField
        name="birthDate"
        label={birthDateLabel}
        type="date"
        required
        min="1900-01-01"
        max={today()}
        autoComplete="bday"
        defaultValue={values.birthDate}
        ref={inputRef}
        onChange={(e) => setBirthDate(e.currentTarget.value)}
        error={errors.birthDate}
        className="sm:max-w-xs"
      />
      {minor && (
        <Fieldset legend="Erziehungsberechtigte(r)">
          <p className="text-sm text-muted-foreground">
            Bei Minderjährigen brauchen wir die Zustimmung eines Elternteils bzw. Erziehungsberechtigten.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="guardianName"
              label="Name"
              required
              maxLength={200}
              autoComplete="off"
              defaultValue={values.guardianName}
              error={errors.guardianName}
            />
            <TextField
              name="guardianPhone"
              label="Telefon"
              type="tel"
              maxLength={50}
              defaultValue={values.guardianPhone}
              error={errors.guardianPhone}
            />
          </div>
          <CheckboxField
            name="guardianConsent"
            required
            defaultChecked={values.guardianConsent === 'on'}
            error={errors.guardianConsent}
            label={consentLabel}
          />
        </Fieldset>
      )}
    </>
  )
}
