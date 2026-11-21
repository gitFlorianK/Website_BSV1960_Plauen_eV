import type { Payload, PayloadRequest } from 'payload'

import { sendText } from '@/lib/mail'
import type { User } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { routes } from '@/utilities/routes'

export const INVITE_TTL_MS = 72 * 60 * 60 * 1000

/**
 * Einladung: Payload-Reset-Token mit 72 h Gültigkeit erzeugen und Link per Mail senden.
 * Die Person legt ihr Passwort auf /einladung selbst fest (gleicher Mechanismus wie „Passwort vergessen“).
 */
export async function sendInvitation(payload: Payload, user: Pick<User, 'id' | 'email' | 'name'>, req?: Partial<PayloadRequest>) {
  const link = await createInvitationLink(payload, user, req)
  if (!link) return false
  return sendText(payload, {
    to: user.email,
    subject: 'Einladung in den Mitgliederbereich des BSV 1960 Plauen',
    text: [
      `Hallo ${user.name},`,
      '',
      'du wurdest in den Mitgliederbereich unserer Website eingeladen. Dort findest du interne Neuigkeiten, Dokumente, Fotos und kannst dich zu Turnieren anmelden.',
      '',
      'Lege hier dein Passwort fest (der Link ist 72 Stunden gültig):',
      link,
      '',
      'Anschließend meldest du dich mit deiner E-Mail-Adresse und dem neuen Passwort an.',
      '',
      'Du hast keine Einladung erwartet? Dann ignoriere diese E-Mail einfach.',
    ].join('\n'),
  })
}

/** Erzeugt einen neuen Einladungslink (macht frühere Links ungültig) und vermerkt `invitedAt`. */
export async function createInvitationLink(
  payload: Payload,
  user: Pick<User, 'id' | 'email'>,
  req?: Partial<PayloadRequest>,
): Promise<string | null> {
  const token = await payload.forgotPassword({
    collection: 'users',
    data: { email: user.email },
    disableEmail: true,
    expiration: INVITE_TTL_MS,
    req,
  })
  if (!token) return null
  await payload.db.updateOne({
    collection: 'users',
    id: user.id,
    data: { invitedAt: new Date().toISOString() },
    req,
    returning: false,
  })
  return `${getServerSideURL()}${routes.invite}?token=${encodeURIComponent(token)}`
}
