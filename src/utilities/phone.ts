/**
 * „0152-541 566 36 (ab 16:00 Uhr)“ → „tel:+4915254156636“.
 * Hinweise in Klammern gehören nicht zur Nummer.
 */
export const telHref = (phone: string): string | null => {
  const digits = phone.split('(')[0]!.replace(/[^0-9+]/g, '')
  if (digits.length < 5) return null
  const intl = digits.startsWith('+') ? digits : digits.startsWith('00') ? `+${digits.slice(2)}` : `+49${digits.replace(/^0/, '')}`
  return `tel:${intl}`
}
