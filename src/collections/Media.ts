import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

import { isStaff, hasRole, publicOrMembers } from '@/access'
import { visibilityField } from '@/fields/visibility'
import { cacheHeaders, STRIP_AND_LIMIT_ORIGINAL } from '@/lib/uploads/hardening'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Bilder und öffentliche PDFs. Dateien liegen bewusst NICHT unter public/, sondern werden
 * ausschließlich über /api/media/file/... ausgeliefert – dort greift die Access-Regel
 * (Sichtbarkeit „Nur Mitglieder“). Kein SVG (XSS-Risiko).
 */
export const Media: CollectionConfig<'media'> = {
  slug: 'media',
  labels: { singular: 'Medium', plural: 'Medien' },
  access: {
    read: publicOrMembers,
    create: isStaff,
    update: isStaff,
    delete: hasRole('vorstand', 'redakteur'),
  },
  admin: {
    group: 'Inhalte',
    defaultColumns: ['filename', 'alt', 'visibility', 'updatedAt'],
  },
  fields: [
    {
      name: 'alt',
      label: 'Alternativtext',
      type: 'text',
      required: true,
      admin: { description: 'Kurze Bildbeschreibung für Screenreader und Suchmaschinen.' },
    },
    {
      name: 'caption',
      label: 'Bildunterschrift',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
    visibilityField,
  ],
  upload: {
    staticDir: path.resolve(dirname, '../../uploads/media'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf'],
    resizeOptions: STRIP_AND_LIMIT_ORIGINAL,
    // Browser darf eine Stunde cachen, geteilte Caches nie (interne Bilder hängen am Login)
    modifyResponseHeaders: cacheHeaders('private, max-age=3600'),
    // URL-Einfügen lädt im Browser von fremden Servern – verbietet die CSP ohnehin
    pasteURL: false,
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    imageSizes: [
      { name: 'thumbnail', width: 300 },
      { name: 'square', width: 500, height: 500 },
      { name: 'small', width: 600 },
      { name: 'medium', width: 900 },
      { name: 'large', width: 1400 },
      { name: 'xlarge', width: 1920 },
      { name: 'og', width: 1200, height: 630, crop: 'center' },
    ],
  },
}
