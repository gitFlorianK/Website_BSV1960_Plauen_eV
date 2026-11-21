import { execFileSync } from 'node:child_process'

import { generateTotpSecret } from '../../src/lib/auth/totp'

type Role = 'admin' | 'vorstand' | 'trainer' | 'redakteur' | 'mitglied'

/** Führt einen Seed-Auftrag über `payload run` aus (siehe seed-cli.ts). */
export function seed<T = unknown>(task: Record<string, unknown>): T {
  const out = execFileSync('pnpm', ['--silent', 'payload', 'run', 'tests/helpers/seed-cli.ts'], {
    env: { ...process.env, E2E_SEED: JSON.stringify(task), NODE_OPTIONS: '--no-deprecation' },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  const line = out.trim().split('\n').reverse().find((l) => l.startsWith('{"result"'))
  if (!line) throw new Error(`Seed fehlgeschlagen: ${out}`)
  return JSON.parse(line).result as T
}

/** Admin für E2E-Tests – mit eingerichteter Zwei-Faktor-Anmeldung (sonst wirkt die Rolle nicht). */
export const testUser = {
  email: 'e2e-admin@test.local',
  password: 'Zielscheibe-Sehne-2026!',
  totpSecret: generateTotpSecret(),
}

export const seedUser = (data: { email: string; password: string; name: string; roles: Role[]; totpSecret?: string; invite?: boolean }) =>
  seed<{ id: number }>({ action: 'user', ...data })

export const deleteUser = (email: string) => seed({ action: 'deleteUser', email })

export const seedTestUser = async () => seedUser({ ...testUser, name: 'Erika Verwaltung', roles: ['admin'] })
export const cleanupTestUser = async () => deleteUser(testUser.email)
