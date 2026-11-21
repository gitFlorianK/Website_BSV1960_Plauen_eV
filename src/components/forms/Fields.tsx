import React from 'react'

import { cn } from '@/utilities/ui'

/*
 * Native, barrierearme Formularfelder: sichtbares Label, Fehler per aria-describedby,
 * aria-invalid, ausreichend große Klickflächen. Keine JS-Abhängigkeit.
 */

export const inputClass =
  'block w-full rounded-md border border-input bg-white px-3 py-2.5 text-base text-foreground shadow-xs ' +
  'placeholder:text-muted-foreground focus-visible:border-navy aria-[invalid=true]:border-destructive ' +
  'aria-[invalid=true]:bg-error/40 disabled:opacity-60'

type Common = {
  name: string
  label: React.ReactNode
  error?: string
  hint?: React.ReactNode
  required?: boolean
  className?: string
  /** Eindeutiger Präfix, wenn dasselbe Formular mehrfach auf einer Seite steht. */
  idPrefix?: string
}

const ids = (name: string, prefix?: string) => {
  const base = prefix ? `f-${prefix}-${name}` : `f-${name}`
  return { id: base, errorId: `${base}-error`, hintId: `${base}-hint` }
}

function describedBy(name: string, error?: string, hint?: React.ReactNode, prefix?: string) {
  const { errorId, hintId } = ids(name, prefix)
  return [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
}

function Label({ name, label, required, idPrefix }: Pick<Common, 'name' | 'label' | 'required' | 'idPrefix'>) {
  return (
    <label htmlFor={ids(name, idPrefix).id} className="mb-1.5 block font-medium">
      {label}
      {required ? (
        <span className="ml-0.5 text-destructive" aria-hidden>
          *
        </span>
      ) : (
        <span className="ml-1.5 text-sm font-normal text-muted-foreground">(optional)</span>
      )}
    </label>
  )
}

function Messages({ name, error, hint, idPrefix }: Pick<Common, 'name' | 'error' | 'hint' | 'idPrefix'>) {
  const { errorId, hintId } = ids(name, idPrefix)
  return (
    <>
      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </>
  )
}

export function TextField({
  name,
  label,
  error,
  hint,
  required,
  className,
  idPrefix,
  ...rest
}: Common & Omit<React.ComponentProps<'input'>, 'name'>) {
  return (
    <div className={className}>
      <Label name={name} label={label} required={required} idPrefix={idPrefix} />
      <input
        id={ids(name, idPrefix).id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint, idPrefix)}
        className={inputClass}
        {...rest}
      />
      <Messages name={name} error={error} hint={hint} idPrefix={idPrefix} />
    </div>
  )
}

export function TextArea({
  name,
  label,
  error,
  hint,
  required,
  className,
  idPrefix,
  ...rest
}: Common & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'>) {
  return (
    <div className={className}>
      <Label name={name} label={label} required={required} idPrefix={idPrefix} />
      <textarea
        id={ids(name, idPrefix).id}
        name={name}
        required={required}
        rows={6}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint, idPrefix)}
        className={inputClass}
        {...rest}
      />
      <Messages name={name} error={error} hint={hint} idPrefix={idPrefix} />
    </div>
  )
}

export function SelectField({
  name,
  label,
  error,
  hint,
  required,
  className,
  options,
  placeholder,
  idPrefix,
  ...rest
}: Common &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> & {
    options: { value: string; label: string }[]
    placeholder?: string
  }) {
  return (
    <div className={className}>
      <Label name={name} label={label} required={required} idPrefix={idPrefix} />
      <select
        id={ids(name, idPrefix).id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint, idPrefix)}
        className={cn(inputClass, 'h-[2.875rem]')}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Messages name={name} error={error} hint={hint} idPrefix={idPrefix} />
    </div>
  )
}

export function CheckboxField({
  name,
  label,
  error,
  hint,
  required,
  className,
  idPrefix,
  ...rest
}: Common & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'>) {
  const { id } = ids(name, idPrefix)
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={name}
          type="checkbox"
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(name, error, hint, idPrefix)}
          className="mt-0.5 size-5 shrink-0 accent-[var(--navy)]"
          {...rest}
        />
        <label htmlFor={id} className="leading-snug">
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden>
              *
            </span>
          )}
        </label>
      </div>
      <div className="pl-8">
        <Messages name={name} error={error} hint={hint} idPrefix={idPrefix} />
      </div>
    </div>
  )
}

/** Für Bots sichtbares, für Menschen und Screenreader verstecktes Feld. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor="f-website">Website (bitte leer lassen)</label>
      <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  )
}

export function Fieldset({ legend, children, className }: { legend: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={cn('grid gap-5 rounded-lg border border-border p-5', className)}>
      <legend className="px-1 font-semibold">{legend}</legend>
      {children}
    </fieldset>
  )
}
