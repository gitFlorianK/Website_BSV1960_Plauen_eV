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

export const redirects: NextConfig['redirects'] = async () =>
  Object.entries(LEGACY).map(([source, destination]) => ({ source, destination, permanent: true }))
