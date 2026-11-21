'use client'

import React from 'react'

import { contactAction } from '@/lib/forms/actions'
import { CONTACT_TOPICS } from '@/lib/forms/options'

import { SelectField, TextArea, TextField } from './Fields'
import { FormShell } from './FormShell'

const topics = Object.entries(CONTACT_TOPICS).map(([value, label]) => ({ value, label }))

export function ContactForm() {
  return (
    <FormShell action={contactAction} submitLabel="Nachricht senden">
      {({ values, errors }) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField name="name" label="Name" required maxLength={200} autoComplete="name" defaultValue={values.name} error={errors.name} />
            <TextField name="email" label="E-Mail" type="email" required maxLength={254} autoComplete="email" defaultValue={values.email} error={errors.email} />
            <TextField
              name="phone"
              label="Telefon"
              type="tel"
              maxLength={50}
              autoComplete="tel"
              defaultValue={values.phone}
              error={errors.phone}
              hint="Falls wir dich lieber anrufen sollen."
            />
            <SelectField name="topic" label="Thema" required options={topics} defaultValue={values.topic ?? 'general'} error={errors.topic} />
          </div>
          <TextArea name="message" label="Nachricht" required minLength={10} maxLength={5000} defaultValue={values.message} error={errors.message} />
        </>
      )}
    </FormShell>
  )
}
