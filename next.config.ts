import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)
import { redirects } from './redirects'
import { HSTS, SECURITY_HEADERS } from './src/lib/security/csp'

const NEXT_PUBLIC_SERVER_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.__NEXT_PRIVATE_ORIGIN || 'http://localhost:3000'

const nextConfig: NextConfig = {
  // Temporarily required on Windows until Next.js fixes Turbopack Sass resolution.
  // See: https://github.com/vercel/next.js/issues/86431
  sassOptions: {
    loadPaths: ['./node_modules/@payloadcms/ui/dist/scss/'],
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
    qualities: [100],
    remotePatterns: [
      ...[NEXT_PUBLIC_SERVER_URL /* 'https://example.com' */].map((item) => {
        const url = new URL(item)

        return {
          hostname: url.hostname,
          protocol: url.protocol.replace(':', '') as 'http' | 'https',
        }
      }),
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
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
