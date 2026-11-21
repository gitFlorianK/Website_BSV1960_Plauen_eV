import { draftMode } from 'next/headers'
import { cache } from 'react'

import { isStaffUser } from '@/access'
import { getSessionUser, type SessionUser } from '@/lib/auth/session'

/**
 * Entwurfsmodus (Live-Vorschau) nur zusammen mit einer gültigen Staff-Sitzung.
 *
 * Das Draft-Mode-Cookie bleibt nach dem Abmelden im Browser – es darf daher nie allein über den
 * Zugriff entscheiden. Abfragen laufen im Entwurfsmodus mit `overrideAccess: false` und diesem
 * Nutzer; Staff darf Entwürfe über die normalen Access-Regeln lesen.
 */
export const getPreviewUser = cache(async (): Promise<SessionUser | null> => {
  const { isEnabled } = await draftMode()
  if (!isEnabled) return null
  const user = await getSessionUser()
  return user && isStaffUser(user) ? user : null
})
