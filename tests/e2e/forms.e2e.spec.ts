import { test, expect, type Page } from '@playwright/test'

/**
 * Formulare im Browser: ALTCHA löst im Browser, Server Action speichert, Mail landet in Mailpit.
 * Jede Testdatei nutzt eine eigene (vom Proxy gesetzte) Client-IP, damit Rate-Limits zwischen
 * Testläufen nicht greifen. Erwartet laufenden Dev-Server, Mailpit und importierte Altinhalte.
 */
const MAILPIT = process.env.MAILPIT_URL || 'http://localhost:8025'

test.use({ extraHTTPHeaders: { 'x-real-ip': `203.0.113.${Math.floor(Math.random() * 250) + 1}` } })

function trackExternal(page: Page) {
  const external: string[] = []
  page.on('request', (r) => {
    const { hostname } = new URL(r.url())
    if (!['127.0.0.1', 'localhost'].includes(hostname) && !r.url().startsWith('blob:')) external.push(r.url())
  })
  return external
}

test('Kontaktformular: Spamschutz, Versand und Mail an den Verein', async ({ page, request }) => {
  const external = trackExternal(page)
  const marker = `E2E-${Date.now()}`
  await page.goto('/kontakt')

  const form = page.locator('#kontaktformular form')
  await form.getByLabel('Name').fill(marker)
  await form.getByLabel('E-Mail').fill('e2e@example.org')
  await form.getByLabel('Nachricht').fill('Testnachricht aus dem automatisierten Test.')
  await form.getByLabel(/Datenschutzhinweise/).check()

  // ALTCHA startet beim Fokus und muss vor dem Absenden fertig sein
  await expect(form.locator('altcha-widget input[type="hidden"][name="altcha"]')).toHaveValue(/.+/, { timeout: 30_000 })
  await form.getByRole('button', { name: 'Nachricht senden' }).click()

  await expect(page.locator('main').getByRole('status')).toContainText('Danke für deine Nachricht')

  await expect
    .poll(async () => {
      const res = await request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(marker)}`)
      return (await res.json()).messages_count
    })
    .toBe(1)

  expect(external).toEqual([])
})

test('Server-Validierung zeigt Fehler am Feld (ohne Browser-Validierung)', async ({ page }) => {
  await page.goto('/kontakt')
  const form = page.locator('#kontaktformular form')
  await form.evaluate((f: HTMLFormElement) => (f.noValidate = true))
  await form.getByLabel('Name').fill('Erika')
  await form.getByLabel('E-Mail').fill('keine-adresse')
  await form.getByLabel('Nachricht').fill('kurz')
  await form.getByRole('button', { name: 'Nachricht senden' }).click()

  await expect(page.locator('main').getByRole('alert')).toContainText('Bitte prüfe die markierten Felder')
  const email = page.locator('#kontaktformular').getByLabel('E-Mail')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toHaveValue('keine-adresse')
  await expect(page.locator('#f-email-error')).toContainText('gültige E-Mail')
})

test('Mitgliedsantrag blendet Angaben der Erziehungsberechtigten nur bei Minderjährigen ein', async ({ page }) => {
  await page.goto('/mitglied-werden')
  const form = page.locator('#antrag form')
  await expect(form.getByRole('group', { name: 'Erziehungsberechtigte(r)' })).toHaveCount(0)
  await form.getByLabel('Geburtsdatum').fill(`${new Date().getFullYear() - 12}-05-01`)
  await expect(form.getByRole('group', { name: 'Erziehungsberechtigte(r)' })).toBeVisible()
  await form.getByLabel('Geburtsdatum').fill('1980-05-01')
  await expect(form.getByRole('group', { name: 'Erziehungsberechtigte(r)' })).toHaveCount(0)
})

test('„Jetzt anmelden“ wählt den Kurs im Formular vor', async ({ page }) => {
  await page.goto('/anfaengerkurs')
  const links = page.getByRole('link', { name: /Jetzt anmelden|Auf die Warteliste/ })
  expect(await links.count()).toBeGreaterThanOrEqual(2)
  const select = page.locator('#anmeldung select[name="course"]')
  // Nacheinander zwei Kurse: auch der zweite Link auf derselben Seite muss die Auswahl ändern
  for (const i of [0, 1]) {
    const id = new URL((await links.nth(i).getAttribute('href'))!, 'http://x').searchParams.get('kurs')
    await links.nth(i).click()
    await expect(select).toHaveValue(id!)
  }
})

test('Bestätigungsseite: ungültiger Link wird erst per Klick geprüft', async ({ page }) => {
  await page.goto('/anmeldung-bestaetigen?token=' + 'a'.repeat(43))
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await page.getByRole('button', { name: 'Anmeldung jetzt bestätigen' }).click()
  await expect(page.locator('main').getByRole('alert')).toContainText('ungültig')
})
