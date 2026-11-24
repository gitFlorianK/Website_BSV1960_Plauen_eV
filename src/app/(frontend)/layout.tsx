import type { Metadata, Viewport } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'
import { draftMode } from 'next/headers'
import { connection } from 'next/server'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { mergeOpenGraph, SITE_NAME } from '@/utilities/mergeOpenGraph'
import { getServerSideURL } from '@/utilities/getURL'

import './globals.css'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce-CSP (src/proxy.ts): Next versieht Skripte nur beim Rendern je Anfrage mit dem Nonce –
  // statische/ISR-Seiten hätten keinen und würden blockiert. Daher alle Seiten dynamisch.
  await connection()
  const { isEnabled } = await draftMode()

  return (
    // suppressHydrationWarning: Browser-Erweiterungen und -Funktionen (Übersetzen, Dunkelmodus …) ändern
    // Klassen/Attribute an <html> vor der Hydration. Gilt nur für dieses Element, nicht für den Inhalt.
    <html
      data-scroll-behavior="smooth"
      className={cn(GeistSans.variable, GeistMono.variable)}
      lang="de"
      suppressHydrationWarning
    >
      <body>
        <AdminBar adminBarProps={{ preview: isEnabled }} />
        <Header />
        <main id="inhalt" className="flex-1" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  title: { default: `${SITE_NAME} – Bogensport im Vogtland`, template: `%s` },
  description:
    'Bogensportverein 1960 Plauen e. V. – Recurve, Compound, Langbogen und Jagdbogen. Trainingszeiten, Anfängerkurse, Termine und Ergebnisse.',
  openGraph: mergeOpenGraph(),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#ff8d00',
}
