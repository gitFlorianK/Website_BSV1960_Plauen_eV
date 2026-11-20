import type { Access, CollectionConfig, FieldAccess, Where } from 'payload'
import { APIError } from 'payload'

import { fieldHasRole, hasRole, isStaffUser, ROLE_LABELS, ROLES, userHasRole } from '@/access'
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
    defaultColumns: ['name', 'email', 'roles', 'accountDisabled'],
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
    },
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
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
      admin: { position: 'sidebar' },
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
      access: {
        read: selfOrVorstand,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        // Das allererste Konto (Erstregistrierung über /admin) wird Administrator.
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', req })
          if (totalDocs === 0) data.roles = ['admin']
        }
        return data
      },
    ],
    beforeLogin: [
      ({ user }) => {
        if ((user as User).accountDisabled) {
          throw new APIError('Dieses Konto ist gesperrt.', 403, null, true)
        }
        return user
      },
    ],
  },
  timestamps: true,
}
