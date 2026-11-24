import type { Media } from '@/payload-types'

/**
 * Das Bild, wenn es geladen und öffentlich ist, sonst `null`. Nur solche Bilder dürfen über
 * next/image (`<Media>`) ausgegeben werden – der Optimierer lädt ohne Login-Cookie.
 */
export const publicMedia = (m: number | Media | null | undefined): Media | null =>
  typeof m === 'object' && m !== null && m.visibility === 'public' ? m : null
