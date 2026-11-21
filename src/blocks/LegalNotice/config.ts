import type { Block } from 'payload'

/**
 * Pflichtangaben für Impressum und Datenschutzerklärung – Daten kommen aus den Vereinsdaten bzw.
 * (Löschfristen) direkt aus `src/lib/retention.ts`, damit Text und Technik nicht auseinanderlaufen.
 */
export const LegalNotice: Block = {
  slug: 'legalNotice',
  interfaceName: 'LegalNoticeBlock',
  labels: { singular: 'Rechtliche Pflichtangaben', plural: 'Rechtliche Pflichtangaben' },
  fields: [
    {
      name: 'variant',
      label: 'Inhalt',
      type: 'select',
      defaultValue: 'imprint',
      required: true,
      admin: { description: 'Daten aus „Verwaltung → Vereinsdaten“ bzw. aus der Systemkonfiguration.' },
      options: [
        { label: 'Impressum (Anbieter, Vertretung, Register, Kontakt)', value: 'imprint' },
        { label: 'Verantwortlicher (Datenschutzerklärung)', value: 'controller' },
        { label: 'Speicherdauer/Löschfristen (Datenschutzerklärung, aus dem System)', value: 'retention' },
      ],
    },
  ],
}
