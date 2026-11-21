/*
 * Passwortrichtlinie (NIST SP 800-63B): Länge statt Zeichenklassen-Zwang, Sperrliste,
 * keine persönlichen Angaben. Gilt für Admin, Einladung, Zurücksetzen und Profil.
 */

export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

/** Häufige Passwörter/Muster (Auswahl); zusätzlich Vereinsbegriffe. */
const BLOCKLIST = [
  'passwort', 'password', 'kennwort', 'qwertz', 'qwerty', 'asdfgh', 'yxcvbn', '123456', '654321',
  'abc123', 'letmein', 'welcome', 'willkommen', 'hallo', 'sommer', 'winter', 'fussball', 'schalke',
  'bogensport', 'bogenschiessen', 'plauen', 'bsv1960', 'vogtland', 'admin', 'iloveyou', 'geheim',
]

export type PasswordContext = { email?: string | null; name?: string | null }

/** Liefert eine deutsche Fehlermeldung oder `null`, wenn das Passwort den Regeln genügt. */
export function checkPassword(password: unknown, ctx: PasswordContext = {}): string | null {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return `Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein.`
  }
  if (password.length > PASSWORD_MAX_LENGTH) return `Das Passwort darf höchstens ${PASSWORD_MAX_LENGTH} Zeichen lang sein.`

  const lower = password.toLowerCase()
  const compact = lower.replace(/[^a-z0-9äöüß]/g, '')
  if (new Set(password).size < 5) return 'Das Passwort besteht aus zu wenigen verschiedenen Zeichen.'
  if (/^(.+?)\1+$/.test(password)) return 'Das Passwort darf keine reine Wiederholung sein.'

  // Nach Entfernen bekannter Begriffe muss noch genug „Eigenes“ übrig bleiben
  let rest = compact
  for (const word of BLOCKLIST) rest = rest.split(word).join('')
  const personal = [
    ...(ctx.email ? ctx.email.toLowerCase().split('@')[0].split(/[^a-z0-9äöüß]+/) : []),
    ...(ctx.name ? ctx.name.toLowerCase().split(/\s+/) : []),
  ].filter((p) => p.length >= 3)
  for (const p of personal) {
    if (compact.includes(p)) return 'Das Passwort darf deinen Namen oder deine E-Mail-Adresse nicht enthalten.'
  }
  if (rest.replace(/(\d)\1+/g, '$1').length < 8) {
    return 'Das Passwort ist zu leicht zu erraten. Tipp: mehrere zufällige Wörter kombinieren.'
  }
  return null
}
