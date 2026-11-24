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

/**
 * Bilder mit Sichtbarkeit „Nur Mitglieder“ erscheinen nie in öffentlichen Inhalten und gehen nie
 * über den Bildoptimierer (/_next/image lädt ohne Login-Cookie) – Komponenten filtern mit publicMedia().
 */
test.describe('Bilder nur für Mitglieder', () => {
  const stamp = Date.now()
  const redakteur = { email: `e2e-bilder-${stamp}@test.local`, password: 'Pfeilspitze-Nocke-2026', name: 'Rita Redaktion' }
  const post = { slug: `e2e-bild-intern-${stamp}`, title: 'E2E Beitrag mit internem Bild', text: 'Öffentlicher Text mit internem Titelbild' }
  let media: { id: number; filename: string }
  /** Dateiname ohne Endung – steckt auch in allen erzeugten Bildgrößen. */
  let stem: string

  test.beforeAll(() => {
    seedUser({ ...redakteur, roles: ['redakteur'] })
    media = seed({ action: 'media', name: `e2e-intern-${stamp}.png`, alt: 'Internes Testbild', visibility: 'members' })
    stem = media.filename.replace(/\.[^.]+$/, '')
    seed({ action: 'post', title: post.title, slug: post.slug, text: post.text, visibility: 'public', status: 'published', image: media.id })
  })

  test.afterAll(() => {
    seed({ action: 'deletePost', slug: post.slug })
    seed({ action: 'deleteMedia', id: media.id })
    deleteUser(redakteur.email)
  })

  test('anonym: Beitrag ohne das Bild, Datei gesperrt', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (r) => {
      if (r.url().includes(stem)) requests.push(r.url())
    })
    // Detailseite, Beitragsliste und Startseite (Archiv-Block) zeigen den Beitrag – aber nie das Bild
    for (const path of [`/aktuelles/${post.slug}`, '/aktuelles', '/']) {
      const res = await page.goto(path, { waitUntil: 'networkidle' })
      expect(res?.status(), path).toBe(200)
      await expect(page.getByText(post.title).first(), path).toBeVisible()
      expect(await page.content(), path).not.toContain(stem)
    }
    expect(requests).toEqual([])

    const file = await page.request.get(`/api/media/file/${encodeURIComponent(media.filename)}`)
    expect(file.status()).toBe(403)
  })

  test('Vorschau mit Redaktionssitzung: internes Bild geht nicht über den Bildoptimierer', async ({ browser }) => {
    // In der Vorschau lädt die Seite das Bild mit (Staff darf es lesen) – genau dann muss publicMedia() greifen
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3000',
      extraHTTPHeaders: { 'x-real-ip': `198.51.100.${Math.floor(Math.random() * 250) + 1}` },
    })
    const page = await context.newPage()
    await login({ page, user: redakteur })
    const optimized: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/_next/image') && r.url().includes(stem)) optimized.push(r.url())
    })

    await page.goto(`/next/preview?path=${encodeURIComponent(`/aktuelles/${post.slug}`)}&previewSecret=${process.env.PREVIEW_SECRET}`)
    await expect(page.getByText(post.text)).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(await page.content()).not.toContain(`/_next/image?url=${encodeURIComponent('/api/media/file/')}${stem}`)
    expect(optimized).toEqual([])
    await context.close()
  })
})

/**
 * Die Suche zeigt nur öffentliche, veröffentlichte Inhalte – auch wenn das Suchwort exakt passt.
 */
test.describe('Suche', () => {
  const stamp = Date.now()
  const word = `Suchprobe${stamp}`
  const items = {
    public: { slug: `e2e-suche-oeffentlich-${stamp}`, title: `E2E Öffentlich ${word}` },
    members: { slug: `e2e-suche-intern-${stamp}`, title: `E2E Intern ${word}` },
    draft: { slug: `e2e-suche-entwurf-${stamp}`, title: `E2E Entwurf ${word}` },
    event: { slug: `e2e-suche-termin-${stamp}`, title: `E2E Termin intern ${word}` },
  }

  test.beforeAll(() => {
    seed({ action: 'post', ...items.public, text: 'Öffentlich', visibility: 'public', status: 'published' })
    seed({ action: 'post', ...items.members, text: 'Nur Mitglieder', visibility: 'members', status: 'published' })
    seed({ action: 'post', ...items.draft, text: 'Entwurf', visibility: 'public', status: 'draft' })
    seed({ action: 'event', ...items.event, startDate: new Date(Date.now() + 30 * 86400_000).toISOString(), visibility: 'members' })
  })

  test.afterAll(() => {
    for (const p of [items.public, items.members, items.draft]) seed({ action: 'deletePost', slug: p.slug })
    seed({ action: 'deleteEvent', slug: items.event.slug })
  })

  test('findet nur Öffentliches – keine Inhalte für Mitglieder, keine Entwürfe', async ({ page }) => {
    await page.goto(`/suche?q=${word}`)
    const main = page.locator('main')
    // Gegenprobe: Die Suche funktioniert und findet den öffentlichen Beitrag
    await expect(main.getByRole('link', { name: items.public.title })).toBeVisible()
    for (const hidden of [items.members, items.draft, items.event]) {
      await expect(main.getByText(hidden.title), hidden.title).toHaveCount(0)
    }
  })
})
