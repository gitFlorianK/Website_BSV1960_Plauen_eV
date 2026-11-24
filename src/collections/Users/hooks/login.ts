import type { CollectionAfterLoginHook, CollectionBeforeLoginHook } from 'payload'
import { APIError } from 'payload'

import { AUTH_ERROR } from '@/lib/auth/errors'
import { checkSecondFactor } from '@/lib/auth/twoFactor'
import type { User } from '@/payload-types'

/** Sperre, reine Passwortprüfung, Zwei-Faktor-Code; danach Zeitpunkt der letzten Anmeldung. */
export const checkLogin: CollectionBeforeLoginHook = async ({ user, req, context }) => {
  const u = user as User
  if (u.accountDisabled) {
    throw new APIError('Dieses Konto ist gesperrt.', 403, { code: AUTH_ERROR.disabled }, true)
  }
  // Nur Passwortprüfung (z. B. vor Passwortänderung): Login abbrechen, Session wird zurückgerollt.
  if (context.verifyPasswordOnly) {
    throw new APIError('Passwort korrekt.', 200, { code: AUTH_ERROR.passwordVerified }, true)
  }
  if (u.twoFactorEnabled) {
    const code = typeof context.twoFactorCode === 'string' ? context.twoFactorCode : ''
    if (!code) {
      throw new APIError('Bitte den Code aus der Authenticator-App eingeben.', 401, { code: AUTH_ERROR.twoFactorRequired }, true)
    }
    const result = await checkSecondFactor(req.payload, u.id, code, req)
    if (result === 'locked') {
      throw new APIError('Zu viele falsche Codes. Bitte warte 15 Minuten.', 429, { code: AUTH_ERROR.twoFactorLocked }, true)
    }
    if (result === 'invalid') {
      throw new APIError('Der Code ist ungültig.', 401, { code: AUTH_ERROR.twoFactorInvalid }, true)
    }
  }
  await req.payload.db.updateOne({
    collection: 'users',
    id: u.id,
    req,
    data: { lastLoginAt: new Date().toISOString() },
    returning: false,
  })
  return user
}

/**
 * removeTokenFromResponses entfernt das Token auch aus Local-API-Antworten; die Server Action
 * braucht es für das Cookie → über das (per Referenz übergebene) context-Objekt zurückgeben.
 */
export const captureToken: CollectionAfterLoginHook = ({ req, context, token }) => {
  if (req.payloadAPI === 'local' && context.captureToken === true) context.issuedToken = token
}
