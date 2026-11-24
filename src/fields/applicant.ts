import type { Field } from 'payload'

/*
 * Gemeinsame Felder der Formular-Collections mit Personendaten (Mitgliedsantrag, Kursanmeldung).
 * Angelegt werden die Datensätze nur in src/lib/forms/submit.ts.
 */

/** Vorname, Nachname, Geburtsdatum in einer Zeile. */
export const personRow: Field = {
  type: 'row',
  fields: [
    { name: 'firstName', label: 'Vorname', type: 'text', required: true, maxLength: 100 },
    { name: 'lastName', label: 'Nachname', type: 'text', required: true, maxLength: 100 },
    {
      name: 'birthDate',
      label: 'Geburtsdatum',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } },
    },
  ],
}

/** E-Mail und Telefon in einer Zeile. */
export const contactRow = (emailDescription?: string): Field => ({
  type: 'row',
  fields: [
    {
      name: 'email',
      label: 'E-Mail',
      type: 'email',
      required: true,
      ...(emailDescription ? { admin: { description: emailDescription } } : {}),
    },
    { name: 'phone', label: 'Telefon', type: 'text', maxLength: 50 },
  ],
})

/** Nur bei Minderjährigen befüllt. */
export const guardianGroup: Field = {
  name: 'guardian',
  label: 'Erziehungsberechtigte(r) (bei Minderjährigen)',
  type: 'group',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', label: 'Name', type: 'text', maxLength: 200 },
        { name: 'phone', label: 'Telefon', type: 'text', maxLength: 50 },
      ],
    },
  ],
}

/** Zeitpunkte der Einwilligungen (nur lesbar), optional um weitere Felder ergänzt. */
export const consentsGroup = (extra: Field[] = []): Field => ({
  name: 'consents',
  label: 'Einwilligungen',
  type: 'group',
  admin: { readOnly: true },
  fields: [
    { name: 'privacyAcceptedAt', label: 'Datenschutzhinweise akzeptiert am', type: 'date' },
    { name: 'guardianConsentAt', label: 'Zustimmung Erziehungsberechtigte am', type: 'date' },
    ...extra,
  ],
})
