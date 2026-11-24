import { test, expect } from '@playwright/test'

/**
 * Smoke-Tests des öffentlichen Frontends. Erwartet importierte Altinhalte (pnpm import:legacy).
 */
test.describe('Frontend', () => {
  test('Startseite mit Navigation, Skip-Link und ohne Drittanbieter-Requests', async ({ page }) => {
    const external: string[] = []
    page.on('request', (r) => {
      const { hostname } = new URL(r.url())
      if (!['127.0.0.1', 'localhost'].includes(hostname)) external.push(r.url())
    })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page).toHaveTitle(/BSV 1960 Plauen/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Zum Inhalt springen' })).toBeFocused()

    expect(external).toEqual([])
  })

  test('Buttons im Titelbild sind anklickbar (Bild liegt nicht darüber)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const hero = page.locator('main section').first()
    await expect(hero.locator('img')).toBeVisible()
    // click() scheitert, wenn ein anderes Element (z. B. das <picture> des Titelbilds) die Klicks abfängt
    await hero.getByRole('link', { name: 'Anfängerkurs', exact: true }).click({ timeout: 5_000 })
    await expect(page).toHaveURL(/\/anfaengerkurs$/)
    await page.goBack()
    await hero.getByRole('link', { name: 'Trainingszeiten', exact: true }).click({ timeout: 5_000 })
    await expect(page).toHaveURL(/\/training$/)
  })

  test('Trainingszeiten zeigen beide Saisons, eine davon als aktuell', async ({ page }) => {
    await page.goto('/training')
    await expect(page.getByRole('heading', { name: 'Hallensaison' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Freiluftsaison' })).toBeVisible()
    await expect(page.getByText('Aktuell', { exact: true })).toHaveCount(1)
  })

  test('Mobiles Menü ist per Button bedienbar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto('/')
    const button = page.getByRole('button', { name: 'Menü' })
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('navigation', { name: 'Hauptnavigation (mobil)' }).getByRole('link', { name: 'Training' }).click()
    await expect(page).toHaveURL(/\/training$/)
  })

  test('Beiträge, Saisonarchiv und Detailseite', async ({ page }) => {
    await page.goto('/aktuelles')
    await expect(page.getByRole('navigation', { name: 'Ergebnisarchiv nach Saison' })).toBeVisible()
    await page.getByRole('link', { name: 'Rückblick Hallensaison 2019/20' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rückblick Hallensaison 2019/20')
  })

  test('Alte URLs leiten dauerhaft um', async ({ request }) => {
    const res = await request.get('/training.html', { maxRedirects: 0 })
    expect(res.status()).toBe(308)
    expect(res.headers()['location']).toMatch(/\/training$/)
  })

  test('iCal-Feed ist gültig', async ({ request }) => {
    const res = await request.get('/termine.ics')
    expect(res.headers()['content-type']).toContain('text/calendar')
    const body = await res.text()
    expect(body.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(body.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
  })

  test('Inhalte „nur für Mitglieder“ sind anonym nicht abrufbar', async ({ page, request }) => {
    await page.goto('/galerie')
    await expect(page.getByText('nur für Vereinsmitglieder sichtbar')).toBeVisible()
    expect((await request.get('/galerie/goerlitz-2014')).status()).toBe(404)
    const media = await request.get('/api/media?where[visibility][equals]=members&limit=1')
    expect((await media.json()).docs).toEqual([])
  })

  test('Rechtstexte: Pflichtangaben aus den Vereinsdaten, Fristen aus dem System', async ({ page }) => {
    await page.goto('/impressum')
    await expect(page.getByRole('heading', { name: 'Angaben gemäß § 5 DDG' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Vertreten durch den Vorstand/ })).toBeVisible()
    await expect(page.getByText('Registernummer: VR 120')).toBeVisible()

    await page.goto('/datenschutz')
    await expect(page.getByRole('heading', { name: 'Verantwortlicher' })).toBeVisible()
    const table = page.getByRole('table')
    await expect(table.getByRole('row', { name: /ohne Bestätigung.*48 Stunden/ })).toBeVisible()
    await expect(table.getByRole('row', { name: /Kontaktanfragen.*6 Monate/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Deine Rechte' })).toBeVisible()
    // Die Formulare verlinken auf diese Seite
    await page.goto('/kontakt')
    await expect(page.getByRole('link', { name: 'Datenschutzhinweise' })).toHaveAttribute('href', '/datenschutz')
  })

  test('404-Seite auf Deutsch – auch für tiefe und verschachtelte Adressen, mit Layout', async ({ page }) => {
    for (const path of ['/gibt-es-nicht', '/a/b/c', '/aktuelles/gibt/es-nicht', '/termine/x/y', '/aktuelles/gibt-es-nicht']) {
      const res = await page.goto(path)
      expect(res?.status(), path).toBe(404)
      await expect(page.getByRole('heading', { level: 1 }), path).toHaveText('Daneben getroffen')
      await expect(page, path).toHaveTitle('Seite nicht gefunden | BSV 1960 Plauen')
      await expect(page.getByRole('link', { name: 'Training' }).first(), path).toBeVisible()
    }
  })

  test('Klickflächen mindestens 24 × 24 px (WCAG 2.2, 2.5.8)', async ({ page }) => {
    const targets: [string, (p: typeof page) => ReturnType<typeof page.locator>][] = [
      ['/', (p) => p.locator('footer a[href^="tel:"]')],
      ['/', (p) => p.locator('footer a[href^="mailto:"]')],
      ['/termine', (p) => p.getByRole('link', { name: '.ics herunterladen' })],
      ['/login', (p) => p.getByRole('link', { name: 'Passwort vergessen?' })],
      ['/kontakt', (p) => p.locator('#kontaktformular input[type="checkbox"]').first()],
    ]
    for (const [path, find] of targets) {
      await page.goto(path)
      const box = await find(page).boundingBox()
      expect(box, path).not.toBeNull()
      expect(box!.height, path).toBeGreaterThanOrEqual(24)
      expect(box!.width, path).toBeGreaterThanOrEqual(24)
    }
  })
})
