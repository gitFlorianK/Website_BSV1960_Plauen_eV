import { readdirSync } from 'node:fs'
import path from 'node:path'

import { test, expect, type APIRequestContext } from '@playwright/test'
import { totp } from '../../src/lib/auth/totp'
import { deleteUser, seed, seedUser } from '../helpers/seedUser'
import { login } from '../helpers/login'

/**
 * Mitgliederbereich im Browser: Einladung → Passwort → Anmeldung → Turnieranmeldung →
 * Zwei-Faktor-Einrichtung → Anmeldung mit Code. Mails kommen über Mailpit.
 */
const MAILPIT = process.env.MAILPIT_URL || 'http://localhost:8025'
const ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}`
test.use({ extraHTTPHeaders: { 'x-real-ip': ip } })

const stamp = Date.now()
const member = { email: `e2e-mitglied-${stamp}@test.local`, name: 'Paula Pfeil', password: 'Wolke Tanne Zielscheibe' }
const eventSlug = `e2e-turnier-${stamp}`
/** Aus der Einrichtung, für den Umzug-Test (Tests dieser Datei laufen nacheinander). */
const twoFactor = { secret: '', codes: [] as string[] }

async function latestMailTo(request: APIRequestContext, to: string) {
  let id: string | undefined
  await expect
    .poll(async () => {
      const res = await request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`)
      id = (await res.json()).messages?.[0]?.ID
      return Boolean(id)
    })
    .toBe(true)
  return (await (await request.get(`${MAILPIT}/api/v1/message/${id}`)).json()).Text as string
}

/**
 * Alle Seiten unter /mitglieder, direkt aus dem Dateisystem: Das Layout schützt nicht, jede Seite
 * muss selbst requireMember() aufrufen – eine neue Seite ohne diesen Aufruf fällt hier sofort auf.
 */
function memberPages(): string[] {
  const root = path.join(process.cwd(), 'src/app/(frontend)/mitglieder')
  return (readdirSync(root, { recursive: true }) as string[])
    .filter((f) => path.basename(f) === 'page.tsx')
    .map((f) => {
      const segments = path
        .dirname(f)
        .split(path.sep)
        .filter((s) => s !== '.' && !/^\(.*\)$/.test(s)) // Route-Gruppen erscheinen nicht in der URL
        .map((s) => (/^\[.+\]$/.test(s) ? 'e2e-gibt-es-nicht' : s)) // dynamische Segmente
      return ['/mitglieder', ...segments].join('/')
    })
    .sort()
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(() => {
  seed({ action: 'cleanup', eventSlugPrefix: 'e2e-turnier-', emailPrefix: 'e2e-mitglied-' })
  seed({
    action: 'event',
    title: 'E2E-Hallenturnier',
    slug: eventSlug,
    startDate: new Date(Date.now() + 14 * 86400_000).toISOString(),
    deadline: new Date(Date.now() + 7 * 86400_000).toISOString(),
    visibility: 'members',
  })
})

test.afterAll(() => {
  seed({ action: 'deleteEvent', slug: eventSlug })
  deleteUser(member.email)
})

test('ohne Anmeldung: Weiterleitung zur Anmeldung, REST-Login gesperrt', async ({ page, request }) => {
  await page.goto('/mitglieder/dokumente')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fmitglieder%2Fdokumente$/)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

  const res = await request.post('/api/users/login', { data: { email: member.email, password: member.password } })
  expect(res.status()).toBe(403)
})

test('ohne Anmeldung: jede Seite im Mitgliederbereich leitet zur Anmeldung um', async ({ page }) => {
  const paths = memberPages()
  expect(paths).toContain('/mitglieder')
  expect(paths).toContain('/mitglieder/aktuelles/e2e-gibt-es-nicht')
  for (const p of paths) {
    await page.goto(p)
    const url = new URL(page.url())
    expect(url.pathname, p).toBe('/login')
    expect(url.searchParams.get('redirect'), p).toBe(p)
  }
})

test('Einladung annehmen, anmelden, für ein Turnier melden', async ({ page, request }) => {
  seedUser({ email: member.email, name: member.name, password: 'wird-verworfen-123', roles: ['mitglied'], invite: true })
  const text = await latestMailTo(request, member.email)
  const link = new URL(text.match(/https?:\/\/\S+\/einladung\?token=\S+/)![0])

  await page.goto(`${link.pathname}${link.search}`)
  const main = page.locator('main')
  await main.getByLabel('Neues Passwort').fill(member.password)
  await main.getByLabel('Passwort wiederholen').fill(member.password)
  await main.getByRole('button', { name: 'Passwort festlegen' }).click()
  await expect(page).toHaveURL(/\/login\?passwort=neu/)
  await expect(main.getByRole('status')).toContainText('Passwort ist gespeichert')

  await login({ page, user: member })
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Hallo Paula!')
  await expect(main.getByText('E2E-Hallenturnier')).toBeVisible()

  await page.getByRole('navigation', { name: 'Mitgliederbereich' }).getByRole('link', { name: 'Termine' }).click()
  const item = main.locator('li', { hasText: 'E2E-Hallenturnier' })
  await item.getByLabel('Bogenklasse').selectOption('barebow')
  await item.getByRole('button', { name: 'Anmelden' }).click()
  await expect(item).toContainText('Du bist angemeldet. Bogenklasse: Blankbogen')

  await item.getByRole('button', { name: 'Abmelden' }).click()
  await expect(item.getByRole('button', { name: 'Wieder anmelden' })).toBeVisible()
})

test('Zwei-Faktor-Anmeldung einrichten und damit anmelden', async ({ page }) => {
  await login({ page, user: member, redirect: '/mitglieder/sicherheit' })
  const main = page.locator('main')
  await main.getByRole('button', { name: 'Zwei-Faktor-Anmeldung einrichten' }).click()
  await expect(main.getByRole('img', { name: /QR-Code/ })).toBeVisible()
  const secret = (await main.locator('p.font-mono').innerText()).replace(/\s/g, '')
  await main.getByLabel('Sechsstelliger Code').fill(totp(secret))
  await main.getByRole('button', { name: 'Code bestätigen' }).click()
  await expect(main.getByText('Deine Wiederherstellungscodes')).toBeVisible()
  await expect(main.locator('ul.font-mono li')).toHaveCount(8)
  Object.assign(twoFactor, { secret, codes: await main.locator('ul.font-mono li').allInnerTexts() })
  await main.getByRole('button', { name: 'Ich habe die Codes gesichert' }).click()
  await expect(main.getByText('Die Zwei-Faktor-Anmeldung ist aktiv.')).toBeVisible()

  // Die Einrichtung beendet andere Sessions, die aktuelle bleibt
  await page.getByRole('button', { name: 'Abmelden' }).first().click()
  await expect(page).toHaveURL(/\/login\?abgemeldet=1/)

  await login({ page, user: { ...member, totpSecret: secret } })
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Hallo Paula!')
})

test('Zwei-Faktor-Anmeldung auf ein neues Handy übertragen (nur mit Passwort und Code)', async ({ page }) => {
  // Jeder App-Code gilt nur einmal und nur ±30 s – mehrere Schritte nacheinander gehen deshalb mit
  // Wiederherstellungscodes (der Weg bei verlorenem Handy)
  const [loginCode, cancelCode, moveCode] = twoFactor.codes
  await login({ page, user: member, code: loginCode, redirect: '/mitglieder/sicherheit' })
  const main = page.locator('main')
  const move = main.locator('details', { hasText: 'Auf ein neues Handy übertragen' })
  const startMove = async (code: string) => {
    if (!(await move.getByLabel('Code aus der App').isVisible())) await move.locator('summary').click()
    await move.getByLabel('Passwort', { exact: true }).fill(member.password)
    await move.getByLabel('Code aus der App').fill(code)
    await move.getByRole('button', { name: 'Weiter zum QR-Code' }).click()
  }

  await startMove('000000')
  await expect(main.getByText('Passwort oder Code ist falsch.')).toBeVisible()
  await expect(main.getByRole('img', { name: /QR-Code/ })).toHaveCount(0)

  // Abbrechen: das alte Handy gilt weiter
  await startMove(cancelCode)
  await expect(main.getByText('Nimm dazu dein neues Handy.', { exact: false })).toBeVisible()
  await main.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(main.getByText('Abgebrochen – dein bisheriges Handy gilt weiter.')).toBeVisible()

  // Übertragen und mit der neuen App bestätigen
  await startMove(moveCode)
  const newSecret = (await main.locator('p.font-mono').innerText()).replace(/\s/g, '')
  expect(newSecret).not.toBe(twoFactor.secret)
  await main.getByLabel('Sechsstelliger Code').fill(totp(newSecret))
  await main.getByRole('button', { name: 'Code bestätigen' }).click()
  await expect(main.getByText(/läuft jetzt über dein neues Handy/)).toBeVisible()
  await expect(main.locator('ul.font-mono li')).toHaveCount(8)
  await main.getByRole('button', { name: 'Ich habe die Codes gesichert' }).click()
  await page.getByRole('button', { name: 'Abmelden' }).first().click()
  await expect(page).toHaveURL(/\/login\?abgemeldet=1/)

  // Altes Handy und alte Wiederherstellungscodes gelten nicht mehr, das neue Handy schon
  await page.goto('/login')
  await main.getByLabel('E-Mail-Adresse').fill(member.email)
  await main.getByLabel('Passwort', { exact: true }).fill(member.password)
  await main.getByRole('button', { name: 'Anmelden' }).click()
  for (const code of [totp(twoFactor.secret), twoFactor.codes[3]]) {
    await main.getByLabel('Bestätigungscode').fill(code)
    await main.getByRole('button', { name: 'Code bestätigen' }).click()
    await expect(main.getByText(/Code ist ungültig/)).toBeVisible()
  }
  await login({ page, user: { ...member, totpSecret: newSecret } })
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Hallo Paula!')
})

test('Passwort vergessen schickt einen Link (Antwort neutral)', async ({ page, request }) => {
  await page.goto('/passwort-vergessen')
  const main = page.locator('main')
  await main.getByLabel('E-Mail-Adresse').fill(member.email)
  await expect(main.locator('altcha-widget input[type="hidden"][name="altcha"]')).toHaveValue(/.+/, { timeout: 30_000 })
  await main.getByRole('button', { name: 'Link anfordern' }).click()
  await expect(main.getByRole('status')).toContainText('Wenn es zu dieser E-Mail-Adresse ein Konto gibt')
  const text = await latestMailTo(request, member.email)
  expect(text).toContain('/passwort-zuruecksetzen?token=')
})
