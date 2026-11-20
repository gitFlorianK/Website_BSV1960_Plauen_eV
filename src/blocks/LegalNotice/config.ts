import type { Block } from 'payload'

/** Pflichtangaben nach § 5 DDG – Daten kommen aus den Vereinsdaten (Single Source of Truth). */
export const LegalNotice: Block = {
  slug: 'legalNotice',
  interfaceName: 'LegalNoticeBlock',
  labels: { singular: 'Impressumsangaben (§ 5 DDG)', plural: 'Impressumsangaben' },
  fields: [
    {
      name: 'variant',
      label: 'Inhalt',
      type: 'select',
      defaultValue: 'imprint',
      required: true,
      admin: { description: 'Daten aus „Verwaltung → Vereinsdaten“.' },
      options: [
        { label: 'Impressum (Anbieter, Vertretung, Register, Kontakt)', value: 'imprint' },
        { label: 'Verantwortlicher (Datenschutzerklärung)', value: 'controller' },
      ],
    },
  ],
}
