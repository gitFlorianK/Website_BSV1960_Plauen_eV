'use client'

import { EyeIcon, EyeOffIcon } from 'lucide-react'
import React, { useState } from 'react'

import { inputClass } from '@/components/forms/Fields'
import { cn } from '@/utilities/ui'

type Props = {
  name: string
  label: string
  autoComplete: 'current-password' | 'new-password'
  error?: string
  hint?: React.ReactNode
  autoFocus?: boolean
}

/** Passwortfeld mit „Anzeigen“-Schalter (hilft bei langen Passphrasen, WCAG 3.3.8). */
export function PasswordField({ name, label, autoComplete, error, hint, autoFocus }: Props) {
  const [visible, setVisible] = useState(false)
  const id = `f-${name}`
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          maxLength={128}
          spellCheck={false}
          autoCapitalize="none"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(inputClass, 'pr-12')}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-navy"
        >
          {visible ? <EyeOffIcon className="size-5" aria-hidden /> : <EyeIcon className="size-5" aria-hidden />}
          <span className="sr-only">{visible ? 'Passwort verbergen' : 'Passwort anzeigen'}</span>
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
