import type { Payload, PayloadRequest } from 'payload'

import { keyedHash } from '@/lib/secrets'
import type { User } from '@/payload-types'

/** Ereignisse des Sicherheitsprotokolls mit deutscher Bezeichnung für das Admin-Panel. */
export const AUDIT_ACTIONS = {
  'login.success': 'Anmeldung',
  'login.failed': 'Anmeldung fehlgeschlagen',
  'login.rateLimited': 'Anmeldung gedrosselt (zu viele Versuche)',
  'login.disabled': 'Anmeldeversuch mit gesperrtem Konto',
  'login.twoFactorFailed': 'Falscher Zwei-Faktor-Code',
  'login.twoFactorLocked': 'Zwei-Faktor-Anmeldung gesperrt (zu viele Fehlversuche)',
  'login.recoveryCodeUsed': 'Wiederherstellungscode verwendet',
  'logout': 'Abmeldung',
  'sessions.revoked': 'Andere Geräte abgemeldet',
  'password.resetRequested': 'Passwort-Zurücksetzen angefordert',
  'password.reset': 'Passwort per Link neu gesetzt',
  'password.changed': 'Passwort geändert',
  'twoFactor.enabled': 'Zwei-Faktor-Anmeldung eingerichtet',
  'twoFactor.disabled': 'Zwei-Faktor-Anmeldung ausgeschaltet',
  'twoFactor.codesRegenerated': 'Neue Wiederherstellungscodes erzeugt',
  'twoFactor.reset': 'Zwei-Faktor-Anmeldung zurückgesetzt (durch Vorstand)',
  'user.created': 'Konto angelegt',
  'user.invited': 'Einladung verschickt',
  'user.rolesChanged': 'Rollen geändert',
  'user.emailChanged': 'E-Mail-Adresse geändert',
  'user.disabled': 'Konto gesperrt',
  'user.enabled': 'Konto entsperrt',
  'doc.deleted': 'Datensatz gelöscht',
  'retention.purged': 'Löschfristen angewendet',
} as const

export type AuditAction = keyof typeof AUDIT_ACTIONS

export type AuditEntry = {
  action: AuditAction
  actor?: Pick<User, 'id' | 'name'> | null
  target?: { collection: string; id: number | string }
  ip?: string
  email?: string
  details?: Record<string, unknown>
}

/**
 * Schreibt einen Protokolleintrag. Wirft nie (ein Fehler im Protokoll darf keine Anmeldung o. Ä.
 * verhindern). Mit `req` läuft der Eintrag in derselben Transaktion – wird also bei einem
 * Fehlschlag mit zurückgerollt; für Fehlversuche daher ohne `req` aufrufen.
 */
export async function audit(payload: Payload, entry: AuditEntry, req?: Partial<PayloadRequest>): Promise<void> {
  try {
    await payload.create({
      collection: 'audit-log',
      overrideAccess: true,
      depth: 0,
      // Kopie mit eigenem DataLoader: Payload ersetzt sonst req.context der laufenden Operation
      // (der DataLoader ist an das Original gebunden) – ein laufender Login verliert dann sein Token
      req: req ? { ...req, payloadDataLoader: undefined } : undefined,
      data: {
        action: entry.action,
        actor: entry.actor?.id ?? null,
        actorName: entry.actor?.name ?? null,
        targetCollection: entry.target?.collection ?? null,
        targetId: entry.target ? String(entry.target.id) : null,
        ipHash: entry.ip && entry.ip !== 'unknown' ? keyedHash('audit-ip', entry.ip) : null,
        emailHash: entry.email ? keyedHash('audit-email', entry.email.trim().toLowerCase()) : null,
        details: entry.details ?? null,
      },
    })
  } catch (err) {
    payload.logger.error({ err, msg: 'Protokolleintrag fehlgeschlagen', action: entry.action })
  }
}

/** Client-IP aus einer Payload-Anfrage (nur der vom eigenen Proxy gesetzte Header). */
export const requestIp = (req?: Partial<PayloadRequest>) => req?.headers?.get?.('x-real-ip')?.trim() || undefined

/** Angemeldeter Nutzer einer Payload-Anfrage als Akteur. */
export const requestActor = (req?: Partial<PayloadRequest>) => {
  const u = req?.user as Pick<User, 'id' | 'name'> | null | undefined
  return u && typeof u.id === 'number' ? { id: u.id, name: u.name } : null
}
