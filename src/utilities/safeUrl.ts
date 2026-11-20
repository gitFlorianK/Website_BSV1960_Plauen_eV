/**
 * Erlaubte Link-Ziele für redaktionell gepflegte URLs. Verhindert u. a. `javascript:`-/`data:`-URLs
 * (gespeichertes XSS über Navigation, Buttons oder Rich Text).
 */
const SAFE_URL = /^(https?:\/\/[^\s]+|mailto:[^\s]+|tel:\+?[0-9 ()/-]+|\/(?!\/)[^\s]*|#[^\s]*)$/i

export const isSafeUrl = (url: unknown): url is string => typeof url === 'string' && SAFE_URL.test(url.trim())

export const validateSafeUrl = (value: unknown): true | string =>
  !value ||
  isSafeUrl(value) ||
  'Erlaubt sind https://…, mailto:…, tel:… oder interne Pfade wie /kontakt.'
