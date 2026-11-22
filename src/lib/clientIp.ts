import { isIP } from 'node:net'
import { headers } from 'next/headers'

/**
 * Client-IP für Rate-Limits. Vertraut nur dem Header `X-Real-IP`, den der eigene Reverse Proxy
 * (Caddy) setzt und überschreibt – `X-Forwarded-For` wäre vom Client fälschbar.
 * Ohne Proxy (lokal) gilt ein gemeinsamer Schlüssel.
 *
 * Fehlt der Header in Produktion oder enthält er eine interne Adresse (Docker-Gateway, weil Caddy
 * die echte Absender-IP nicht sieht), teilen sich alle Besucher einen Zähler – ein einzelner
 * Angreifer sperrt dann die Anmeldung für alle. Das wird einmal je Prozess und Fall ins Log
 * geschrieben (docs/betrieb.md, Abschnitte 4 und 8).
 */
export async function clientIp(): Promise<string> {
  const h = await headers()
  const { ip, problem } = classifyClientIp(h.get('x-real-ip'))
  if (problem && process.env.NODE_ENV === 'production') warnOnce(problem, ip)
  return ip
}

export type ClientIpProblem = 'missing' | 'invalid' | 'internal'

/** Prüft den Header-Wert; ungültige Werte zählen als `unknown`. Rein, damit testbar. */
export function classifyClientIp(raw: string | null | undefined): { ip: string; problem?: ClientIpProblem } {
  const value = raw?.trim()
  if (!value) return { ip: 'unknown', problem: 'missing' }
  if (value.length > 64 || !isIP(value)) return { ip: 'unknown', problem: 'invalid' }
  const ip = value.toLowerCase()
  return isInternalIp(ip) ? { ip, problem: 'internal' } : { ip }
}

/** Loopback, private Netze, Link-local, CGNAT, IPv6-ULA – Adressen, die kein Besucher aus dem Internet hat. */
export function isInternalIp(ip: string): boolean {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  const v4 = mapped ? mapped[1] : isIP(ip) === 4 ? ip : null
  if (v4) {
    const [a, b] = v4.split('.').map(Number)
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127)
    )
  }
  const v6 = ip.toLowerCase()
  return v6 === '::1' || v6 === '::' || /^f[cd][0-9a-f]{2}:/.test(v6) || /^fe[89ab][0-9a-f]:/.test(v6)
}

const warned = new Set<ClientIpProblem>()

const MESSAGES: Record<ClientIpProblem, string> = {
  missing: 'Anfrage ohne X-Real-IP – kommt sie nicht über Caddy?',
  invalid: 'X-Real-IP enthält keine gültige IP-Adresse – Caddy-Konfiguration prüfen (header_up X-Real-IP {remote_host}).',
  internal:
    'X-Real-IP ist eine interne Adresse{ip} – Caddy sieht nicht die echte Absender-IP (meist fehlt "userland-proxy": false in /etc/docker/daemon.json).',
}

function warnOnce(problem: ClientIpProblem, ip: string) {
  if (warned.has(problem)) return
  warned.add(problem)
  // Interne Adressen sind keine Personendaten und helfen bei der Diagnose; sonst keine IP ins Log
  const message = MESSAGES[problem].replace('{ip}', ` (${ip})`)
  console.warn(
    `[Client-IP] ${message} Alle Besucher teilen sich dann einen Rate-Limit-Zähler. Siehe docs/betrieb.md, Abschnitt 8. (Einmalige Warnung je Serverstart.)`,
  )
}
