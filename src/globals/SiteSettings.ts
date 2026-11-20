import type { GlobalConfig } from 'payload'

import { anyone, hasRole } from '@/access'
import { revalidateGlobal } from '@/hooks/revalidate'

/** Zentrale Vereinsdaten – einzige Quelle für Kontakt, Impressum und Footer. */
export const SiteSettings: GlobalConfig<'site-settings'> = {
  slug: 'site-settings',
  label: 'Vereinsdaten',
  access: {
    read: anyone,
    update: hasRole('vorstand'),
  },
  admin: { group: 'Verwaltung' },
  hooks: { afterChange: [revalidateGlobal] },
  fields: [
    {
      name: 'clubName',
      label: 'Vereinsname',
      type: 'text',
      required: true,
      defaultValue: 'Bogensportverein 1960 Plauen e. V.',
    },
    { name: 'shortName', label: 'Kurzname', type: 'text', defaultValue: 'BSV 1960 Plauen' },
    { name: 'foundedOn', label: 'Gründungsdatum', type: 'date', defaultValue: '1960-06-18' },
    {
      name: 'address',
      label: 'Postanschrift',
      type: 'group',
      fields: [
        { name: 'careOf', label: 'z. Hd.', type: 'text' },
        { name: 'street', label: 'Straße', type: 'text' },
        {
          type: 'row',
          fields: [
            { name: 'postalCode', label: 'PLZ', type: 'text' },
            { name: 'city', label: 'Ort', type: 'text', defaultValue: 'Plauen' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'email', label: 'E-Mail (öffentlich)', type: 'email' },
        { name: 'phone', label: 'Telefon (öffentlich)', type: 'text' },
      ],
    },
    {
      name: 'register',
      label: 'Vereinsregister',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'court', label: 'Registergericht', type: 'text', defaultValue: 'Amtsgericht Plauen' },
            { name: 'number', label: 'Registernummer', type: 'text', defaultValue: 'VR 120' },
          ],
        },
      ],
    },
    {
      name: 'board',
      label: 'Vorstand',
      type: 'array',
      labels: { singular: 'Vorstandsmitglied', plural: 'Vorstandsmitglieder' },
      admin: { description: 'Vertretungsberechtigte für Impressum und Vereinsseite.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'position', label: 'Funktion', type: 'text', required: true },
          ],
        },
        { name: 'photo', label: 'Foto', type: 'upload', relationTo: 'media' },
        {
          name: 'representative',
          label: 'Vertretungsberechtigt (Impressum)',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
    },
    {
      name: 'privacyContact',
      label: 'Ansprechpartner Datenschutz',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'email', label: 'E-Mail', type: 'email' },
          ],
        },
      ],
    },
    {
      name: 'socialLinks',
      label: 'Social Media',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', label: 'Bezeichnung', type: 'text', required: true },
            {
              name: 'url',
              label: 'URL',
              type: 'text',
              required: true,
              validate: (value: unknown) =>
                !value || /^https:\/\/\S+$/.test(String(value)) || 'Bitte eine https://-Adresse angeben.',
            },
          ],
        },
      ],
    },
  ],
}
