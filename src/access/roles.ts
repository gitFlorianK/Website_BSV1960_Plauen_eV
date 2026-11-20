import type { User } from '@/payload-types'

/**
 * Rollenmodell (siehe docs/konzept.md, Abschnitt 2).
 * `admin` hat implizit alle Rechte; alle anderen Rollen sind additiv.
 */
export const ROLES = ['admin', 'vorstand', 'trainer', 'redakteur', 'mitglied'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  vorstand: 'Vorstand',
  trainer: 'Trainer',
  redakteur: 'Redakteur',
  mitglied: 'Mitglied',
}

/** Rollen mit Zugang zum Admin-Panel (/admin). */
export const STAFF_ROLES: readonly Role[] = ['admin', 'vorstand', 'trainer', 'redakteur']

type MaybeUser = Pick<User, 'roles' | 'accountDisabled'> | null | undefined

/** Gesperrte Konten haben keinerlei Rechte – auch nicht mit noch gültiger Session. */
export const isActiveUser = (user: MaybeUser): user is Pick<User, 'roles' | 'accountDisabled'> =>
  Boolean(user) && !user?.accountDisabled

/** true, wenn der Nutzer aktiv ist und mindestens eine der Rollen hat. `admin` erfüllt jede Prüfung. */
export const userHasRole = (user: MaybeUser, ...roles: Role[]): boolean => {
  if (!isActiveUser(user)) return false
  const userRoles = (user.roles ?? []) as Role[]
  return userRoles.includes('admin') || userRoles.some((r) => roles.includes(r))
}

export const isStaffUser = (user: MaybeUser): boolean => userHasRole(user, ...STAFF_ROLES)
