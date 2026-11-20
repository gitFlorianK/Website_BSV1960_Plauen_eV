import type { Metadata } from 'next'
import React from 'react'

import { LowImpactHero } from '@/heros/LowImpact'
import { ConfirmForm } from './ConfirmForm'

export const metadata: Metadata = {
  title: 'Anmeldung bestätigen',
  robots: { index: false, follow: false },
  // Token in der URL nicht per Referer an verlinkte Seiten weitergeben
  referrer: 'no-referrer',
}

type Args = { searchParams: Promise<{ token?: string | string[] }> }

/**
 * Bestätigungsseite des Double-Opt-in. Der Link aus der E-Mail bestätigt NICHT selbst (GET),
 * sondern erst der Klick auf den Button (POST) – Mail-Scanner, die Links vorab öffnen,
 * lösen so keine Bestätigung aus.
 */
export default async function ConfirmPage({ searchParams }: Args) {
  const { token } = await searchParams
  const value = typeof token === 'string' ? token : ''

  return (
    <article className="pb-16">
      <LowImpactHero>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Anmeldung bestätigen</h1>
      </LowImpactHero>
      <div className="container mt-10 max-w-2xl">
        <ConfirmForm token={value} />
      </div>
    </article>
  )
}
