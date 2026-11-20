import { describe, expect, it } from 'vitest'

import { buildIcs, escapeText, foldLine, localDate } from '@/lib/ics'

describe('iCal-Export', () => {
  it('escaped Sonderzeichen in TEXT-Werten', () => {
    expect(escapeText('a;b,c\\d\nneu')).toBe('a\;b\\,c\\\\d\\nneu')
  })

  it('faltet lange Zeilen auf 75 Oktette, ohne UTF-8-Zeichen zu zerteilen', () => {
    const folded = foldLine('SUMMARY:' + 'ä'.repeat(80))
    const lines = folded.split('\r\n')
    expect(lines.length).toBeGreaterThan(1)
    for (const l of lines) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75)
    expect(lines.slice(1).every((l) => l.startsWith(' '))).toBe(true)
    expect(folded.replace(/\r\n /g, '')).toBe('SUMMARY:' + 'ä'.repeat(80))
  })

  it('nutzt die Vereins-Zeitzone für ganztägige Termine (exklusives Ende)', () => {
    // 23:30 UTC am 31.3. ist in Berlin bereits der 1.4.
    expect(localDate(new Date('2026-03-31T23:30:00Z'))).toBe('20260401')
    const ics = buildIcs({
      name: 'Test',
      now: new Date('2026-01-01T00:00:00Z'),
      events: [
        {
          uid: 'e1@test',
          title: 'Turnier',
          allDay: true,
          start: new Date('2026-05-09T08:00:00Z'),
          end: new Date('2026-05-10T15:00:00Z'),
        },
      ],
    })
    expect(ics).toContain('DTSTART;VALUE=DATE:20260509')
    expect(ics).toContain('DTEND;VALUE=DATE:20260511')
  })

  it('erzeugt UTC-Zeiten, CRLF und verwirft unsichere URLs', () => {
    const ics = buildIcs({
      name: 'Test',
      now: new Date('2026-01-01T00:00:00Z'),
      events: [
        {
          uid: 'e2@test',
          title: 'Training; Halle, Plauen',
          start: new Date('2026-11-20T15:30:00Z'),
          end: new Date('2026-11-20T17:00:00Z'),
          url: 'javascript:alert(1)',
        },
      ],
    })
    expect(ics).toContain('DTSTART:20261120T153000Z\r\n')
    expect(ics).toContain('SUMMARY:Training\; Halle\\, Plauen')
    expect(ics).not.toContain('javascript')
    expect(ics.split('\r\n').every((l) => !l.includes('\n'))).toBe(true)
  })
})
