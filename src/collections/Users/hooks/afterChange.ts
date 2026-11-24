import type { CollectionAfterChangeHook } from 'payload'

import { type AuditEntry, auditRequest } from '@/lib/audit'
import { sendInvitation } from '@/lib/auth/invite'
import type { User } from '@/payload-types'

/** Sicherheitsprotokoll: Anlegen, Rollen, E-Mail, Sperre (in derselben Transaktion). */
export const auditUserChanges: CollectionAfterChangeHook<User> = async ({ doc, previousDoc, operation, req }) => {
  const log = (action: AuditEntry['action'], details?: Record<string, unknown>) =>
    auditRequest(req, { action, target: { collection: 'users', id: doc.id }, details })
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
}

/** Aktionen der virtuellen Felder `resetTwoFactor`, `sendInvite` und `resendInvite` (über `context`). */
export const runAccountActions: CollectionAfterChangeHook<User> = async ({ doc, req, context }) => {
  const target = { collection: 'users', id: doc.id }
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
    await auditRequest(req, { action: 'twoFactor.reset', target })
  }
  if (context.sendInvite) {
    context.sendInvite = false
    await sendInvitation(req.payload, doc, req)
    await auditRequest(req, { action: 'user.invited', target })
  }
  return doc
}
