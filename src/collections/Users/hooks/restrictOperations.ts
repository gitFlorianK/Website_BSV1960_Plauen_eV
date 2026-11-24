import type { CollectionBeforeOperationHook, CollectionBeforeValidateHook } from 'payload'
import { Forbidden, ValidationError } from 'payload'
import { randomBytes } from 'crypto'

import { checkPassword } from '@/lib/auth/password'

import { asUser } from '../access'

/**
 * Anmelden, Passwort-Reset und Erstregistrierung nur über die Website (Server Actions, Local API) –
 * dort greifen Rate-Limits und die Zwei-Faktor-Prüfung. Die REST-Endpunkte /api/users/login,
 * /forgot-password, /reset-password und /first-register sind gesperrt.
 * Forbidden statt APIError: wird nur als „info“ geloggt (Bots proben diese Endpunkte ständig).
 */
export const blockRestAuth: CollectionBeforeOperationHook<'users'> = ({ operation, req, args }) => {
  if (req.payloadAPI === 'local') return args
  if (operation === 'login' || operation === 'forgotPassword' || operation === 'resetPassword') {
    throw new Forbidden(req.t)
  }
  if (operation === 'create' && !req.user) throw new Forbidden(req.t)
  return args
}

const randomPassword = () => randomBytes(32).toString('base64url')

/** Eigene Zugangsdaten nur über die Website, Zufallspasswort bei Einladung, Passwortrichtlinie. */
export const validateCredentials: CollectionBeforeValidateHook = ({ data, operation, originalDoc, req }) => {
  if (!data) return data
  // Eigenes Passwort / eigene E-Mail nicht über REST oder Admin ändern: Die Website verlangt dafür
  // das aktuelle Passwort; ohne diese Sperre genügte eine fremde, offene Sitzung (Review R15).
  // Server Actions (Local API) und Änderungen an fremden Konten (Vorstand/Admin) bleiben möglich.
  const self = asUser(req.user)
  if (operation === 'update' && req.payloadAPI !== 'local' && self && originalDoc && self.id === originalDoc.id) {
    if (typeof data.password === 'string' && data.password.length > 0) {
      throw new ValidationError({
        errors: [{ path: 'password', message: 'Dein Passwort änderst du auf der Website unter „Mitgliederbereich → Sicherheit“.' }],
      })
    }
    if (typeof data.email === 'string' && data.email.trim().toLowerCase() !== String(originalDoc.email).toLowerCase()) {
      throw new ValidationError({
        errors: [{ path: 'email', message: 'Deine E-Mail-Adresse kann nur der Vorstand ändern – bitte dort melden.' }],
      })
    }
  }
  // Bei Einladung legt die Person ihr Passwort selbst fest → beim Anlegen Zufallswert.
  if (operation === 'create' && data.sendInvite === true) {
    data.password = randomPassword()
    return data
  }
  if (typeof data.password === 'string' && data.password.length > 0) {
    const error = checkPassword(data.password, {
      email: data.email ?? originalDoc?.email,
      name: data.name ?? originalDoc?.name,
    })
    if (error) throw new ValidationError({ errors: [{ path: 'password', message: error }] })
  }
  return data
}
