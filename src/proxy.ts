import { NextResponse, type NextRequest } from 'next/server'

import { buildCsp, newNonce } from '@/lib/security/csp'

/**
 * Setzt je Anfrage eine Nonce-basierte CSP. Next.js liest den Nonce aus dem Request-Header
 * und versieht seine Skripte damit – deshalb werden alle HTML-Seiten dynamisch gerendert.
 * Achtung: Proxy ist kein Zugriffsschutz – Rechte prüfen Seiten, Server Actions und Payload selbst.
 */
export function proxy(request: NextRequest) {
  const nonce = newNonce()
  const csp = buildCsp({ nonce, dev: process.env.NODE_ENV === 'development' })

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    {
      // Seiten inkl. /admin; ohne REST-API, Next-Assets und Dateien mit Endung (Bilder, ics, xml …)
      source: '/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
