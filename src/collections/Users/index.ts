import type { CollectionConfig } from 'payload'

import { fieldHasRole, hasRole, isStaffUser, ROLE_LABELS, ROLES } from '@/access'
import { deleteDependents } from '@/hooks/dependents'

import { asUser, readUsers, selfOrVorstand, serverOnly, updateUsers } from './access'
import { auditUserChanges, runAccountActions } from './hooks/afterChange'
import { captureToken, checkLogin } from './hooks/login'
import { firstUserIsAdmin, guardProtectedAccounts } from './hooks/protectAccounts'
import { blockRestAuth, validateCredentials } from './hooks/restrictOperations'

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
    beforeOperation: [blockRestAuth],
    beforeValidate: [validateCredentials],
    beforeChange: [guardProtectedAccounts, firstUserIsAdmin],
    afterChange: [auditUserChanges, runAccountActions],
    afterLogin: [captureToken],
    beforeLogin: [checkLogin],
  },
  timestamps: true,
}
