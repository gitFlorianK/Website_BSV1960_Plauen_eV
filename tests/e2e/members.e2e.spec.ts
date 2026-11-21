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
  await main.getByRole('button', { name: 'Ich habe die Codes gesichert' }).click()
  await expect(main.getByText('Die Zwei-Faktor-Anmeldung ist aktiv.')).toBeVisible()

  // Die Einrichtung beendet andere Sessions, die aktuelle bleibt
  await page.getByRole('button', { name: 'Abmelden' }).first().click()
  await expect(page).toHaveURL(/\/login\?abgemeldet=1/)

  await login({ page, user: { ...member, totpSecret: secret } })
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
