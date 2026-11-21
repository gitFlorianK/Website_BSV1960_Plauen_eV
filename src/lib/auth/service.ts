import type { Payload } from 'payload'

import { verifyAltcha } from '@/lib/altcha'
import { sendText } from '@/lib/mail'
import { hitRateLimit } from '@/lib/rateLimit'
import { keyedHash } from '@/lib/secrets'
import type { User } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { routes } from '@/utilities/routes'

import { AUTH_ERROR, authErrorCode } from './errors'
import { checkPassword } from './password'

/*
 * Anmeldung und Passwort-Flows über die Local API. Next-unabhängig (testbar); Cookies setzen
 * die Server Actions in ./actions.ts. Antworten verraten nie, ob ein Konto existiert.
 */

export type Ctx = { ip: string }

export type LoginResult =
  | { ok: true; token: string; exp: number; user: User }
  | {
      ok: false
      error: 'invalid' | 'rateLimited' | 'disabled' | 'twoFactorRequired' | 'twoFactorInvalid' | 'twoFactorLocked'
      retryAfterMin?: number
    }

const normalizeEmail = (email: unknown) => (typeof email === 'string' ? email.trim().toLowerCase().slice(0, 254) : '')

export async function login(
  payload: Payload,
  input: { email: unknown; password: unknown; code?: unknown },
  ctx: Ctx,
): Promise<LoginResult> {
  const email = normalizeEmail(input.email)
  const password = typeof input.password === 'string' ? input.password.slice(0, 256) : ''
  const code = typeof input.code === 'string' ? input.code.trim().slice(0, 32) : ''

  // Grob pro IP und pro Konto (zusätzlich zur Kontosperre von Payload nach 5 Fehlversuchen)
  for (const [key, limit] of [
    [`login:ip:${keyedHash('ip', ctx.ip)}`, 30],
    [`login:email:${keyedHash('email', email)}`, 15],
  ] as const) {
    const rl = await hitRateLimit(payload, key, limit, 15 * 60)
    if (!rl.ok) return { ok: false, error: 'rateLimited', retryAfterMin: Math.ceil(rl.retryAfterSec / 60) }
  }
  if (!email || !password) return { ok: false, error: 'invalid' }

  try {
    // Ohne `req` reicht Payload dieses Objekt unverändert als req.context durch (siehe afterLogin-Hook)
    const context: Record<string, unknown> = { twoFactorCode: code || undefined, captureToken: true }
    const result = await payload.login({ collection: 'users', data: { email, password }, context })
    const token = typeof context.issuedToken === 'string' ? context.issuedToken : null
    if (!token || !result.exp || !result.user) return { ok: false, error: 'invalid' }
    return { ok: true, token, exp: result.exp, user: result.user as User }
  } catch (err) {
    switch (authErrorCode(err)) {
      case AUTH_ERROR.disabled:
        return { ok: false, error: 'disabled' }
      case AUTH_ERROR.twoFactorRequired:
        return { ok: false, error: 'twoFactorRequired' }
      case AUTH_ERROR.twoFactorInvalid:
        return { ok: false, error: 'twoFactorInvalid' }
      case AUTH_ERROR.twoFactorLocked:
        return { ok: false, error: 'twoFactorLocked' }
      default:
        // Falsches Passwort, unbekanntes Konto, gesperrt nach Fehlversuchen → bewusst gleiche Antwort
        return { ok: false, error: 'invalid' }
    }
  }
}

/** Prüft das Passwort eines Kontos, ohne eine Session anzulegen (zählt Fehlversuche wie ein Login). */
export async function verifyPassword(payload: Payload, email: string, password: string): Promise<boolean> {
  try {
    await payload.login({ collection: 'users', data: { email, password }, context: { verifyPasswordOnly: true } })
    return false // sollte nie erreicht werden (Hook bricht ab)
  } catch (err) {
    return authErrorCode(err) === AUTH_ERROR.passwordVerified
  }
}

/* --------------------------------------------------------- Passwort vergessen */

export const RESET_TTL_MS = 60 * 60 * 1000

export async function requestPasswordReset(
  payload: Payload,
  input: { email: unknown; altcha: unknown },
  ctx: Ctx,
): Promise<{ ok: boolean; message: string }> {
  const neutral = {
    ok: true,
    message:
      'Wenn es zu dieser E-Mail-Adresse ein Konto gibt, haben wir dir einen Link zum Zurücksetzen geschickt. Er ist eine Stunde gültig.',
  }
  const email = normalizeEmail(input.email)
  const ipLimit = await hitRateLimit(payload, `reset:ip:${keyedHash('ip', ctx.ip)}`, 5, 60 * 60)
  if (!ipLimit.ok) return { ok: false, message: 'Zu viele Anfragen. Bitte versuch es später noch einmal.' }
  if (!(await verifyAltcha(payload, input.altcha))) {
    return { ok: false, message: 'Die Spamschutz-Prüfung ist fehlgeschlagen. Bitte versuch es noch einmal.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: 'Bitte eine gültige E-Mail-Adresse angeben.' }

  // Pro Adresse höchstens 3 Mails am Tag (Schutz vor Mailbombing) – Antwort trotzdem neutral
  const mailLimit = await hitRateLimit(payload, `reset:email:${keyedHash('email', email)}`, 3, 24 * 60 * 60)
  if (!mailLimit.ok) return neutral

  const { docs } = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0 })
  const user = docs[0]
  if (!user || user.accountDisabled) return neutral

  try {
    const token = await payload.forgotPassword({
      collection: 'users',
      data: { email },
      disableEmail: true,
      expiration: RESET_TTL_MS,
    })
    if (token) {
      const link = `${getServerSideURL()}${routes.resetPassword}?token=${encodeURIComponent(token)}`
      await sendText(payload, {
        to: email,
        subject: 'Passwort zurücksetzen – BSV 1960 Plauen',
        text: [
          'Hallo,',
          '',
          'für dein Konto im Mitgliederbereich wurde ein neues Passwort angefordert. Über diesen Link legst du es fest (eine Stunde gültig):',
          link,
          '',
          'Du hast nichts angefordert? Dann ignoriere diese E-Mail – dein bisheriges Passwort bleibt gültig.',
        ].join('\n'),
      })
    }
  } catch (err) {
    payload.logger.warn({ err, msg: 'Passwort-Reset nicht ausgelöst' })
  }
  return neutral
}

/** Neues Passwort per Token (Reset oder Einladung). Meldet NICHT an – danach normal mit 2FA anmelden. */
export async function resetPasswordWithToken(
  payload: Payload,
  input: { token: unknown; password: unknown; confirm: unknown },
  ctx: Ctx,
): Promise<{ ok: true } | { ok: false; message: string; field?: 'password' | 'confirm' }> {
  const rl = await hitRateLimit(payload, `reset-token:ip:${keyedHash('ip', ctx.ip)}`, 20, 60 * 60)
  if (!rl.ok) return { ok: false, message: 'Zu viele Versuche. Bitte versuch es später noch einmal.' }

  const token = typeof input.token === 'string' ? input.token : ''
  if (!/^[a-f0-9]{20,128}$/i.test(token)) return { ok: false, message: 'Der Link ist ungültig oder abgelaufen.' }
  if (input.password !== input.confirm) {
    return { ok: false, field: 'confirm', message: 'Die beiden Passwörter stimmen nicht überein.' }
  }

  const user = (await payload.db.findOne({
    collection: 'users',
    where: { and: [{ resetPasswordToken: { equals: token } }, { resetPasswordExpiration: { greater_than: new Date().toISOString() } }] },
  })) as User | null
  if (!user || user.accountDisabled) return { ok: false, message: 'Der Link ist ungültig oder abgelaufen.' }

  const policy = checkPassword(input.password, { email: user.email, name: user.name })
  if (policy) return { ok: false, field: 'password', message: policy }

  try {
    await payload.resetPassword({
      collection: 'users',
      data: { token, password: input.password as string },
      overrideAccess: true,
    })
  } catch {
    return { ok: false, message: 'Der Link ist ungültig oder abgelaufen.' }
  }
  // resetPassword legt eine Session an – verwerfen und alle Geräte abmelden
  await revokeSessions(payload, user.id)
  return { ok: true }
}

/* ------------------------------------------------------------ Angemeldet */

export async function changePassword(
  payload: Payload,
  user: Pick<User, 'id' | 'email' | 'name'> & { _sid?: string },
  input: { current: unknown; password: unknown; confirm: unknown },
): Promise<{ ok: true } | { ok: false; message: string; field?: 'current' | 'password' | 'confirm' }> {
  const current = typeof input.current === 'string' ? input.current : ''
  if (!current || !(await verifyPassword(payload, user.email, current))) {
    return { ok: false, field: 'current', message: 'Das aktuelle Passwort ist nicht korrekt.' }
  }
  if (input.password !== input.confirm) return { ok: false, field: 'confirm', message: 'Die beiden Passwörter stimmen nicht überein.' }
  const policy = checkPassword(input.password, { email: user.email, name: user.name })
  if (policy) return { ok: false, field: 'password', message: policy }
  if (input.password === current) return { ok: false, field: 'password', message: 'Bitte ein neues Passwort wählen.' }

  const before = await loadSessions(payload, user.id)
  // Payload verwirft beim Passwortwechsel selbst alle Sessions – die aktuelle danach wiederherstellen
  await payload.update({ collection: 'users', id: user.id, data: { password: input.password as string }, overrideAccess: true })
  const keep = before.filter((s) => s.id === user._sid)
  await payload.db.updateOne({ collection: 'users', id: user.id, data: { sessions: keep }, returning: false })
  return { ok: true }
}

/** Beendet alle Sessions eines Kontos – außer optional der aktuellen. */
export async function revokeSessions(payload: Payload, userId: number, keepSid?: string): Promise<void> {
  const sessions = keepSid ? (await loadSessions(payload, userId)).filter((s) => s.id === keepSid) : []
  await payload.db.updateOne({ collection: 'users', id: userId, data: { sessions }, returning: false })
}

type Session = { id: string; createdAt?: string; expiresAt: string }

async function loadSessions(payload: Payload, userId: number): Promise<Session[]> {
  const user = (await payload.db.findOne({ collection: 'users', where: { id: { equals: userId } } })) as
    | (User & { sessions?: Session[] | null })
    | null
  return user?.sessions ?? []
}
