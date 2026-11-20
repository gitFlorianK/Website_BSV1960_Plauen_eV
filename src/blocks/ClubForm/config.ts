import type { Block } from 'payload'

import { headingFields } from '@/fields/heading'

/** Fest programmierte Vereinsformulare (Validierung, Spamschutz und Ablauf im Code, nicht konfigurierbar). */
export const ClubForm: Block = {
  slug: 'clubForm',
  interfaceName: 'ClubFormBlock',
  labels: { singular: 'Formular', plural: 'Formulare' },
  fields: [
    {
      name: 'form',
      label: 'Formular',
      type: 'select',
      required: true,
      options: [
        { label: 'Kontaktformular', value: 'contact' },
        { label: 'Mitgliedsantrag', value: 'membership' },
        { label: 'Kursanmeldung (Anfängerkurse)', value: 'courseRegistration' },
      ],
    },
    ...headingFields,
    {
      name: 'closedText',
      label: 'Text, wenn keine Anmeldung möglich ist',
      type: 'textarea',
      admin: {
        condition: (_, sibling) => sibling?.form === 'courseRegistration',
        description: 'Wird angezeigt, wenn gerade kein Kurs zur Anmeldung offen ist.',
      },
    },
  ],
}
