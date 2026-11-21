import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seed, seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

test.describe('Admin Panel', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()

    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3000',
      extraHTTPHeaders: { 'x-real-ip': `203.0.113.${Math.floor(Math.random() * 250) + 1}` },
    })
    page = await context.newPage()

    await login({ page, user: testUser, redirect: '/admin' })
  })

  test.afterAll(async () => {
    seed({ action: 'deleteEmptyDrafts' })
    await cleanupTestUser()
  })

  test('Admin-Login leitet zur Website-Anmeldung um', async ({ page: anon }) => {
    await anon.goto('/admin/login')
    await expect(anon).toHaveURL(/\/login(\?|$)/)
  })

  test('can navigate to dashboard', async () => {
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin')
    const dashboardArtifact = page.locator('span[title="Übersicht"]').first()
    await expect(dashboardArtifact).toBeVisible()
  })

  test('can navigate to list view', async () => {
    await page.goto('/admin/collections/users')
    // Payload ergänzt Listen-Parameter (z. B. ?limit=) teils nachträglich
    await expect(page).toHaveURL(/\/admin\/collections\/users(\?.*)?$/)
    const listViewArtifact = page.locator('h1', { hasText: 'Nutzer' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('Weiterleitungen: mehrteilige alte Adresse, wirkt sofort und ist nach dem Löschen weg', async ({ request }) => {
    const from = `/index.php/e2e-${Date.now()}/alt`
    // Vorher: unbekannte tiefe Adresse → eigene 404-Seite (Catch-all statt Next-Standardseite)
    expect((await request.get(from, { maxRedirects: 0 })).status()).toBe(404)

    await page.goto('/admin/collections/redirects')
    await expect(page.locator('h1', { hasText: 'Weiterleitungen' }).first()).toBeVisible()
    // Wie das Admin-Panel: Cookie-Anmeldung zählt nur mit passendem Origin (CSRF-Schutz)
    const headers = { origin: 'http://127.0.0.1:3000' }
    const created = await page.request.post('/api/redirects', { headers, data: { from, to: { type: 'custom', url: '/verein' } } })
    expect(created.status()).toBe(201)
    const { doc } = await created.json()

    const res = await request.get(from, { maxRedirects: 0 })
    expect(res.status()).toBe(308)
    expect(res.headers().location).toBe('/verein')

    expect((await page.request.delete(`/api/redirects/${doc.id}`, { headers })).status()).toBe(200)
    expect((await request.get(from, { maxRedirects: 0 })).status()).toBe(404)
  })

  test('can navigate to edit view', async () => {
    await page.goto('/admin/collections/pages/create')
    await expect(page).toHaveURL(/\/admin\/collections\/pages\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="title"]')
    await expect(editViewArtifact).toBeVisible()
  })
})
