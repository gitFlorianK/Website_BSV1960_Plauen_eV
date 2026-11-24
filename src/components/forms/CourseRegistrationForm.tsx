'use client'

import { useSearchParams } from 'next/navigation'
import React from 'react'

import { courseRegistrationAction } from '@/lib/forms/actions'

import { CheckboxField, SelectField, TextArea, TextField } from './Fields'
import { FormShell } from './FormShell'
import { BirthDateWithGuardian } from './GuardianFields'

export type CourseOption = { id: number; label: string }

export function CourseRegistrationForm({ courses }: { courses: CourseOption[] }) {
  const options = courses.map((c) => ({ value: String(c.id), label: c.label }))
  // „Jetzt anmelden“ in der Kursliste übergibt den Kurs (?kurs=<id>); nur offene Kurse übernehmen
  const fromLink = useSearchParams().get('kurs')
  const preselected = options.some((o) => o.value === fromLink) ? fromLink : null
  return (
    <FormShell action={courseRegistrationAction} submitLabel="Verbindlich anmelden">
      {({ values, errors }) => (
        <>
          <SelectField
            // neu aufbauen, wenn ein anderer Kurs verlinkt wird (Link auf derselben Seite)
            key={preselected ?? ''}
            name="course"
            label="Kurs"
            required
            options={options}
            placeholder={options.length > 1 ? 'Bitte wählen' : undefined}
            defaultValue={values.course ?? preselected ?? (options.length === 1 ? options[0].value : '')}
            error={errors.course}
          />
          <p className="-mt-2 text-sm text-muted-foreground">Angaben zur teilnehmenden Person:</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField name="firstName" label="Vorname" required maxLength={100} autoComplete="given-name" defaultValue={values.firstName} error={errors.firstName} />
            <TextField name="lastName" label="Nachname" required maxLength={100} autoComplete="family-name" defaultValue={values.lastName} error={errors.lastName} />
          </div>
          <BirthDateWithGuardian
            values={values}
            errors={errors}
            consentLabel="Ich bin erziehungsberechtigt und melde mein Kind zum Kurs an."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="email"
              label="E-Mail"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              defaultValue={values.email}
              error={errors.email}
              hint="An diese Adresse schicken wir den Bestätigungslink – bei Kindern bitte die Adresse der Eltern."
            />
            <TextField name="phone" label="Telefon" type="tel" maxLength={50} autoComplete="tel" defaultValue={values.phone} error={errors.phone} />
          </div>
          <TextArea name="message" label="Anmerkungen" maxLength={2000} rows={3} defaultValue={values.message} error={errors.message} hint="Z. B. Linkshänder, Vorerfahrung, gesundheitliche Hinweise." />
          <CheckboxField
            name="photosAllowed"
            defaultChecked={values.photosAllowed === 'on'}
            label="Fotos aus dem Kurs, auf denen die teilnehmende Person zu sehen ist, dürfen in der Vereinsgalerie (nur für Mitglieder) gezeigt werden."
            hint="Freiwillig und jederzeit widerrufbar."
          />
        </>
      )}
    </FormShell>
  )
}
