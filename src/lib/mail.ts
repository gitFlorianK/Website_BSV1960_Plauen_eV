import type { Payload } from 'payload'

import { getServerSideURL } from '@/utilities/getURL'

/*
 * Vereinsmails. Grundsätze:
 * - Nur reiner Text (keine HTML-Mails: kein Injektionsrisiko, gute Zustellbarkeit).
 * - An Absender/Teilnehmende gehen nur feste Texte ohne Freitext aus dem Formular,
 *   damit das Formular nicht zum Versand von Spam an Dritte missbraucht werden kann.
 * - Benachrichtigungen an den Verein enthalten nur das Nötigste und einen Link in den Admin.
 */

const CLUB = 'Bogensportverein 1960 Plauen e. V.'

const footer = () =>
  `\n\n-- \n${CLUB}\n${getServerSideURL()}\n\nDiese E-Mail wurde automatisch versendet.`

/** Zeilenumbrüche aus Werten entfernen, die in Kopfzeilen landen (Header-Injection). */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim()

/** Empfänger für Vereinsbenachrichtigungen: MAIL_NOTIFY_ADDRESS oder öffentliche Vereinsadresse. */
export async function clubAddress(payload: Payload): Promise<string | null> {
  if (process.env.MAIL_NOTIFY_ADDRESS) return process.env.MAIL_NOTIFY_ADDRESS
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  return settings.email ?? null
}

export const adminDocUrl = (collection: string, id: number | string) =>
  `${getServerSideURL()}/admin/collections/${collection}/${id}`

export async function sendText(
  payload: Payload,
  { to, subject, text, replyTo }: { to: string; subject: string; text: string; replyTo?: string },
): Promise<boolean> {
  try {
    await payload.sendEmail({
      to,
      subject: oneLine(subject),
      text: text + footer(),
      ...(replyTo ? { replyTo: oneLine(replyTo) } : {}),
    })
    return true
  } catch (err) {
    payload.logger.error({ err, msg: 'E-Mail-Versand fehlgeschlagen', subject })
    return false
  }
}
