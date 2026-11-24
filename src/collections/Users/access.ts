import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

import { userHasRole } from '@/access'
import type { User } from '@/payload-types'

export const asUser = (u: unknown) => u as User | null | undefined

/** Konten, die der Vorstand nicht bearbeiten darf (Schutz vor Rechteausweitung/Kontoübernahme). */
const PROTECTED_ROLES = ['admin', 'vorstand']

export const hasProtectedRole = (roles: readonly string[] | null | undefined) =>
  (roles ?? []).some((r) => PROTECTED_ROLES.includes(r))

/**
 * IDs aller Konten mit geschützter Rolle. Nicht über `roles: { not_in }` lösen: `roles` ist hasMany,
 * `not_in` träfe jedes Konto mit irgendeiner anderen Rolle – also auch `[admin, mitglied]` (Review R14).
 * `in` trifft dagegen korrekt jedes Konto, das eine der Rollen hat.
 */
async function protectedUserIds(req: PayloadRequest): Promise<(number | string)[]> {
  const { docs } = await req.payload.find({
    collection: 'users',
    where: { roles: { in: PROTECTED_ROLES } },
    depth: 0,
    pagination: false,
    select: {},
    overrideAccess: true,
    req,
  })
  return docs.map((d) => d.id)
}

export const readUsers: Access = ({ req: { user } }) => {
  const u = asUser(user)
  if (userHasRole(u, 'vorstand')) return true
  if (u && !u.accountDisabled) return { id: { equals: u.id } } as Where
  return false
}

export const updateUsers: Access = async ({ req }) => {
  const u = asUser(req.user)
  if (userHasRole(u, 'admin')) return true
  if (!u || u.accountDisabled) return false
  const self: Where = { id: { equals: u.id } }
  if (userHasRole(u, 'vorstand')) {
    const ids = await protectedUserIds(req)
    return ids.length > 0 ? { or: [self, { id: { not_in: ids } }] } : true
  }
  return self
}

export const selfOrVorstand: FieldAccess<User> = ({ req: { user }, doc }) => {
  const u = asUser(user)
  return userHasRole(u, 'vorstand') || (Boolean(u) && doc?.id === u?.id)
}

/** Nur Server-Code (Local API mit overrideAccess) schreibt diese Felder. */
export const serverOnly = { create: () => false, update: () => false }
