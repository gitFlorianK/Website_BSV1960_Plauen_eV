import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)
import { redirects } from './redirects'
import { HSTS, SECURITY_HEADERS } from './src/lib/security/csp'

const nextConfig: NextConfig = {
  // Eigenständiger Server für das Container-Image (Dockerfile): .next/standalone mit server.js
  output: 'standalone',
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
    // Einzige erlaubte Qualitätsstufe (src/components/Media/ImageMedia) – verhindert beliebige Varianten per URL
    qualities: [75],
    // Keine Fremdquellen: Bilder kommen nur relativ über /api/media/file (getMediaUrl)
    remotePatterns: [],
  },
  reactStrictMode: true,
  poweredByHeader: false,
  redirects,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [...SECURITY_HEADERS, ...(process.env.NODE_ENV === 'production' ? [HSTS] : [])],
      },
      {
        // Sitemap wird zur Laufzeit erzeugt – Crawler dürfen eine Stunde cachen
        source: '/sitemap.xml',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
      {
        // REST-API (JSON): keine Inhalte nachladen, nicht einbetten (Seiten-CSP setzt src/proxy.ts)
        source: '/api/:path*',
        headers: [{ key: 'Content-Security-Policy', value: "default-src 'none'; frame-ancestors 'self'; sandbox" }],
      },
      {
        // Hochgeladene Dateien: ohne sandbox, sonst zeigt der Browser PDFs nicht an. Gefährliche Typen
        // (SVG, HTML) lässt der Upload gar nicht zu; nosniff verhindert Umdeutung. Spätere Regel gewinnt.
        source: '/api/:collection/file/:path*',
        headers: [{ key: 'Content-Security-Policy', value: "script-src 'none'; frame-src 'none'; frame-ancestors 'self'" }],
      },
    ]
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
