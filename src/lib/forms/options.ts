/** Auswahllisten der Formulare – getrennt von den zod-Schemas, damit der Browser kein zod lädt. */

export const CONTACT_TOPICS = {
  general: 'Allgemeine Frage',
  beginners: 'Anfängerkurs / Probetraining',
  event: 'Bogenschießen bei einer Veranstaltung',
  other: 'Sonstiges',
} as const

export const BOW_TYPES = {
  undecided: 'Noch offen',
  recurve: 'Recurve',
  compound: 'Compound',
  longbow: 'Langbogen',
  hunting: 'Jagdbogen',
} as const
