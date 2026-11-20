import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

/*
 * Rate-Limits und Einmal-Marker in der Tabelle `rate_limits` (Collection `rate-limits`).
 * Atomar per INSERT … ON CONFLICT, damit parallele Requests korrekt zählen (Fixed Window).
 */

type Drizzle = { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }> }
const db = (payload: Payload) => (payload.db as unknown as { drizzle: Drizzle }).drizzle

export type RateLimitResult = { ok: boolean; count: number; retryAfterSec: number }

/** Zählt einen Versuch für `key`; erlaubt höchstens `limit` Versuche je `windowSec`. */
export async function hitRateLimit(
  payload: Payload,
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const { rows } = await db(payload).execute(sql`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSec}))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at <= now() THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END
    RETURNING count, GREATEST(0, CEIL(EXTRACT(EPOCH FROM (reset_at - now()))))::int AS retry_after`)

  // Abgelaufene Einträge gelegentlich aufräumen (kein eigener Job nötig)
  if (Math.random() < 0.02) await purgeExpired(payload)

  const count = Number(rows[0]?.count ?? 0)
  return { ok: count <= limit, count, retryAfterSec: Number(rows[0]?.retry_after ?? windowSec) }
}

/**
 * Markiert `key` als verbraucht bis `expiresAt`. Gibt `false` zurück, wenn der Schlüssel
 * bereits (noch gültig) verbraucht war – z. B. Replay-Schutz für ALTCHA-Lösungen.
 */
export async function consumeOnce(payload: Payload, key: string, expiresAt: Date): Promise<boolean> {
  const { rows } = await db(payload).execute(sql`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (${key}, 1, ${expiresAt.toISOString()}::timestamptz)
    ON CONFLICT (key) DO UPDATE SET count = 1, reset_at = EXCLUDED.reset_at
      WHERE rate_limits.reset_at <= now()
    RETURNING key`)
  return rows.length === 1
}

export async function purgeExpired(payload: Payload): Promise<void> {
  await db(payload).execute(sql`DELETE FROM rate_limits WHERE reset_at <= now()`)
}
