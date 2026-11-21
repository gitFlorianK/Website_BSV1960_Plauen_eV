import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

import { totp } from '../../src/lib/auth/totp'

export interface LoginOptions {
  page: Page
  user: { email: string; password: string; totpSecret?: string }
  /** Ziel nach der Anmeldung (Standard: Mitgliederbereich). */
  redirect?: string
  /** Zweiter Faktor von Hand, z. B. ein Wiederherstellungscode (statt TOTP aus `user.totpSecret`). */
  code?: string
}

/**
 * Anmeldung über /login (das Admin-Panel leitet dorthin um), bei Bedarf mit TOTP-Code.
 * Der Code stammt aus dem nächsten Zeitschritt, damit ein eben verwendeter nicht kollidiert.
 */
export async function login({ page, user, redirect = '/mitglieder', code: fixedCode }: LoginOptions): Promise<void> {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  const main = page.locator('main')
  await main.getByLabel('E-Mail-Adresse').fill(user.email)
  await main.getByLabel('Passwort', { exact: true }).fill(user.password)
  await main.getByRole('button', { name: 'Anmelden' }).click()

  if (user.totpSecret || fixedCode) {
    const code = main.getByLabel('Bestätigungscode')
    await expect(code).toBeVisible()
    await code.fill(fixedCode ?? totp(user.totpSecret!, new Date(Date.now() + 30_000)))
    await main.getByRole('button', { name: 'Code bestätigen' }).click()
  }
  await page.waitForURL((url) => url.pathname === redirect.split('?')[0])
}
