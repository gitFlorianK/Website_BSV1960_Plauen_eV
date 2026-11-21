/*
 * Content-Security-Policy (docs/konzept.md, Abschnitt 5): Skripte nur mit Nonce pro Anfrage
 * ('strict-dynamic' lässt von Next nachgeladene Chunks zu), keine Drittanbieter.
 *
 * - style-src erlaubt 'unsafe-inline': React-`style`-Attribute, next/image und das ALTCHA-Widget
 *   setzen Inline-Styles; Nonces gelten nicht für Style-Attribute. Styles führen keinen Code aus.
 * - worker-src blob: – ALTCHA rechnet den Proof-of-Work in Web Workern aus Blob-URLs.
 * - frame-ancestors 'self' – Live-Vorschau des Admin-Panels bettet die Website ein; fremde Seiten nicht.
 */

export type CspOptions = { nonce: string; dev?: boolean }

export function buildCsp({ nonce, dev = false }: CspOptions): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'blob:', 'data:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", ...(dev ? ['ws:'] : [])],
    'worker-src': ["'self'", 'blob:'],
    'frame-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
    'manifest-src': ["'self'"],
  }
  // Kein upgrade-insecure-requests: alle Quellen sind 'self' und die Seite läuft nur über HTTPS (HSTS)
  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ')
}

/** Zufälliger Nonce (128 Bit, base64) – je Anfrage neu. */
export function newNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

/** Header für alle Antworten (Seiten, API, Dateien). HSTS setzt zusätzlich Caddy. */
export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
]

export const HSTS = { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }
