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

/** Rollen, die erst mit aktiver Zwei-Faktor-Anmeldung wirksam werden (docs/konzept.md, Abschnitt 5). */
export const TWO_FACTOR_ROLES: readonly Role[] = ['admin', 'vorstand']

type MaybeUser = Pick<User, 'roles' | 'accountDisabled'> & { twoFactorEnabled?: boolean | null } | null | undefined

/** Gesperrte Konten haben keinerlei Rechte – auch nicht mit noch gültiger Session. */
export const isActiveUser = (user: MaybeUser): user is NonNullable<MaybeUser> =>
  Boolean(user) && !user?.accountDisabled

/**
 * Tatsächlich wirksame Rollen: `admin`/`vorstand` zählen nur mit aktiver 2FA.
 * Ohne 2FA hat ein Vorstandsmitglied also nur die übrigen Rollen (z. B. Mitglied).
 */
export const effectiveRoles = (user: MaybeUser): Role[] => {
  if (!isActiveUser(user)) return []
  const roles = (user.roles ?? []) as Role[]
  return user.twoFactorEnabled ? roles : roles.filter((r) => !TWO_FACTOR_ROLES.includes(r))
}

/** true, wenn Rollen 2FA verlangen, diese aber noch nicht eingerichtet ist. */
export const needsTwoFactorSetup = (user: MaybeUser): boolean =>
  isActiveUser(user) && !user.twoFactorEnabled && ((user.roles ?? []) as Role[]).some((r) => TWO_FACTOR_ROLES.includes(r))

/** true, wenn der Nutzer aktiv ist und mindestens eine der Rollen wirksam hat. `admin` erfüllt jede Prüfung. */
export const userHasRole = (user: MaybeUser, ...roles: Role[]): boolean => {
  const userRoles = effectiveRoles(user)
  return userRoles.includes('admin') || userRoles.some((r) => roles.includes(r))
}

export const isStaffUser = (user: MaybeUser): boolean => userHasRole(user, ...STAFF_ROLES)
