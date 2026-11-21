import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { de } from '@payloadcms/translations/languages/de'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'
import { timingSafeEqual } from 'crypto'

import { userHasRole } from './access'
import { Categories } from './collections/Categories'
import { ContactRequests } from './collections/ContactRequests'
import { CourseRegistrations } from './collections/CourseRegistrations'
import { Courses } from './collections/Courses'
import { Documents } from './collections/Documents'
import { EventRegistrations } from './collections/EventRegistrations'
import { Events } from './collections/Events'
import { Galleries } from './collections/Galleries'
import { Locations } from './collections/Locations'
import { Media } from './collections/Media'
import { MembershipApplications } from './collections/MembershipApplications'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { RateLimits } from './collections/RateLimits'
import { Seasons } from './collections/Seasons'
import { Sponsors } from './collections/Sponsors'
import { TrainingSlots } from './collections/TrainingSlots'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { SiteSettings } from './globals/SiteSettings'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import type { User } from './payload-types'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const serverURL = getServerSideURL()
/**
 * Erlaubte Origins für Cookie-Anfragen (CSRF-Schutz; auch Server Actions prüfen darüber den Login).
 * Lokal zusätzlich beide Loopback-Schreibweisen – Browser/Tests nutzen teils 127.0.0.1.
 */
const trustedOrigins =
  process.env.NODE_ENV === 'production'
    ? [serverURL]
    : [...new Set([serverURL, 'http://localhost:3000', 'http://127.0.0.1:3000'])]

/** Konstantzeit-Vergleich für den Cron-Bearer-Token. */
const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export default buildConfig({
  admin: {
    components: {
      beforeLogin: ['@/components/BeforeLogin'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' – BSV 1960 Plauen',
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        { label: 'Mobil', name: 'mobile', width: 375, height: 667 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
  i18n: {
    supportedLanguages: { de },
    fallbackLanguage: 'de',
  },
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // Lokal synchronisiert Payload das Schema per push. In Produktion wird das Schema
    // ausschließlich über Migrationen geändert: `pnpm payload migrate` als expliziter
    // Deploy-Schritt vor dem Serverstart. Bewusst KEIN `prodMigrations` – das würde
    // auch bei jedem `next build` (NODE_ENV=production) gegen die DB migrieren.
  }),
  collections: [
    // Inhalte
    Pages,
    Posts,
    Galleries,
    Media,
    Categories,
    // Termine & Kurse
    Events,
    EventRegistrations,
    TrainingSlots,
    Courses,
    CourseRegistrations,
    // Verein
    Seasons,
    Locations,
    Sponsors,
    // Verwaltung
    ContactRequests,
    MembershipApplications,
    Documents,
    Users,
    // intern
    RateLimits,
  ],
  globals: [SiteSettings, Header, Footer],
  // Ohne SMTP_HOST (z. B. CI) gibt Payload Mails nur im Log aus.
  email: process.env.SMTP_HOST
    ? nodemailerAdapter({
        defaultFromAddress: process.env.MAIL_FROM_ADDRESS || 'noreply@bogensport-plauen.de',
        defaultFromName: process.env.MAIL_FROM_NAME || 'BSV 1960 Plauen',
        // Verbindung nur beim Start des Produktivservers prüfen (nicht im Build, nicht lokal)
        skipVerify:
          process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE === 'phase-production-build',
        transportOptions: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true',
          // Ohne Implicit TLS (Port 587) STARTTLS erzwingen – außer für lokale Hosts (Mailpit)
          requireTLS:
            process.env.SMTP_SECURE !== 'true' &&
            !['localhost', '127.0.0.1', 'mailpit'].includes(process.env.SMTP_HOST),
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        },
      })
    : undefined,
  cors: trustedOrigins,
  // Cookie-basierte Requests werden nur von der eigenen Origin akzeptiert.
  csrf: trustedOrigins,
  // Das Frontend nutzt die Local API, der Admin REST – GraphQL wird nicht gebraucht.
  graphQL: { disable: true },
  upload: {
    limits: { fileSize: 20 * 1024 * 1024 },
  },
  plugins,
  secret: process.env.PAYLOAD_SECRET || '',
  sharp,
  telemetry: false,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        if (userHasRole(req.user as User | null, 'admin')) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false
        const authHeader = req.headers.get('authorization') ?? ''
        return safeEqual(authHeader, `Bearer ${secret}`)
      },
    },
    tasks: [],
  },
})
