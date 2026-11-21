import { expect, test } from '@playwright/test'

import { login } from '../helpers/login'
import { deleteUser, seed, seedUser } from '../helpers/seedUser'

/**
 * Phase 6: Sicherheits-Header, Nonce-CSP und Datei-Auslieferung (läuft gegen den Dev-Server).
 */
test.describe('Sicherheits-Header', () => {
  test('HTML-Seiten: Nonce-CSP und Schutz-Header, keine CSP-Verstöße', async ({ page }) => {
    const violations: string[] = []
    page.on('console', (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text())
    })
    const res = await page.goto('/kontakt', { waitUntil: 'networkidle' })
    const h = res!.headers()
    const csp = h['content-security-policy']
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1]
    expect(nonce).toBeTruthy()
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'self'")
    expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['x-frame-options']).toBe('SAMEORIGIN')
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(h['permissions-policy']).toContain('camera=()')
    expect(h['x-powered-by']).toBeUndefined()

    // Jede Antwort bekommt eine neue Nonce; alle Skripte im Server-HTML tragen sie
    // (nachgeladene Chunks erlaubt 'strict-dynamic')
    const fresh = await page.request.get('/kontakt')
    const freshNonce = /'nonce-([^']+)'/.exec(fresh.headers()['content-security-policy'])?.[1]
    expect(freshNonce).toBeTruthy()
    expect(freshNonce).not.toBe(nonce)
    const tags = (await fresh.text()).match(/<script\b[^>]*>/g) ?? []
    expect(tags.length).toBeGreaterThan(0)
    for (const tag of tags) expect(tag).toContain(`nonce="${freshNonce}"`)

    // ALTCHA (Web Worker per blob:) startet ohne Verstoß
    await page.getByLabel('Name').first().focus()
    await page.waitForTimeout(1500)
    expect(violations).toEqual([])
  })

  test('API: restriktive CSP; interne Dateien nur mit Login und nie in geteilten Caches', async ({ request }) => {
    const api = await request.get('/api/pages?limit=1')
    expect(api.headers()['content-security-policy']).toContain('sandbox')

    const internal = await request.get('/api/documents?limit=1')
    expect(internal.status()).toBe(403)

    const media = await request.get('/api/media?limit=1&where[visibility][equals]=public&depth=0')
    const doc = (await media.json()).docs?.[0]
    test.skip(!doc, 'keine öffentlichen Medien importiert')
    const file = await request.get(`/api/media/file/${encodeURIComponent(doc.filename)}`)
    expect(file.status()).toBe(200)
    expect(file.headers()['cache-control']).toMatch(/^private/)
    expect(file.headers()['content-security-policy']).toContain("script-src 'none'")
  })
})

/**
 * Entwurfsmodus (Live-Vorschau): öffnet Entwürfe nur zusammen mit einer Staff-Sitzung.
 * Das Draft-Mode-Cookie allein (z. B. nach dem Abmelden am Vereins-PC) darf nichts freigeben.
 */
test.describe('Vorschau', () => {
  const redakteur = { email: 'e2e-vorschau@test.local', password: 'Pfeilspitze-Nocke-2026', name: 'Rita Redaktion' }
  const draftPost = { slug: 'e2e-vorschau-entwurf', text: 'Entwurfstext nur für die Redaktion' }
  const internalPost = { slug: 'e2e-vorschau-intern', text: 'Interner Text nur für Mitglieder' }

  test.beforeAll(() => {
    seedUser({ ...redakteur, roles: ['redakteur'] })
    seed({ action: 'post', title: 'E2E Vorschau Entwurf', slug: draftPost.slug, text: draftPost.text, visibility: 'public', status: 'draft' })
    seed({ action: 'post', title: 'E2E Vorschau Intern', slug: internalPost.slug, text: internalPost.text, visibility: 'members', status: 'published' })
  })

  test.afterAll(() => {
    seed({ action: 'deletePost', slug: draftPost.slug })
    seed({ action: 'deletePost', slug: internalPost.slug })
    deleteUser(redakteur.email)
  })

  test('nur mit Staff-Sitzung; ein liegengebliebenes Vorschau-Cookie öffnet nichts', async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3000',
      extraHTTPHeaders: { 'x-real-ip': `198.51.100.${Math.floor(Math.random() * 250) + 1}` },
    })
    const page = await context.newPage()
    await login({ page, user: redakteur })

    const previewUrl = (path: string) => `/next/preview?path=${encodeURIComponent(path)}&previewSecret=${process.env.PREVIEW_SECRET}`
    await page.goto(previewUrl(`/aktuelles/${draftPost.slug}`))
    await expect(page.getByText(draftPost.text)).toBeVisible()
    await page.goto(`/aktuelles/${internalPost.slug}`)
    await expect(page.getByText(internalPost.text)).toBeVisible()
    const bypass = (await context.cookies()).find((c) => c.name === '__prerender_bypass')
    expect(bypass).toBeTruthy()

    // Abmelden entfernt das Vorschau-Cookie …
    await page.goto('/mitglieder')
    await page.getByRole('button', { name: 'Abmelden' }).click()
    await page.waitForURL(/\/login\?abgemeldet=1/)
    expect((await context.cookies()).find((c) => c.name === '__prerender_bypass')).toBeUndefined()

    // … und selbst ein zurückgelegtes Cookie ohne Sitzung gibt weder Entwurf noch internen Beitrag frei
    await context.addCookies([bypass!])
    for (const slug of [draftPost.slug, internalPost.slug]) {
      const res = await page.goto(`/aktuelles/${slug}`)
      expect(res?.status()).toBe(404)
    }
    await expect(page.getByText(internalPost.text)).toHaveCount(0)
    await context.close()
  })
})
