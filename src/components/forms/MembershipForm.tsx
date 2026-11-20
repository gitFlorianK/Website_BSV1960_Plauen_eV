'use client'

import React from 'react'

import { membershipAction } from '@/lib/forms/actions'
import { BOW_TYPES } from '@/lib/forms/schemas'

import { CheckboxField, Fieldset, SelectField, TextArea, TextField } from './Fields'
import { FormShell } from './FormShell'
import { BirthDateWithGuardian } from './GuardianFields'

const bows = Object.entries(BOW_TYPES).map(([value, label]) => ({ value, label }))

export function MembershipForm() {
  return (
    <FormShell action={membershipAction} submitLabel="Antrag absenden">
      {({ values, errors }) => (
        <>
          <Fieldset legend="Persönliche Angaben">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="firstName" label="Vorname" required maxLength={100} autoComplete="given-name" defaultValue={values.firstName} error={errors.firstName} />
              <TextField name="lastName" label="Nachname" required maxLength={100} autoComplete="family-name" defaultValue={values.lastName} error={errors.lastName} />
            </div>
            <BirthDateWithGuardian
              values={values}
              errors={errors}
              consentLabel="Ich bin erziehungsberechtigt und stimme dem Mitgliedsantrag zu."
            />
          </Fieldset>

          <Fieldset legend="Anschrift und Kontakt">
            <TextField name="street" label="Straße und Hausnummer" required maxLength={200} autoComplete="street-address" defaultValue={values.street} error={errors.street} />
            <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
              <TextField name="postalCode" label="PLZ" required inputMode="numeric" pattern="\d{5}" maxLength={5} autoComplete="postal-code" defaultValue={values.postalCode} error={errors.postalCode} />
              <TextField name="city" label="Ort" required maxLength={100} autoComplete="address-level2" defaultValue={values.city} error={errors.city} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="email" label="E-Mail" type="email" required maxLength={254} autoComplete="email" defaultValue={values.email} error={errors.email} />
              <TextField name="phone" label="Telefon" type="tel" maxLength={50} autoComplete="tel" defaultValue={values.phone} error={errors.phone} />
            </div>
          </Fieldset>

          <Fieldset legend="Bogensport">
            <SelectField name="bowType" label="Welche Bogenart möchtest du schießen?" required options={bows} defaultValue={values.bowType ?? 'undecided'} error={errors.bowType} className="sm:max-w-sm" />
            <CheckboxField name="courseCompleted" label="Ich habe bereits einen Anfängerkurs absolviert." defaultChecked={values.courseCompleted === 'on'} />
          </Fieldset>

          <TextArea name="message" label="Nachricht an den Vorstand" maxLength={3000} rows={4} defaultValue={values.message} error={errors.message} />
        </>
      )}
    </FormShell>
  )
}
