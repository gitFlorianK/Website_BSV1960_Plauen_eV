import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

import { hasRole, isLoggedIn } from '@/access'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Interne Dokumente für Mitglieder (Satzung, Ordnungen, Protokolle).
 * Ausgabe nur über /api/documents/file/... mit Login-Prüfung, nie aus public/.
 */
export const Documents: CollectionConfig<'documents'> = {
  slug: 'documents',
  labels: { singular: 'Dokument', plural: 'Dokumente' },
  access: {
    read: isLoggedIn,
    create: hasRole('vorstand'),
    update: hasRole('vorstand'),
    delete: hasRole('vorstand'),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'updatedAt'],
    group: 'Verwaltung',
  },
  fields: [
    { name: 'title', label: 'Titel', type: 'text', required: true },
    {
      name: 'category',
      label: 'Kategorie',
      type: 'select',
      required: true,
      options: [
        { label: 'Satzung & Ordnungen', value: 'statutes' },
        { label: 'Protokolle', value: 'minutes' },
        { label: 'Formulare', value: 'forms' },
        { label: 'Sonstiges', value: 'other' },
      ],
    },
    { name: 'description', label: 'Beschreibung', type: 'textarea' },
  ],
  upload: {
    staticDir: path.resolve(dirname, '../../uploads/documents'),
    mimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
    ],
  },
}
