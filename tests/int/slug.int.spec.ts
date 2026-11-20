import { describe, expect, it } from 'vitest'

import { toGermanSlug } from '@/fields/slug'

describe('toGermanSlug', () => {
  it.each([
    ['Öffentliche Übung 2025/26', 'oeffentliche-uebung-2025-26'],
    ['Weihnachtsturnier Schneeberg', 'weihnachtsturnier-schneeberg'],
    ['Große Straße', 'grosse-strasse'],
    ['  Café — Résumé!  ', 'cafe-resume'],
  ])('%s → %s', (input, expected) => {
    expect(toGermanSlug(input)).toBe(expected)
  })
})
