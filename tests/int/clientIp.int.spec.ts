/**
 * Client-IP für Rate-Limits (R6): nur X-Real-IP von Caddy; fehlender, ungültiger oder interner
 * Wert wird in Produktion einmal je Prozess gemeldet.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const header = vi.hoisted(() => ({ value: null as string | null }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers(header.value === null ? {} : { 'x-real-ip': header.value }),
}))

import { classifyClientIp, clientIp } from '@/lib/clientIp'

describe('Client-IP (X-Real-IP von Caddy)', () => {
  it('nimmt öffentliche Adressen, IPv4 und IPv6', () => {
    for (const ip of ['203.0.113.7', '8.8.8.8', '2a01:4f8:c0c:1234::1', '172.32.0.1', '100.128.0.1', 'fc::1', '::ffff:198.51.100.2']) {
      expect(classifyClientIp(ip), ip).toEqual({ ip })
    }
    expect(classifyClientIp(' 2A01:4F8::1 ')).toEqual({ ip: '2a01:4f8::1' })
  })

  it('erkennt interne Adressen (Docker-Gateway statt Besucher)', () => {
    for (const ip of ['172.18.0.1', '172.16.5.4', '10.0.0.2', '192.168.1.1', '127.0.0.1', '169.254.1.1', '100.64.0.1', '::1', 'fd00:dead::1', 'fe80::1', '::ffff:172.18.0.1']) {
      expect(classifyClientIp(ip), ip).toMatchObject({ problem: 'internal' })
    }
  })

  it('fehlender oder ungültiger Header ergibt den gemeinsamen Schlüssel „unknown“', () => {
    expect(classifyClientIp(null)).toEqual({ ip: 'unknown', problem: 'missing' })
    expect(classifyClientIp('  ')).toEqual({ ip: 'unknown', problem: 'missing' })
    // z. B. versehentlich X-Forwarded-For durchgereicht: Liste statt einer Adresse
    expect(classifyClientIp('203.0.113.7, 10.0.0.1')).toEqual({ ip: 'unknown', problem: 'invalid' })
    expect(classifyClientIp('localhost')).toEqual({ ip: 'unknown', problem: 'invalid' })
    expect(classifyClientIp('1'.repeat(80))).toEqual({ ip: 'unknown', problem: 'invalid' })
  })
})

describe('Warnung im Log', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('meldet in Produktion je Fall genau einmal; interne Adresse mit, Besucher-IPs nie', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    header.value = '203.0.113.7'
    expect(await clientIp()).toBe('203.0.113.7')
    expect(warn).not.toHaveBeenCalled()

    header.value = '172.18.0.1'
    expect(await clientIp()).toBe('172.18.0.1')
    expect(await clientIp()).toBe('172.18.0.1')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('interne Adresse (172.18.0.1)')
    expect(warn.mock.calls[0][0]).toContain('userland-proxy')

    header.value = null
    expect(await clientIp()).toBe('unknown')
    expect(await clientIp()).toBe('unknown')
    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls[1][0]).toContain('ohne X-Real-IP')
  })

  it('schweigt außerhalb der Produktion (lokal gibt es keinen Proxy)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    header.value = 'kaputt'
    expect(await clientIp()).toBe('unknown')
    expect(warn).not.toHaveBeenCalled()
  })
})
