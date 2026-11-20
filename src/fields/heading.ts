import type { Field } from 'payload'

/** Gemeinsame Felder für Blöcke: Überschrift + Einleitung. */
export const headingFields: Field[] = [
  {
    type: 'row',
    fields: [
      { name: 'heading', label: 'Überschrift', type: 'text' },
      { name: 'intro', label: 'Einleitung', type: 'textarea' },
    ],
  },
]
