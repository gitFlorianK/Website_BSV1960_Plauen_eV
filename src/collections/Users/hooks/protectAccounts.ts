import type { CollectionBeforeChangeHook } from 'payload'
import { Forbidden } from 'payload'

import { userHasRole } from '@/access'

import { asUser, hasProtectedRole } from '../access'

/**
 * Zweite Absicherung zu `updateUsers`: Konten mit Admin-/Vorstandsrolle ändert nur ein Admin
 * (oder die Person selbst). Greift auch, falls die Access-Regel einmal falsch filtert (Review R14).
 */
export const guardProtectedAccounts: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  const actor = asUser(req.user)
  if (
    operation === 'update' &&
    actor &&
    originalDoc &&
    actor.id !== originalDoc.id &&
    !userHasRole(actor, 'admin') &&
    hasProtectedRole(originalDoc.roles)
  ) {
    throw new Forbidden(req.t)
  }
  return data
}

/**
 * Ohne Konto im System (frische Installation) wird das erste Konto Administrator –
 * angelegt über `pnpm user:create-admin`, nicht über das Admin-Panel.
 */
export const firstUserIsAdmin: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation === 'create') {
    const { totalDocs } = await req.payload.count({ collection: 'users', req })
    if (totalDocs === 0) data.roles = ['admin']
  }
  return data
}
