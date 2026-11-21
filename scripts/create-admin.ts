/**
 * Legt ein Administratorkonto an und lädt es ein (das Passwort legt die Person selbst fest).
 * Ersetzt die Erstregistrierung des Admin-Panels, die bewusst gesperrt ist.
 *
 *   ADMIN_EMAIL=vorname@example.org ADMIN_NAME="Vorname Nachname" pnpm user:create-admin
 *
 * Mit SMTP_HOST wird die Einladung per Mail verschickt, sonst wird der Link nur ausgegeben.
 * Nach dem ersten Login muss die Zwei-Faktor-Anmeldung eingerichtet werden, erst dann wirkt die Rolle.
 */
import { randomBytes } from 'node:crypto'
import { getPayload } from 'payload'
import config from '@payload-config'

import { createInvitationLink, sendInvitation } from '@/lib/auth/invite'
import { checkPassword } from '@/lib/auth/password'

/** Zufallspasswort, das niemand kennt (erfüllt die Richtlinie, die z. B. Namensbestandteile verbietet). */
const throwawayPassword = (ctx: { email: string; name: string }) => {
  let pw = ''
  do pw = randomBytes(24).toString('base64url')
  while (checkPassword(pw, ctx))
  return pw
}

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const name = process.env.ADMIN_NAME?.trim()

async function run() {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
    console.error('Bitte ADMIN_EMAIL und ADMIN_NAME setzen, z. B.:')
    console.error('  ADMIN_EMAIL=vorname@example.org ADMIN_NAME="Vorname Nachname" pnpm user:create-admin')
    return 1
  }
  const payload = await getPayload({ config })
  const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0 })
  if (existing.docs[0]) {
    console.error(`Es gibt bereits ein Konto mit ${email}. Rollen bitte im Admin-Panel ändern.`)
    return 1
  }
  const user = await payload.create({
    collection: 'users',
    // Die Person setzt ihr eigenes Passwort über den Einladungslink
    data: { email, name, roles: ['admin'], password: throwawayPassword({ email, name }), sendInvite: false },
    context: { disableRevalidate: true },
  })

  if (process.env.SMTP_HOST) {
    await sendInvitation(payload, user)
    console.log(`Administrator ${email} angelegt, Einladung per E-Mail verschickt (72 h gültig).`)
  } else {
    const link = await createInvitationLink(payload, user)
    console.log(`Administrator ${email} angelegt. Kein SMTP_HOST gesetzt – Einladungslink (72 h gültig):`)
    console.log(link)
  }
  console.log('Nach der ersten Anmeldung muss die Zwei-Faktor-Anmeldung eingerichtet werden.')
  return 0
}

process.exit(await run())
