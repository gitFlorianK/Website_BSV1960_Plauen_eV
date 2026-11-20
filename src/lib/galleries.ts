import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'

import type { Media } from '@/payload-types'
import type { LightboxImage } from '@/components/Gallery/Lightbox'
import { getMediaUrl } from '@/utilities/getMediaUrl'

/**
 * Media → Lightbox-Daten. Bilder „nur für Mitglieder“ werden (noch) ausgelassen: next/image
 * lädt serverseitig ohne Login-Cookie. Auslieferung für Mitglieder folgt mit dem Mitgliederbereich.
 */
export const toLightboxImages = (images: (number | Media)[] | null | undefined): LightboxImage[] =>
  (images ?? [])
    .filter((m): m is Media => typeof m === 'object' && m !== null && m.visibility === 'public' && Boolean(m.url))
    .map((m) => ({
      id: m.id,
      thumb: getMediaUrl(m.sizes?.small?.url || m.url, m.updatedAt),
      full: getMediaUrl(m.sizes?.xlarge?.url || m.sizes?.large?.url || m.url, m.updatedAt),
      width: m.sizes?.xlarge?.width || m.sizes?.large?.width || m.width || 1200,
      height: m.sizes?.xlarge?.height || m.sizes?.large?.height || m.height || 800,
      alt: m.alt,
      caption: m.caption ? convertLexicalToPlaintext({ data: m.caption }).trim() || null : null,
    }))
