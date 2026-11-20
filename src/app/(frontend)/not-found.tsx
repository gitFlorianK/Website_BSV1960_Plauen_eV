import Link from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/button'
import { routes } from '@/utilities/routes'

export default function NotFound() {
  return (
    <div className="container py-24">
      <p className="text-6xl font-bold text-brand-text">404</p>
      <h1 className="mt-2 text-3xl font-bold">Daneben getroffen</h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Diese Seite gibt es nicht (mehr). Vielleicht hilft die Suche weiter – oder du startest auf der Startseite.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Button asChild size="lg">
          <Link href="/">Zur Startseite</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={routes.search}>Website durchsuchen</Link>
        </Button>
      </div>
    </div>
  )
}
