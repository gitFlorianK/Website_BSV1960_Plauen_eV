import type { Access, CollectionConfig, FieldAccess, Where } from 'payload'
import { APIError, Forbidden, ValidationError } from 'payload'
import { randomBytes } from 'crypto'

import { fieldHasRole, hasRole, isStaffUser, ROLE_LABELS, ROLES, userHasRole } from '@/access'
import { checkSecondFactor } from '@/lib/auth/twoFactor'
import { deleteDependents } from '@/hooks/dependents'
import { audit, requestActor, requestIp } from '@/lib/audit'
import { AUTH_ERROR } from '@/lib/auth/errors'
import { sendInvitation } from '@/lib/auth/invite'
import { checkPassword } from '@/lib/auth/password'
import type { User } from '@/payload-types'

const asUser = (u: unknown) => u as User | null | undefined

/** Konten, die der Vorstand nicht bearbeiten darf (Schutz vor Rechteausweitung/Kontoübernahme). */
const PROTECTED_ROLES = ['admin', 'vorstand']

const readUsers: Access = ({ req: { user } }) => {
  const u = asUser(user)
  if (userHasRole(u, 'vorstand')) return true
  if (u && !u.accountDisabled) return { id: { equals: u.id } } as Where
  return false
}

const updateUsers: Access = ({ req: { user } }) => {
  const u = asUser(user)
  if (userHasRole(u, 'admin')) return true
  if (!u || u.accountDisabled) return false
  const self: Where = { id: { equals: u.id } }
  if (userHasRole(u, 'vorstand')) {
    return { or: [self, { roles: { not_in: PROTECTED_ROLES } }] } as Where
  }
  return self
}

const selfOrVorstand: FieldAccess<User> = ({ req: { user }, doc }) => {
  const u = asUser(user)
  return userHasRole(u, 'vorstand') || (Boolean(u) && doc?.id === u?.id)
}

/** Nur Server-Code (Local API mit overrideAccess) schreibt diese Felder. */
const serverOnly = { create: () => false, update: () => false }

const randomPassword = () => randomBytes(32).toString('base64url')

export const Users: CollectionConfig<'users'> = {
  slug: 'users',
  labels: { singular: 'Nutzer', plural: 'Nutzer' },
  access: {
    admin: ({ req: { user } }) => isStaffUser(asUser(user)),
    create: hasRole('vorstand'),
    read: readUsers,
    update: updateUsers,
    delete: hasRole('admin'),
    unlock: hasRole('vorstand'),
  },
  admin: {
    defaultColumns: ['name', 'email', 'roles', 'twoFactorEnabled', 'accountDisabled'],
    useAsTitle: 'name',
    group: 'Verwaltung',
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 2 * 60 * 60,
    removeTokenFromResponses: true,
    useSessions: true,
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    },
    forgotPassword: {
      expiration: 60 * 60 * 1000,
      // Höchstens eine Reset-Mail pro Minute und Konto
      minRequestInterval: 60 * 1000,
    },
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      maxLength: 200,
    },
    {
      name: 'roles',
      label: 'Rollen',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['mitglied'],
      saveToJWT: true,
      options: ROLES.map((value) => ({ label: ROLE_LABELS[value], value })),
      access: {
        create: fieldHasRole('admin'),
        update: fieldHasRole('admin'),
      },
      admin: {
        position: 'sidebar',
        description: 'Administrator und Vorstand wirken erst, wenn die Person die Zwei-Faktor-Anmeldung eingerichtet hat.',
      },
    },
    {
      name: 'accountDisabled',
      label: 'Konto gesperrt',
      type: 'checkbox',
      defaultValue: false,
      saveToJWT: true,
      access: {
        create: fieldHasRole('vorstand'),
        update: fieldHasRole('vorstand'),
      },
      admin: {
        position: 'sidebar',
        description: 'Gesperrte Konten können sich nicht anmelden und haben keine Rechte.',
      },
    },
    {
      name: 'phone',
      label: 'Telefon',
      type: 'text',
      maxLength: 50,
      access: {
        read: selfOrVorstand,
      },
    },
    {
      // Nicht gespeichert: löst nach dem Anlegen den Versand einer Einladung aus.
      name: 'sendInvite',
      label: 'Einladung per E-Mail senden',
      type: 'checkbox',
      virtual: true,
      defaultValue: true,
      access: { create: fieldHasRole('vorstand'), update: () => false },
      admin: {
        position: 'sidebar',
        condition: (_data, _sibling, { operation }) => operation === 'create',
        description:
          'Die Person bekommt einen 72 Stunden gültigen Link und legt ihr Passwort selbst fest. Das oben eingetragene Passwort wird dabei verworfen.',
      },
      hooks: {
        beforeChange: [
          ({ value, context, operation }) => {
            if (operation === 'create' && value === true) context.sendInvite = true
            return undefined
          },
        ],
      },
    },
    {
      name: 'resendInvite',
      label: 'Einladung erneut senden',
      type: 'checkbox',
      virtual: true,
      defaultValue: false,
      access: { create: () => false, update: fieldHasRole('vorstand') },
      admin: {
        position: 'sidebar',
        condition: (_data, _sibling, { operation }) => operation === 'update',
        description: 'Neuer 72-Stunden-Link zum Festlegen des Passworts (z. B. wenn der alte abgelaufen ist).',
      },
      hooks: {
        beforeChange: [
          ({ value, context, operation }) => {
            if (operation === 'update' && value === true) context.sendInvite = true
            return undefined
          },
        ],
      },
    },
    {
      name: 'invitedAt',
      label: 'Eingeladen am',
      type: 'date',
      access: serverOnly,
      admin: { readOnly: true, position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'lastLoginAt',
      label: 'Letzte Anmeldung',
      type: 'date',
      access: { ...serverOnly, read: selfOrVorstand },
      admin: { readOnly: true, position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      type: 'collapsible',
      label: 'Zwei-Faktor-Anmeldung',
      admin: { position: 'sidebar', initCollapsed: false },
      fields: [
        {
          name: 'twoFactorEnabled',
          label: 'Zwei-Faktor-Anmeldung aktiv',
          type: 'checkbox',
          defaultValue: false,
          access: { ...serverOnly, read: selfOrVorstand },
          admin: {
            readOnly: true,
            description: 'Einrichten kann jede Person selbst unter „Mitgliederbereich → Sicherheit“.',
          },
        },
        {
          // Nicht gespeichert: setzt die 2FA zurück (z. B. bei verlorenem Handy) und meldet alle Geräte ab.
          name: 'resetTwoFactor',
          label: 'Zwei-Faktor-Anmeldung zurücksetzen',
          type: 'checkbox',
          virtual: true,
          access: { create: () => false, update: fieldHasRole('vorstand') },
          admin: {
            condition: (data) => Boolean(data?.twoFactorEnabled),
            description: 'Nur nach Rückfrage bei der Person selbst (Identität prüfen!).',
          },
          hooks: {
            beforeChange: [
              ({ value, context }) => {
                if (value === true) context.resetTwoFactor = true
                return undefined
              },
            ],
          },
        },
      ],
    },
    // Geheimnisse der Zwei-Faktor-Anmeldung: nie über API/Admin lesbar, nur Server-Code schreibt.
    { name: 'twoFactorSecret', type: 'text', hidden: true, access: serverOnly },
    { name: 'twoFactorPendingSecret', type: 'text', hidden: true, access: serverOnly },
    { name: 'twoFactorRecoveryCodes', type: 'json', hidden: true, access: serverOnly },
    { name: 'twoFactorLastStep', type: 'number', hidden: true, access: serverOnly },
  ],
  hooks: {
    // Turnieranmeldungen gehören zum Konto und werden mit ihm gelöscht
    beforeDelete: [deleteDependents('event-registrations', 'member')],
    beforeOperation: [
      ({ operation, req, args }) => {
        // Anmelden, Passwort-Reset und Erstregistrierung nur über die Website (Server Actions,
        // Local API) – dort greifen Rate-Limits und die Zwei-Faktor-Prüfung. Die REST-Endpunkte
        // /api/users/login, /forgot-password, /reset-password und /first-register sind gesperrt.
        // Forbidden statt APIError: wird nur als „info“ geloggt (Bots proben diese Endpunkte ständig).
        if (req.payloadAPI === 'local') return args
        if (operation === 'login' || operation === 'forgotPassword' || operation === 'resetPassword') {
          throw new Forbidden(req.t)
        }
        if (operation === 'create' && !req.user) throw new Forbidden(req.t)
        return args
      },
    ],
    beforeValidate: [
      ({ data, operation, originalDoc }) => {
        if (!data) return data
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
      },
    ],
    beforeChange: [
      async ({ data, operation, req }) => {
        // Ohne Konto im System (frische Installation) wird das erste Konto Administrator –
        // angelegt über `pnpm user:create-admin`, nicht über das Admin-Panel.
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', req })
          if (totalDocs === 0) data.roles = ['admin']
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        // Sicherheitsprotokoll: Anlegen, Rollen, E-Mail, Sperre (in derselben Transaktion)
        const actor = requestActor(req)
        const ip = requestIp(req)
        const target = { collection: 'users', id: doc.id }
        const log = (action: Parameters<typeof audit>[1]['action'], details?: Record<string, unknown>) =>
          audit(req.payload, { action, actor, target, ip, details }, req)
        if (operation === 'create') {
          await log('user.created', { roles: doc.roles })
          return doc
        }
        const before = [...(previousDoc?.roles ?? [])].sort().join(',')
        const after = [...(doc.roles ?? [])].sort().join(',')
        if (before !== after) await log('user.rolesChanged', { from: previousDoc?.roles ?? [], to: doc.roles ?? [] })
        if (previousDoc?.email && previousDoc.email !== doc.email) await log('user.emailChanged')
        if (Boolean(previousDoc?.accountDisabled) !== Boolean(doc.accountDisabled)) {
          await log(doc.accountDisabled ? 'user.disabled' : 'user.enabled')
        }
        return doc
      },
      async ({ doc, req, context }) => {
        if (context.resetTwoFactor) {
          context.resetTwoFactor = false
          await req.payload.db.updateOne({
            collection: 'users',
            id: doc.id,
            req,
            data: {
              twoFactorEnabled: false,
              twoFactorSecret: null,
              twoFactorPendingSecret: null,
              twoFactorRecoveryCodes: null,
              twoFactorLastStep: null,
            },
            returning: false,
          })
          // Sessions getrennt schreiben: gemischt mit Spalten wählt Drizzle ein INSERT … ON CONFLICT,
          // das an NOT-NULL-Spalten scheitert
          await req.payload.db.updateOne({ collection: 'users', id: doc.id, req, data: { sessions: [] }, returning: false })
          await audit(
            req.payload,
            { action: 'twoFactor.reset', actor: requestActor(req), target: { collection: 'users', id: doc.id }, ip: requestIp(req) },
            req,
          )
        }
        if (context.sendInvite) {
          context.sendInvite = false
          await sendInvitation(req.payload, doc as User, req)
          await audit(
            req.payload,
            { action: 'user.invited', actor: requestActor(req), target: { collection: 'users', id: doc.id }, ip: requestIp(req) },
            req,
          )
        }
        return doc
      },
    ],
    afterLogin: [
      ({ req, context, token }) => {
        // removeTokenFromResponses entfernt das Token auch aus Local-API-Antworten; die Server Action
        // braucht es für das Cookie → über das (per Referenz übergebene) context-Objekt zurückgeben.
        if (req.payloadAPI === 'local' && context.captureToken === true) context.issuedToken = token
      },
    ],
    beforeLogin: [
      async ({ user, req, context }) => {
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
      },
    ],
  },
  timestamps: true,
}
