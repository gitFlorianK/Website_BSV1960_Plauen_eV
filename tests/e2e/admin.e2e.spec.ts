import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

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

  test('can navigate to edit view', async () => {
    await page.goto('/admin/collections/pages/create')
    await expect(page).toHaveURL(/\/admin\/collections\/pages\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="title"]')
    await expect(editViewArtifact).toBeVisible()
  })
})
