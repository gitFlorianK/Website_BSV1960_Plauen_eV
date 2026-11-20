import type { Access, FieldAccess, Where } from 'payload'

import type { User } from '@/payload-types'

import { isActiveUser, isStaffUser, type Role, userHasRole } from './roles'

export * from './roles'

/*
 * Zentrale Zugriffsregeln. Grundsatz: deny by default.
 * Jede Collection setzt create/read/update/delete explizit mit diesen Funktionen.
 * Achtung: Die Local API umgeht Access Control, außer bei `overrideAccess: false`.
 */

const asUser = (user: unknown) => user as User | null | undefined

export const anyone: Access = () => true
export const nobody: Access = () => false

/** Jeder angemeldete, nicht gesperrte Nutzer (inkl. Mitglieder). */
export const isLoggedIn: Access = ({ req: { user } }) => isActiveUser(asUser(user))

export const isAdmin: Access = ({ req: { user } }) => userHasRole(asUser(user), 'admin')

/** Erlaubt, wenn der Nutzer eine der Rollen hat (admin immer eingeschlossen). */
export const hasRole =
  (...roles: Role[]): Access =>
  ({ req: { user } }) =>
    userHasRole(asUser(user), ...roles)

export const isStaff: Access = ({ req: { user } }) => isStaffUser(asUser(user))

/** Feld-Variante von hasRole. */
export const fieldHasRole =
  (...roles: Role[]): FieldAccess =>
  ({ req: { user } }) =>
    userHasRole(asUser(user), ...roles)

/** Inhalte mit Feld `visibility` (public | members), ohne Drafts. */
export const publicOrMembers: Access = ({ req: { user } }) => {
  const u = asUser(user)
  if (isActiveUser(u)) return true
  return { visibility: { equals: 'public' } } as Where
}

/** Inhalte mit Drafts und `visibility`: Staff sieht alles, Mitglieder Veröffentlichtes, Anonyme nur öffentlich + veröffentlicht. */
export const publishedPublicOrMembers: Access = ({ req: { user } }) => {
  const u = asUser(user)
  if (isStaffUser(u)) return true
  if (isActiveUser(u)) return { _status: { equals: 'published' } } as Where
  return {
    and: [{ _status: { equals: 'published' } }, { visibility: { equals: 'public' } }],
  } as Where
}

/** Inhalte mit Drafts ohne Sichtbarkeitsfeld (z. B. Pages). */
export const staffOrPublished: Access = ({ req: { user } }) => {
  if (isStaffUser(asUser(user))) return true
  return { _status: { equals: 'published' } } as Where
}
