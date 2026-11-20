import type { Payload } from 'payload'
import type { z } from 'zod'

import { verifyAltcha } from '@/lib/altcha'
import { adminDocUrl, clubAddress, sendText } from '@/lib/mail'
import { hitRateLimit } from '@/lib/rateLimit'
import { keyedHash, newToken } from '@/lib/secrets'
import { ageOn, dayInClubTz } from '@/utilities/dates'
import { getServerSideURL } from '@/utilities/getURL'
import { routes } from '@/utilities/routes'

import {
  BOW_TYPES,
  CONTACT_TOPICS,
  contactSchema,
  courseRegistrationSchema,
  fieldErrors,
  membershipSchema,
} from './schemas'
import type { FormState } from './types'

/*
 * Ablauf jeder Übermittlung (unabhängig von Next.js, damit testbar):
 * Honeypot → Rate-Limit (IP) → Validierung → ALTCHA (einmalig) → Speichern (overrideAccess) → Mails.
 * Die Collections erlauben `create` über die API niemandem – nur dieser Code legt Datensätze an.
 */

export type FormInput = Record<string, string | undefined>
export type SubmitContext = { ip: string; now?: Date }

export const HONEYPOT_FIELD = 'website'
export const ALTCHA_FIELD = 'altcha'
export const CONFIRM_TTL_HOURS = 48

const LIMITS = {
  contact: { limit: 5, windowSec: 60 * 60 },
  membership: { limit: 3, windowSec: 60 * 60 },
  course: { limit: 5, windowSec: 60 * 60 },
  courseEmail: { limit: 3, windowSec: 24 * 60 * 60 },
} as const

const GENERIC_ERROR = 'Das hat leider nicht geklappt. Bitte versuch es später noch einmal oder schreib uns eine E-Mail.'

/** Felder, die nach einem Fehler wieder ins Formular dürfen (keine Token/Payloads). */
const echo = (input: FormInput): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(input)) {
    if (k === ALTCHA_FIELD || k === HONEYPOT_FIELD || typeof v !== 'string') continue
    out[k] = v.slice(0, 5000)
  }
  return out
}

const error = (input: FormInput, message: string, errors?: Record<string, string>): FormState => ({
  status: 'error',
  message,
  fieldErrors: errors,
  values: echo(input),
})

type Guard = { ok: true } | { ok: false; state: FormState }

async function guard(
  payload: Payload,
  form: keyof typeof LIMITS,
  input: FormInput,
  { ip }: SubmitContext,
): Promise<Guard> {
  const rl = LIMITS[form]
  const res = await hitRateLimit(payload, `form:${form}:${keyedHash('ip', ip)}`, rl.limit, rl.windowSec)
  if (!res.ok) {
    const minutes = Math.max(1, Math.ceil(res.retryAfterSec / 60))
    return { ok: false, state: error(input, `Zu viele Anfragen. Bitte versuch es in ${minutes} Minuten noch einmal.`) }
  }
  return { ok: true }
}

/** Honeypot ausgefüllt → so tun, als hätte alles geklappt (Bots bekommen kein Signal). */
const isBot = (input: FormInput) => Boolean(input[HONEYPOT_FIELD])

async function checkAltcha(payload: Payload, input: FormInput): Promise<FormState | null> {
  if (await verifyAltcha(payload, input[ALTCHA_FIELD])) return null
  return error(input, 'Die Spamschutz-Prüfung ist fehlgeschlagen. Bitte bestätige erneut, dass du kein Roboter bist.', {
    altcha: 'Bitte die Spamschutz-Prüfung abschließen.',
  })
}

function parse<S extends z.ZodType>(schema: S, input: FormInput): { data: z.output<S> } | { state: FormState } {
  const result = schema.safeParse(input)
  if (result.success) return { data: result.data }
  return { state: error(input, 'Bitte prüfe die markierten Felder.', fieldErrors(result.error)) }
}

/* ------------------------------------------------------------------ Kontakt */

export async function submitContact(payload: Payload, input: FormInput, ctx: SubmitContext): Promise<FormState> {
  const success: FormState = { status: 'success', message: 'Danke für deine Nachricht! Wir melden uns so bald wie möglich.' }
  if (isBot(input)) return success

  const g = await guard(payload, 'contact', input, ctx)
  if (!g.ok) return g.state
  const parsed = parse(contactSchema, input)
  if ('state' in parsed) return parsed.state
  const altcha = await checkAltcha(payload, input)
  if (altcha) return altcha

  const d = parsed.data
  try {
    const doc = await payload.create({
      collection: 'contact-requests',
      overrideAccess: true,
      data: { name: d.name, email: d.email, phone: d.phone || undefined, topic: d.topic, message: d.message, status: 'new' },
    })
    const to = await clubAddress(payload)
    if (to) {
      await sendText(payload, {
        to,
        replyTo: d.email,
        subject: `Kontaktanfrage: ${CONTACT_TOPICS[d.topic]}`,
        text: [
          `Neue Kontaktanfrage über die Website (${CONTACT_TOPICS[d.topic]}).`,
          '',
          `Name: ${d.name}`,
          `E-Mail: ${d.email}`,
          d.phone ? `Telefon: ${d.phone}` : null,
          '',
          d.message,
          '',
          `Im Admin: ${adminDocUrl('contact-requests', doc.id)}`,
          'Antworten geht direkt per „Antworten“ an die absendende Person.',
        ]
          .filter((l) => l !== null)
          .join('\n'),
      })
    }
    return success
  } catch (err) {
    payload.logger.error({ err, msg: 'Kontaktanfrage konnte nicht gespeichert werden' })
    return error(input, GENERIC_ERROR)
  }
}

/* --------------------------------------------------------- Mitgliedsantrag */

export async function submitMembership(payload: Payload, input: FormInput, ctx: SubmitContext): Promise<FormState> {
  const success: FormState = {
    status: 'success',
    message: 'Vielen Dank für deinen Antrag! Der Vorstand meldet sich bei dir – in der Regel innerhalb von zwei Wochen.',
  }
  if (isBot(input)) return success

  const g = await guard(payload, 'membership', input, ctx)
  if (!g.ok) return g.state
  const parsed = parse(membershipSchema, input)
  if ('state' in parsed) return parsed.state
  const altcha = await checkAltcha(payload, input)
  if (altcha) return altcha

  const d = parsed.data
  const now = (ctx.now ?? new Date()).toISOString()
  const minor = ageOn(d.birthDate) < 18
  try {
    const doc = await payload.create({
      collection: 'membership-applications',
      overrideAccess: true,
      data: {
        firstName: d.firstName,
        lastName: d.lastName,
        birthDate: d.birthDate,
        street: d.street,
        postalCode: d.postalCode,
        city: d.city,
        email: d.email,
        phone: d.phone || undefined,
        bowType: d.bowType,
        courseCompleted: d.courseCompleted,
        guardian: minor ? { name: d.guardianName, phone: d.guardianPhone || undefined } : undefined,
        message: d.message || undefined,
        consents: { privacyAcceptedAt: now, guardianConsentAt: minor ? now : undefined },
        status: 'new',
      },
    })
    const to = await clubAddress(payload)
    if (to) {
      await sendText(payload, {
        to,
        subject: 'Neuer Mitgliedsantrag',
        text: [
          'Über die Website ist ein neuer Mitgliedsantrag eingegangen.',
          `Bogenart: ${BOW_TYPES[d.bowType]}${minor ? ' · minderjährig' : ''}`,
          '',
          `Alle Angaben im Admin: ${adminDocUrl('membership-applications', doc.id)}`,
        ].join('\n'),
      })
    }
    return success
  } catch (err) {
    payload.logger.error({ err, msg: 'Mitgliedsantrag konnte nicht gespeichert werden' })
    return error(input, GENERIC_ERROR)
  }
}

/* ----------------------------------------------------------- Kursanmeldung */

export async function submitCourseRegistration(
  payload: Payload,
  input: FormInput,
  ctx: SubmitContext,
): Promise<FormState> {
  const success: FormState = {
    status: 'success',
    message: `Fast geschafft! Wir haben dir eine E-Mail geschickt. Bitte bestätige die Anmeldung innerhalb von ${CONFIRM_TTL_HOURS} Stunden über den Link darin – erst dann ist sie gültig.`,
  }
  if (isBot(input)) return success

  const g = await guard(payload, 'course', input, ctx)
  if (!g.ok) return g.state
  const parsed = parse(courseRegistrationSchema, input)
  if ('state' in parsed) return parsed.state
  const d = parsed.data

  // Kurs prüfen (nur veröffentlichte, offene Kurse vor Anmeldeschluss)
  const course = await payload
    .findByID({ collection: 'courses', id: d.course, depth: 0, overrideAccess: false })
    .catch(() => null)
  const today = dayInClubTz(ctx.now ?? new Date())
  if (!course || (course.status !== 'open' && course.status !== 'waitlist')) {
    return error(input, 'Für diesen Kurs ist keine Anmeldung möglich.', { course: 'Bitte einen offenen Kurs wählen.' })
  }
  if (dayInClubTz(course.registrationDeadline) < today) {
    return error(input, 'Der Anmeldeschluss für diesen Kurs ist vorbei.', { course: 'Anmeldeschluss überschritten.' })
  }
  const firstSession = course.sessions?.[0]?.start
  const age = ageOn(d.birthDate, firstSession ?? today)
  if ((course.minAge && age < course.minAge) || (course.maxAge && age > course.maxAge)) {
    const range = course.maxAge ? `${course.minAge ?? 0}–${course.maxAge}` : `ab ${course.minAge}`
    return error(input, `Dieser Kurs ist für ${range} Jahre.`, { birthDate: `Altersgrenze des Kurses: ${range} Jahre.` })
  }

  // Pro E-Mail-Adresse begrenzen (schützt Dritte vor Bestätigungsmails in Serie)
  const perEmail = await hitRateLimit(
    payload,
    `form:courseEmail:${keyedHash('email', d.email)}`,
    LIMITS.courseEmail.limit,
    LIMITS.courseEmail.windowSec,
  )
  if (!perEmail.ok) return error(input, 'Für diese E-Mail-Adresse gab es heute schon mehrere Anmeldungen. Bitte melde dich bei uns.')

  const altcha = await checkAltcha(payload, input)
  if (altcha) return altcha

  const nowDate = ctx.now ?? new Date()
  const now = nowDate.toISOString()
  const minor = ageOn(d.birthDate) < 18
  const { token, hash } = newToken()
  const expiresAt = new Date(nowDate.getTime() + CONFIRM_TTL_HOURS * 3600 * 1000).toISOString()

  try {
    // Doppelte, noch aktive Anmeldung derselben Person → keine zweite anlegen, nur neuen Link senden
    const existing = await payload.find({
      collection: 'course-registrations',
      overrideAccess: true,
      depth: 0,
      limit: 1,
      where: {
        and: [
          { course: { equals: course.id } },
          { email: { equals: d.email } },
          { firstName: { equals: d.firstName } },
          { lastName: { equals: d.lastName } },
          { status: { not_equals: 'cancelled' } },
        ],
      },
    })
    const dup = existing.docs[0]
    if (dup && dup.status !== 'unconfirmed') {
      // Bereits bestätigt: neutrale Antwort, keine weitere Mail
      return { status: 'success', message: 'Diese Anmeldung liegt uns bereits vor. Bei Fragen melde dich gern bei uns.' }
    }

    const data = {
      course: course.id,
      status: 'unconfirmed' as const,
      firstName: d.firstName,
      lastName: d.lastName,
      birthDate: d.birthDate,
      email: d.email,
      phone: d.phone || undefined,
      guardian: minor ? { name: d.guardianName, phone: d.guardianPhone || undefined } : undefined,
      message: d.message || undefined,
      consents: {
        privacyAcceptedAt: now,
        guardianConsentAt: minor ? now : undefined,
        photosAllowed: d.photosAllowed,
      },
      confirmTokenHash: hash,
      confirmTokenExpiresAt: expiresAt,
    }
    if (dup) {
      await payload.update({ collection: 'course-registrations', id: dup.id, overrideAccess: true, data })
    } else {
      await payload.create({ collection: 'course-registrations', overrideAccess: true, data })
    }

    const link = `${getServerSideURL()}${routes.courseConfirm}?token=${encodeURIComponent(token)}`
    const sent = await sendText(payload, {
      to: d.email,
      subject: `Bitte bestätige die Anmeldung: ${course.title}`,
      text: [
        'Hallo,',
        '',
        `über unsere Website ist eine Anmeldung zum Kurs „${course.title}“ eingegangen.`,
        '',
        'Bitte bestätige sie über diesen Link:',
        link,
        '',
        `Der Link ist ${CONFIRM_TTL_HOURS} Stunden gültig. Erst nach der Bestätigung ist die Anmeldung gültig – Plätze werden in der Reihenfolge der Bestätigungen vergeben.`,
        '',
        'Du hast dich nicht angemeldet? Dann ignoriere diese E-Mail einfach. Unbestätigte Anmeldungen werden automatisch gelöscht.',
      ].join('\n'),
    })
    if (!sent) return error(input, GENERIC_ERROR)
    return success
  } catch (err) {
    payload.logger.error({ err, msg: 'Kursanmeldung konnte nicht gespeichert werden' })
    return error(input, GENERIC_ERROR)
  }
}
