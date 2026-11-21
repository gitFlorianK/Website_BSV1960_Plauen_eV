import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'

import { isActiveUser } from '@/access'
import type { User } from '@/payload-types'
import { routes } from '@/utilities/routes'

export type SessionUser = User & { _sid?: string; collection: 'users' }

/**
 * Angemeldeter Nutzer der aktuellen Anfrage (Session-Cookie, über Payload geprüft) – je Request gecacht.
 * Nur in dynamischen Routen verwenden (liest Header); öffentliche ISR-Seiten bleiben nutzerneutral.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  return user && isActiveUser(user as User) ? (user as SessionUser) : null
})

/** Für Seiten im Mitgliederbereich: ohne Anmeldung → /login mit Rücksprung. */
export async function requireMember(returnTo: string = routes.members): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect(`${routes.login}?redirect=${encodeURIComponent(returnTo)}`)
  return user
}

/** Nur interne Pfade als Rücksprungziel erlauben (kein Open Redirect). */
export function safeReturnPath(value: unknown, fallback: string = routes.members): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  try {
    const url = new URL(value, 'http://x')
    return url.host === 'x' ? `${url.pathname}${url.search}` : fallback
  } catch {
    return fallback
  }
}
