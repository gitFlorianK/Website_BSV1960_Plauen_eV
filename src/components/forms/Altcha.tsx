'use client'

import type {} from 'altcha/types/react'
import React, { useEffect, useRef } from 'react'

import { routes } from '@/utilities/routes'

type Props = {
  /** Ändert sich nach jeder Server-Antwort → Widget zurücksetzen (Lösungen sind nur einmal gültig). */
  resetKey: number
  error?: string
}

const CONFIG = JSON.stringify({ hideFooter: true, hideLogo: true })

/** ALTCHA-Widget: Proof-of-Work im Browser, selbst gehostet, keine Cookies, keine Drittanbieter. */
export function Altcha({ resetKey, error }: Props) {
  const ref = useRef<HTMLElement & { reset?: () => void }>(null)

  useEffect(() => {
    // Web Component nur im Browser registrieren
    void import('altcha').then(() => import('altcha/i18n/de'))
  }, [])

  useEffect(() => {
    if (resetKey > 0) ref.current?.reset?.()
  }, [resetKey])

  return (
    <div>
      <altcha-widget
        ref={ref}
        challenge={routes.altchaChallenge}
        name="altcha"
        language="de"
        auto="onfocus"
        configuration={CONFIG}
        aria-describedby={error ? 'f-altcha-error' : undefined}
        style={{ '--altcha-max-width': '100%' } as React.CSSProperties}
      />
      {error && (
        <p id="f-altcha-error" className="mt-1.5 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <noscript>
        <p className="mt-2 text-sm text-destructive">
          Für den Spamschutz wird JavaScript benötigt. Alternativ erreichst du uns per E-Mail.
        </p>
      </noscript>
    </div>
  )
}
