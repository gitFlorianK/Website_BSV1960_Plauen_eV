'use server'

import configPromise from '@payload-config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { needsTwoFactorSetup } from '@/access'
import { clientIp } from '@/lib/clientIp'
import { routes } from '@/utilities/routes'

import { changePassword, login, requestPasswordReset, resetPasswordWithToken, revokeSessions, verifyPassword } from './service'
import { getSessionUser, safeReturnPath } from './session'
import {
  checkSecondFactor,
  confirmTwoFactorSetup,
  disableTwoFactor,
  regenerateRecoveryCodes,
  startTwoFactorSetup,
} from './twoFactor'
import { TWO_FACTOR_ROLES } from '@/access/roles'

/* Server Actions der Anmeldung und des Mitgliederbereichs (CSRF-Schutz durch Next: Origin-Prüfung). */

const payloadP = () => getPayload({ config: configPromise })

async function setSessionCookie(token: string, exp: number) {
  const payload = await payloadP()
  const store = await cookies()
  store.set(`${payload.config.cookiePrefix}-token`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(exp * 1000),
  })
}

async function clearSessionCookie() {
  const payload = await payloadP()
  ;(await cookies()).delete(`${payload.config.cookiePrefix}-token`)
}

/* ------------------------------------------------------------------ Login */

export type LoginState = {
  step: 'password' | 'code'
  error?: string
}

const LOGIN_MESSAGES: Record<string, string> = {
  invalid: 'E-Mail-Adresse oder Passwort ist falsch. Nach fünf Fehlversuchen wird das Konto für 15 Minuten gesperrt.',
  disabled: 'Dieses Konto ist gesperrt. Bitte wende dich an den Vorstand.',
  twoFactorInvalid: 'Der Code ist ungültig oder wurde schon verwendet. Bitte den aktuellen Code aus der App eingeben.',
  twoFactorLocked: 'Zu viele falsche Codes. Bitte warte 15 Minuten.',
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const payload = await payloadP()
  const result = await login(
    payload,
    { email: formData.get('email'), password: formData.get('password'), code: formData.get('code') ?? undefined },
    { ip: await clientIp() },
  )
  if (!result.ok) {
    if (result.error === 'twoFactorRequired') return { step: 'code' }
    if (result.error === 'rateLimited') {
      return { step: 'password', error: `Zu viele Anmeldeversuche. Bitte warte ${result.retryAfterMin ?? 15} Minuten.` }
    }
    const step = result.error.startsWith('twoFactor') ? 'code' : 'password'
    return { step, error: LOGIN_MESSAGES[result.error] }
  }

  await setSessionCookie(result.token, result.exp)
  const target = needsTwoFactorSetup(result.user)
    ? `${routes.membersSecurity}?einrichten=1`
    : safeReturnPath(formData.get('redirect'), routes.members)
  redirect(target)
}

export async function logoutAction(): Promise<void> {
  const user = await getSessionUser()
  if (user) {
    const payload = await payloadP()
    const sessions = ((await payload.db.findOne({ collection: 'users', where: { id: { equals: user.id } } })) as {
      sessions?: { id: string }[]
    } | null)?.sessions
    await payload.db.updateOne({
      collection: 'users',
      id: user.id,
      data: { sessions: (sessions ?? []).filter((s) => s.id !== user._sid) },
      returning: false,
    })
  }
  await clearSessionCookie()
  redirect(`${routes.login}?abgemeldet=1`)
}

/* ------------------------------------------------------- Passwort-Flows */

export type SimpleState = { status: 'idle' | 'success' | 'error'; message?: string; field?: string }

export async function forgotPasswordAction(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const res = await requestPasswordReset(
    await payloadP(),
    { email: formData.get('email'), altcha: formData.get('altcha') },
    { ip: await clientIp() },
  )
  return { status: res.ok ? 'success' : 'error', message: res.message }
}

export async function resetPasswordAction(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const res = await resetPasswordWithToken(
    await payloadP(),
    { token: formData.get('token'), password: formData.get('password'), confirm: formData.get('confirm') },
    { ip: await clientIp() },
  )
  if (!res.ok) return { status: 'error', message: res.message, field: res.field }
  redirect(`${routes.login}?passwort=neu`)
}

export async function changePasswordAction(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const user = await getSessionUser()
  if (!user) redirect(routes.login)
  const res = await changePassword(await payloadP(), user, {
    current: formData.get('current'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!res.ok) return { status: 'error', message: res.message, field: res.field }
  return { status: 'success', message: 'Dein Passwort wurde geändert. Andere Geräte wurden abgemeldet.' }
}

export async function updateProfileAction(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const user = await getSessionUser()
  if (!user) redirect(routes.login)
  const name = String(formData.get('name') ?? '').replace(/\s+/g, ' ').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  if (name.length < 2 || name.length > 200) return { status: 'error', field: 'name', message: 'Bitte deinen Namen angeben.' }
  if (phone && !/^[0-9+()/\-\s.]{5,50}$/.test(phone)) {
    return { status: 'error', field: 'phone', message: 'Bitte eine gültige Telefonnummer angeben.' }
  }
  // Mit Nutzerrechten (overrideAccess: false) – Rollen etc. kann so niemand ändern
  await (await payloadP()).update({
    collection: 'users',
    id: user.id,
    data: { name, phone: phone || null },
    overrideAccess: false,
    user,
  })
  return { status: 'success', message: 'Gespeichert.' }
}

export async function logoutOtherDevicesAction(_prev: SimpleState, _formData: FormData): Promise<SimpleState> {
  const user = await getSessionUser()
  if (!user) redirect(routes.login)
  await revokeSessions(await payloadP(), user.id, user._sid)
  return { status: 'success', message: 'Alle anderen Geräte wurden abgemeldet.' }
}

/* ------------------------------------------------- Zwei-Faktor-Anmeldung */

export type TwoFactorState =
  | { step: 'idle'; error?: string; message?: string }
  | { step: 'scan'; secret: string; qr: boolean[][]; error?: string }
  | { step: 'codes'; recoveryCodes: string[] }

/** Ein Einstiegspunkt für alle 2FA-Schritte (Feld `intent`), damit ein useActionState genügt. */
export async function twoFactorAction(prev: TwoFactorState, formData: FormData): Promise<TwoFactorState> {
  const user = await getSessionUser()
  if (!user) redirect(routes.login)
  const payload = await payloadP()
  const intent = String(formData.get('intent') ?? '')

  if (intent === 'start') {
    const { secret, qr } = await startTwoFactorSetup(payload, user)
    return { step: 'scan', secret, qr }
  }

  if (intent === 'confirm') {
    const res = await confirmTwoFactorSetup(payload, user.id, String(formData.get('code') ?? ''))
    if (!res.ok) {
      return prev.step === 'scan'
        ? { ...prev, error: 'Der Code passt nicht. Prüfe, ob die Uhrzeit am Handy stimmt, und gib den aktuellen Code ein.' }
        : { step: 'idle', error: 'Bitte starte die Einrichtung neu.' }
    }
    // Andere Sessions beenden: ab jetzt gilt überall der zweite Faktor
    await revokeSessions(payload, user.id, user._sid)
    return { step: 'codes', recoveryCodes: res.recoveryCodes }
  }

  if (intent === 'regenerate' || intent === 'disable') {
    const okPassword = await verifyPassword(payload, user.email, String(formData.get('password') ?? ''))
    const okCode = okPassword && (await checkSecondFactor(payload, user.id, String(formData.get('code') ?? ''))) === 'ok'
    if (!okCode) return { step: 'idle', error: 'Passwort oder Code ist falsch.' }
    if (intent === 'regenerate') return { step: 'codes', recoveryCodes: await regenerateRecoveryCodes(payload, user.id) }
    if ((user.roles ?? []).some((r) => TWO_FACTOR_ROLES.includes(r))) {
      return { step: 'idle', error: 'Für Vorstand und Administratoren ist die Zwei-Faktor-Anmeldung Pflicht.' }
    }
    await disableTwoFactor(payload, user.id)
    return { step: 'idle', message: 'Die Zwei-Faktor-Anmeldung ist ausgeschaltet.' }
  }
  return prev
}
