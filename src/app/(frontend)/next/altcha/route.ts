import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { createAltchaChallenge } from '@/lib/altcha'
import { clientIp } from '@/lib/clientIp'
import { hitRateLimit } from '@/lib/rateLimit'
import { keyedHash } from '@/lib/secrets'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }

/** Liefert eine neue ALTCHA-Challenge (für das Widget in den Formularen). */
export async function GET(): Promise<Response> {
  const payload = await getPayload({ config: configPromise })
  const rl = await hitRateLimit(payload, `altcha:challenge:${keyedHash('ip', await clientIp())}`, 60, 10 * 60)
  if (!rl.ok) {
    return Response.json(
      { error: 'Zu viele Anfragen' },
      { status: 429, headers: { ...NO_STORE, 'Retry-After': String(rl.retryAfterSec) } },
    )
  }
  return Response.json(await createAltchaChallenge(), { headers: NO_STORE })
}
