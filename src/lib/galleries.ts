import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'

import type { Media } from '@/payload-types'
import type { LightboxImage } from '@/components/Gallery/Lightbox'
import { getMediaUrl } from '@/utilities/getMediaUrl'

/**
 * Media → Lightbox-Daten. Öffentlich: nur Bilder mit `visibility: public` (über den Bildoptimierer).
 * Im Mitgliederbereich (`members: true`) auch interne Bilder – diese lädt der Browser direkt über
 * /api/media/file/… mit Login-Cookie (`unoptimized`), denn der Optimierer lädt ohne Cookie.
 */
export const toLightboxImages = (
  images: (number | Media)[] | null | undefined,
  { members = false }: { members?: boolean } = {},
): LightboxImage[] =>
  (images ?? [])
    .filter(
      (m): m is Media => typeof m === 'object' && m !== null && (members || m.visibility === 'public') && Boolean(m.url),
    )
    .map((m) => ({
      unoptimized: m.visibility !== 'public',
      id: m.id,
      thumb: getMediaUrl(m.sizes?.small?.url || m.url, m.updatedAt),
      full: getMediaUrl(m.sizes?.xlarge?.url || m.sizes?.large?.url || m.url, m.updatedAt),
      width: m.sizes?.xlarge?.width || m.sizes?.large?.width || m.width || 1200,
      height: m.sizes?.xlarge?.height || m.sizes?.large?.height || m.height || 800,
      alt: m.alt,
      caption: m.caption ? convertLexicalToPlaintext({ data: m.caption }).trim() || null : null,
    }))
