'use client'

import { useRouter } from 'next/navigation'
import React, { useActionState, useEffect, useRef } from 'react'

import { Notice } from '@/components/auth/Notice'
import { PasswordField } from '@/components/auth/PasswordField'
import { TextField } from '@/components/forms/Fields'
import { Button } from '@/components/ui/button'
import { logoutOtherDevicesAction, type SimpleState, twoFactorAction, type TwoFactorState } from '@/lib/auth/actions'

type Props = { enabled: boolean; required: boolean; remainingCodes: number; autoStart: boolean }

export function TwoFactorPanel({ enabled, required, remainingCodes, autoStart }: Props) {
  const [state, action, pending] = useActionState<TwoFactorState, FormData>(twoFactorAction, { step: 'idle' })
  const router = useRouter()
  const startRef = useRef<HTMLFormElement>(null)

  // Von der Anmeldung hierher geleitet (Pflicht für Vorstand) → Einrichtung direkt starten
  useEffect(() => {
    if (autoStart) startRef.current?.requestSubmit()
  }, [autoStart])

  if (state.step === 'scan') return <ScanStep state={state} action={action} pending={pending} />
  if (state.step === 'codes') {
    return <RecoveryCodes codes={state.recoveryCodes} moved={state.moved} onDone={() => router.refresh()} />
  }

  return (
    <div className="grid gap-6">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.message && <Notice tone="success">{state.message}</Notice>}
      {enabled ? (
        <>
          <Notice tone="success">
            <p className="font-semibold">Die Zwei-Faktor-Anmeldung ist aktiv.</p>
            <p className="text-sm">
              Du hast noch {remainingCodes} von 8 Wiederherstellungscodes.
              {remainingCodes <= 2 && ' Erzeuge bald neue.'}
            </p>
          </Notice>
          <details className="rounded-lg border border-border p-4">
            <summary className="cursor-pointer font-medium">Auf ein neues Handy übertragen</summary>
            <ConfirmForm
              action={action}
              pending={pending}
              intent="move"
              label="Weiter zum QR-Code"
              hint="Dein bisheriges Handy gilt weiter, bis du die neue App mit einem Code bestätigt hast. Altes Handy nicht mehr da? Dann gib statt des Codes einen deiner Wiederherstellungscodes ein."
            />
          </details>
          <details className="rounded-lg border border-border p-4">
            <summary className="cursor-pointer font-medium">Neue Wiederherstellungscodes erzeugen</summary>
            <ConfirmForm action={action} pending={pending} intent="regenerate" label="Neue Codes erzeugen" />
          </details>
          {!required && (
            <details className="rounded-lg border border-border p-4">
              <summary className="cursor-pointer font-medium">Zwei-Faktor-Anmeldung ausschalten</summary>
              <ConfirmForm action={action} pending={pending} intent="disable" label="Ausschalten" variant="outline" />
            </details>
          )}
        </>
      ) : (
        <form ref={startRef} action={action}>
          <input type="hidden" name="intent" value="start" />
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Wird vorbereitet …' : 'Zwei-Faktor-Anmeldung einrichten'}
          </Button>
        </form>
      )}
    </div>
  )
}

function ScanStep({
  state,
  action,
  pending,
}: {
  state: Extract<TwoFactorState, { step: 'scan' }>
  action: (fd: FormData) => void
  pending: boolean
}) {
  return (
    <div className="grid gap-6">
      <ol className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
        <li className="contents">
          <QrCode matrix={state.qr} />
          <div>
            <p className="font-semibold">1. QR-Code scannen</p>
            <p className="mt-1 text-muted-foreground">
              {state.moving && 'Nimm dazu dein neues Handy. '}
              Öffne deine Authenticator-App, tippe auf „Hinzufügen“ und scanne den Code. Scannen geht nicht? Dann gib
              diesen Schlüssel von Hand ein:
            </p>
            <p className="mt-3 select-all break-all rounded-md bg-muted px-3 py-2 font-mono text-[0.95rem] tracking-wider">
              {state.secret.match(/.{1,4}/g)?.join(' ')}
            </p>
          </div>
        </li>
      </ol>
      <form action={action} className="grid gap-4">
        <p className="font-semibold">2. Code aus der App eingeben</p>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <TextField
          name="code"
          label="Sechsstelliger Code"
          required
          autoFocus
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="one-time-code"
          className="max-w-xs"
        />
        {state.moving && (
          <p className="text-sm text-muted-foreground">
            Mit der Bestätigung gilt nur noch das neue Handy; du bekommst neue Wiederherstellungscodes und wirst auf allen
            anderen Geräten abgemeldet.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {/* intent über den Absende-Knopf (Enter im Codefeld nimmt den ersten, also „bestätigen“) */}
          <Button type="submit" size="lg" name="intent" value="confirm" disabled={pending}>
            {pending ? 'Wird geprüft …' : 'Code bestätigen'}
          </Button>
          {/* formNoValidate: Abbrechen geht auch ohne Code im Pflichtfeld */}
          <Button type="submit" size="lg" variant="outline" name="intent" value="cancel" formNoValidate disabled={pending}>
            Abbrechen
          </Button>
        </div>
      </form>
    </div>
  )
}

/** QR-Code als SVG aus der Modul-Matrix (dunkle Module als Pfad – kein innerHTML). */
function QrCode({ matrix }: { matrix: boolean[][] }) {
  const size = matrix.length
  let d = ''
  matrix.forEach((row, y) => row.forEach((on, x) => on && (d += `M${x} ${y}h1v1h-1z`)))
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="size-48 rounded-lg border border-border bg-white p-2"
      role="img"
      aria-label="QR-Code zum Einrichten der Authenticator-App"
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="#fff" />
      <path d={d} fill="#0f0063" />
    </svg>
  )
}

function RecoveryCodes({ codes, moved, onDone }: { codes: string[]; moved?: boolean; onDone: () => void }) {
  const download = () => {
    const text = `Wiederherstellungscodes – BSV 1960 Plauen\nJeder Code funktioniert genau einmal.\n\n${codes.join('\n')}\n`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'bsv1960-wiederherstellungscodes.txt' })
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="grid gap-5">
      <Notice tone="success">
        <p className="font-semibold">
          {moved
            ? 'Fertig – die Zwei-Faktor-Anmeldung läuft jetzt über dein neues Handy. Codes vom alten Handy und alte Wiederherstellungscodes gelten nicht mehr.'
            : 'Fertig – die Zwei-Faktor-Anmeldung ist aktiv.'}
        </p>
      </Notice>
      <div>
        <p className="font-semibold">Deine Wiederherstellungscodes</p>
        <p className="mt-1 text-muted-foreground">
          Damit kommst du in dein Konto, wenn dein Handy weg ist. Jeder Code funktioniert einmal. Bewahre sie sicher auf
          (ausdrucken oder im Passwortmanager) – wir zeigen sie nur dieses eine Mal.
        </p>
      </div>
      <ul className="grid max-w-md grid-cols-2 gap-2 rounded-lg border-2 border-dashed border-navy/30 p-4 font-mono text-[1.05rem]">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={download}>
          Als Textdatei speichern
        </Button>
        <Button type="button" onClick={onDone}>
          Ich habe die Codes gesichert
        </Button>
      </div>
    </div>
  )
}

function ConfirmForm({
  action,
  pending,
  intent,
  label,
  variant,
  hint,
}: {
  action: (fd: FormData) => void
  pending: boolean
  intent: 'move' | 'regenerate' | 'disable'
  label: string
  variant?: 'outline'
  hint?: string
}) {
  return (
    <form action={action} className="mt-4 grid max-w-md gap-4">
      <input type="hidden" name="intent" value={intent} />
      {hint && <p className="text-sm">{hint}</p>}
      <p className="text-sm text-muted-foreground">Zur Sicherheit: bitte Passwort und aktuellen Code eingeben.</p>
      <PasswordField name="password" label="Passwort" autoComplete="current-password" />
      <TextField name="code" label="Code aus der App" required inputMode="numeric" autoComplete="one-time-code" maxLength={20} idPrefix={intent} />
      <div>
        <Button type="submit" variant={variant} disabled={pending}>
          {label}
        </Button>
      </div>
    </form>
  )
}

export function OtherDevicesForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState<SimpleState, FormData>(logoutOtherDevicesAction, { status: 'idle' })
  return (
    <form action={action} className="grid gap-4">
      {state.status === 'success' && <Notice tone="success">{state.message}</Notice>}
      <div>
        <Button type="submit" variant="outline" disabled={pending || disabled}>
          Auf allen anderen Geräten abmelden
        </Button>
      </div>
    </form>
  )
}
