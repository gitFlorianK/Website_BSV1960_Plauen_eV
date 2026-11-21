import { expect, test } from '@playwright/test'

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
