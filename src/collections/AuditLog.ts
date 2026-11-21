import type { CollectionConfig } from 'payload'

import { hasRole, nobody } from '@/access'
import { AUDIT_ACTIONS } from '@/lib/audit'

/**
 * Sicherheitsprotokoll (docs/konzept.md, Abschnitt 5): Anmeldungen, Fehlversuche, Änderungen an
 * Konten/Rollen/2FA und Löschungen. Schreibt nur Server-Code (`src/lib/audit.ts`); niemand kann
 * Einträge über API oder Admin anlegen, ändern oder löschen. Lesen nur Administratoren.
 * Personenbezug minimal: Ziel nur als ID, IP und unbekannte E-Mail-Adressen nur als HMAC-Hash.
 * Aufbewahrung: 12 Monate (Job `purge-retention`).
 */
export const AuditLog: CollectionConfig<'audit-log'> = {
  slug: 'audit-log',
  labels: { singular: 'Protokolleintrag', plural: 'Sicherheitsprotokoll' },
  access: { read: hasRole('admin'), create: nobody, update: nobody, delete: nobody },
  admin: {
    group: 'Verwaltung',
    useAsTitle: 'action',
    defaultColumns: ['createdAt', 'action', 'actorName', 'targetCollection', 'targetId'],
    description: 'Sicherheitsrelevante Ereignisse der letzten 12 Monate. Nur lesbar.',
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'action',
      label: 'Ereignis',
      type: 'select',
      required: true,
      index: true,
      options: Object.entries(AUDIT_ACTIONS).map(([value, label]) => ({ value, label })),
    },
    { name: 'actor', label: 'Ausgeführt von', type: 'relationship', relationTo: 'users', index: true },
    {
      name: 'actorName',
      label: 'Name (zum Zeitpunkt)',
      type: 'text',
      admin: { description: 'Bleibt erhalten, auch wenn das Konto später gelöscht wird.' },
    },
    { name: 'targetCollection', label: 'Betrifft (Sammlung)', type: 'text' },
    { name: 'targetId', label: 'Betrifft (ID)', type: 'text', index: true },
    { name: 'ipHash', label: 'IP (gehasht)', type: 'text' },
    { name: 'emailHash', label: 'E-Mail (gehasht)', type: 'text', admin: { description: 'Nur bei Anmeldeversuchen für unbekannte Konten.' } },
    { name: 'details', label: 'Details', type: 'json' },
  ],
  timestamps: true,
}
