import { headers } from 'next/headers'

/**
 * Client-IP für Rate-Limits. Vertraut nur dem Header `X-Real-IP`, den der eigene Reverse Proxy
 * (Caddy, Phase 8) setzt und überschreibt – `X-Forwarded-For` wäre vom Client fälschbar.
 * Ohne Proxy (lokal) gilt ein gemeinsamer Schlüssel.
 */
export async function clientIp(): Promise<string> {
  const h = await headers()
  const ip = h.get('x-real-ip')?.trim()
  return ip && ip.length <= 64 ? ip : 'unknown'
}
