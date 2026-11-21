import type { NextConfig } from 'next'

/** Alte URLs von www.bogensport-plauen.de (statisches HTML/PHP) → neue Seiten, dauerhaft (308). */
const LEGACY: Record<string, string> = {
  '/index.html': '/',
  '/index.php': '/',
  '/information.html': '/verein',
  '/training.html': '/training',
  '/anfaengerkurs.html': '/anfaengerkurs',
  '/blog.html': '/aktuelles',
  '/archive.html': '/aktuelles',
  '/gallery.html': '/galerie',
  '/gallery.php': '/galerie',
  '/gallery-2014.html': '/galerie',
  '/gallery-2015.html': '/galerie',
  '/sponsors.html': '/sponsoren',
  '/contact.html': '/kontakt',
  '/imprint.html': '/impressum',
  '/Datenschutz.html': '/datenschutz',
}

/**
 * Anmeldung läuft ausschließlich über die Website (Rate-Limits, 2FA) – die Auth-Ansichten des
 * Admin-Panels leiten dorthin um (temporär, 307). Payload hängt `?redirect=` an /admin/login an;
 * Next übernimmt die Query automatisch.
 */
const ADMIN_AUTH: { source: string; destination: string }[] = [
  { source: '/admin/login', destination: '/login' },
  { source: '/admin/forgot', destination: '/passwort-vergessen' },
  { source: '/admin/reset/:token', destination: '/passwort-zuruecksetzen?token=:token' },
  { source: '/admin/create-first-user', destination: '/login' },
]

export const redirects: NextConfig['redirects'] = async () => [
  ...Object.entries(LEGACY).map(([source, destination]) => ({ source, destination, permanent: true })),
  ...ADMIN_AUTH.map((r) => ({ ...r, permanent: false })),
]
