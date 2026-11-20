import { z } from 'zod'

import { ageOn, dayInClubTz } from '@/utilities/dates'

// Fallback-Meldungen (z. B. fehlende Felder) auf Deutsch
z.config(z.locales.de())

/*
 * Serverseitige Validierung aller öffentlichen Formulare (Fehlermeldungen auf Deutsch, „du“).
 * Clientseitige HTML-Validierung ist nur Komfort – maßgeblich ist ausschließlich diese Prüfung.
 */

/** Steuerzeichen entfernen (außer Zeilenumbruch/Tab in Freitexten). */
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')

const text = (label: string, max: number) =>
  z
    .string()
    .transform((s) => clean(s).replace(/\s+/g, ' ').trim())
    .pipe(z.string().min(1, `Bitte ${label} angeben.`).max(max, `Höchstens ${max} Zeichen.`))

const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .transform((s) => (s ? clean(s).replace(/\s+/g, ' ').trim() : ''))
    .pipe(z.string().max(max, `Höchstens ${max} Zeichen.`))

const longText = (max: number, required: boolean) =>
  z
    .string()
    .optional()
    .transform((s) => (s ? clean(s).replace(/\r\n/g, '\n').trim() : ''))
    .pipe(
      required
        ? z.string().min(10, 'Bitte schreib uns ein paar Worte (mindestens 10 Zeichen).').max(max, `Höchstens ${max} Zeichen.`)
        : z.string().max(max, `Höchstens ${max} Zeichen.`),
    )

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Bitte eine gültige E-Mail-Adresse angeben.').max(254))

const phone = optionalText(50).refine((s) => s === '' || /^[0-9+()/\-\s.]{5,50}$/.test(s), {
  message: 'Bitte eine gültige Telefonnummer angeben.',
})

const checked = (message: string) => z.literal('on', { error: message })
const optionalCheck = z
  .literal('on')
  .optional()
  .transform((v) => v === 'on')

const birthDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Bitte das Geburtsdatum angeben.')
  .refine((s) => !Number.isNaN(Date.parse(s)) && s >= '1900-01-01' && s <= dayInClubTz(), {
    message: 'Bitte ein gültiges Geburtsdatum angeben.',
  })

const guardianFields = {
  guardianName: optionalText(200),
  guardianPhone: phone,
  guardianConsent: optionalCheck,
}

/** Bei Minderjährigen (am Tag der Anmeldung) sind Name und Zustimmung der Erziehungsberechtigten Pflicht. */
const requireGuardian = (
  v: { birthDate: string; guardianName: string; guardianConsent: boolean },
  ctx: z.RefinementCtx,
) => {
  if (ageOn(v.birthDate) >= 18) return
  if (!v.guardianName) {
    ctx.addIssue({ code: 'custom', path: ['guardianName'], message: 'Bei Minderjährigen bitte den Namen eines Erziehungsberechtigten angeben.' })
  }
  if (!v.guardianConsent) {
    ctx.addIssue({ code: 'custom', path: ['guardianConsent'], message: 'Bei Minderjährigen ist die Zustimmung der Erziehungsberechtigten nötig.' })
  }
}

const privacy = checked('Bitte bestätige, dass du die Datenschutzhinweise gelesen hast.')

export const CONTACT_TOPICS = {
  general: 'Allgemeine Frage',
  beginners: 'Anfängerkurs / Probetraining',
  event: 'Bogenschießen bei einer Veranstaltung',
  other: 'Sonstiges',
} as const

export const contactSchema = z.object({
  name: text('deinen Namen', 200),
  email,
  phone,
  topic: z.enum(Object.keys(CONTACT_TOPICS) as [keyof typeof CONTACT_TOPICS], { error: 'Bitte ein Thema wählen.' }),
  message: longText(5000, true),
  privacy,
})

export const BOW_TYPES = {
  undecided: 'Noch offen',
  recurve: 'Recurve',
  compound: 'Compound',
  longbow: 'Langbogen',
  hunting: 'Jagdbogen',
} as const

export const membershipSchema = z
  .object({
    firstName: text('deinen Vornamen', 100),
    lastName: text('deinen Nachnamen', 100),
    birthDate,
    street: text('Straße und Hausnummer', 200),
    postalCode: z.string().trim().regex(/^\d{5}$/, 'Bitte eine fünfstellige Postleitzahl angeben.'),
    city: text('den Ort', 100),
    email,
    phone,
    bowType: z.enum(Object.keys(BOW_TYPES) as [keyof typeof BOW_TYPES], { error: 'Bitte eine Bogenart wählen.' }),
    courseCompleted: optionalCheck,
    ...guardianFields,
    message: longText(3000, false),
    privacy,
  })
  .superRefine(requireGuardian)

export const courseRegistrationSchema = z
  .object({
    course: z.coerce.number({ error: 'Bitte einen Kurs wählen.' }).int().positive('Bitte einen Kurs wählen.'),
    firstName: text('den Vornamen', 100),
    lastName: text('den Nachnamen', 100),
    birthDate,
    email,
    phone,
    ...guardianFields,
    message: longText(2000, false),
    photosAllowed: optionalCheck,
    privacy,
  })
  .superRefine(requireGuardian)

export type ContactInput = z.infer<typeof contactSchema>
export type MembershipInput = z.infer<typeof membershipSchema>
export type CourseRegistrationInput = z.infer<typeof courseRegistrationSchema>

/** Erste Fehlermeldung je Feld. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    out[key] ??= issue.message
  }
  return out
}
