import type { UploadConfig } from 'payload'

/*
 * Gemeinsame Upload-Härtung für Medien und Dokumente (docs/konzept.md, Abschnitt 5).
 */

/**
 * Original-Bilder neu kodieren: Payload dreht dabei nach EXIF-Orientierung (`rotate()`) und
 * verwirft alle Metadaten (EXIF inkl. GPS, Kameraseriennummer) – vorher blieb das Original
 * unverändert gespeichert. Gleichzeitig begrenzt auf 2560 px (keine Vollauflösungen auf dem Server).
 */
export const STRIP_AND_LIMIT_ORIGINAL: UploadConfig['resizeOptions'] = {
  width: 2560,
  height: 2560,
  fit: 'inside',
  withoutEnlargement: true,
}

/** Cache-Control für Dateiantworten: nie in geteilten Caches (Proxy/CDN) – Sichtbarkeit hängt am Login. */
export const cacheHeaders =
  (value: string): NonNullable<UploadConfig['modifyResponseHeaders']> =>
  ({ headers }) => {
    headers.set('Cache-Control', value)
    return headers
  }
