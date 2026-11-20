import { describe, expect, it } from 'vitest'

import { currentSeasonType } from '@/utilities/dates'
import { isSafeUrl } from '@/utilities/safeUrl'

describe('isSafeUrl', () => {
  it.each(['https://www.dbsv.de', 'http://example.org/a?b=c', 'mailto:info@bogensport-plauen.de', 'tel:+4915254156636', '/kontakt', '#anker'])(
    'erlaubt %s',
    (url) => expect(isSafeUrl(url)).toBe(true),
  )
  it.each(['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,x', '//evil.example', 'vbscript:x', ' https://a b'])(
    'blockiert %s',
    (url) => expect(isSafeUrl(url)).toBe(false),
  )
})

describe('currentSeasonType', () => {
  it('Freiluft vom 1.4. bis 30.9., sonst Halle (Zeitzone Berlin)', () => {
    expect(currentSeasonType(new Date('2026-03-31T21:59:00Z'))).toBe('indoor')
    expect(currentSeasonType(new Date('2026-03-31T22:30:00Z'))).toBe('outdoor') // 1.4. 00:30 MESZ
    expect(currentSeasonType(new Date('2026-09-30T12:00:00Z'))).toBe('outdoor')
    expect(currentSeasonType(new Date('2026-10-01T12:00:00Z'))).toBe('indoor')
  })
})

describe('telHref', () => {
  it('ignoriert Hinweise in Klammern und erzeugt internationales Format', async () => {
    const { telHref } = await import('@/utilities/phone')
    expect(telHref('0152-541 566 36 (ab 16:00 Uhr)')).toBe('tel:+4915254156636')
    expect(telHref('+49 3741 123')).toBe('tel:+493741123')
    expect(telHref('keine')).toBeNull()
  })
})
