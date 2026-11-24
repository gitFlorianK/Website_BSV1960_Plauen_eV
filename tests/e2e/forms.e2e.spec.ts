import { test, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'

import { seed } from '../helpers/seedUser'

/**
 * Formulare im Browser: ALTCHA löst im Browser, Server Action speichert, Mail landet in Mailpit.
 * Jede Testdatei nutzt eine eigene (vom Proxy gesetzte) Client-IP, damit Rate-Limits zwischen
 * Testläufen nicht greifen. Erwartet laufenden Dev-Server, Mailpit und importierte Altinhalte.
 */
const MAILPIT = process.env.MAILPIT_URL || 'http://localhost:8025'

test.use({ extraHTTPHeaders: { 'x-real-ip': `203.0.113.${Math.floor(Math.random() * 250) + 1}` } })

/** Wartet auf die Mail mit passendem Betreff (an `to`, falls angegeben) und gibt ihren Text zurück. */
async function waitForMail(
  request: APIRequestContext,
  { to, subject, contains }: { to?: string; subject: string; contains?: string },
): Promise<string> {
  let text = ''
  await expect
    .poll(
      async () => {
        const url = to
          ? `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`
          : `${MAILPIT}/api/v1/messages?limit=50`
        const { messages = [] } = (await (await request.get(url)).json()) as { messages?: { ID: string; Subject: string }[] }
        for (const m of messages.filter((m) => m.Subject.includes(subject))) {
          const body = ((await (await request.get(`${MAILPIT}/api/v1/message/${m.ID}`)).json()) as { Text: string }).Text
          if (!contains || body.includes(contains)) {
            text = body
            return true
          }
        }
        return false
      },
      { message: `Mail „${subject}“${to ? ` an ${to}` : ''}`, timeout: 15_000 },
    )
    .toBe(true)
  return text
}

/** ALTCHA startet beim Fokus und muss vor dem Absenden fertig sein. */
const altchaSolved = (form: Locator) =>
  expect(form.locator('altcha-widget input[type="hidden"][name="altcha"]')).toHaveValue(/.+/, { timeout: 30_000 })

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

test('Mitgliedsantrag wird gespeichert; der Verein bekommt einen Admin-Link statt Personendaten', async ({ page, request }) => {
  const email = `e2e-antrag-${Date.now()}@example.org`
  try {
    await page.goto('/mitglied-werden')
    const form = page.locator('#antrag form')
    await form.getByLabel('Vorname').fill('Robin')
    await form.getByLabel('Nachname').fill('Antragstest')
    await form.getByLabel('Geburtsdatum').fill('1985-06-01')
    await form.getByLabel('Straße und Hausnummer').fill('Testweg 7')
    await form.getByLabel('PLZ').fill('08523')
    await form.getByLabel('Ort').fill('Plauen')
    await form.getByLabel('E-Mail').fill(email)
    await form.getByLabel('Welche Bogenart möchtest du schießen?').selectOption('recurve')
    await form.getByLabel(/Datenschutzhinweise/).check()
    await altchaSolved(form)
    await form.getByRole('button', { name: 'Antrag absenden' }).click()
    await expect(page.locator('main').getByRole('status')).toContainText('Vielen Dank für deinen Antrag')

    const [application] = seed<{ id: number; lastName: string; bowType: string; consents?: { privacyAcceptedAt?: string } }[]>({
      action: 'findByEmail',
      collection: 'membership-applications',
      emails: [email],
    })
    expect(application).toMatchObject({ lastName: 'Antragstest', bowType: 'recurve' })
    expect(application.consents?.privacyAcceptedAt).toBeTruthy()

    const mail = await waitForMail(request, { subject: 'Neuer Mitgliedsantrag', contains: `/membership-applications/${application.id}` })
    expect(mail).toContain('Recurve')
    for (const personal of [email, 'Antragstest', 'Testweg', '1985']) expect(mail).not.toContain(personal)
  } finally {
    seed({ action: 'deleteByEmail', collection: 'membership-applications', emails: [email] })
  }
})

test.describe('Kursanmeldung', () => {
  // Eigene Kurse: Die importierten Altinhalte enthalten keine (CI startet mit leerer Kursliste)
  const deadline = `${new Date().getFullYear() + 1}-03-31T12:00:00.000Z`
  let courseIds: number[] = []
  /** Kurs mit nur einem Platz – die zweite Anmeldung landet auf der Warteliste. */
  const small = { title: 'E2E Kurs klein', id: 0 }
  test.beforeAll(() => {
    seed({ action: 'deleteCourses', titlePrefix: 'E2E Kurs %' }) // Reste abgebrochener Läufe
    courseIds = (['adults', 'youth'] as const).map(
      (audience) => seed<{ id: number }>({ action: 'course', title: `E2E Kurs ${audience}`, audience, deadline }).id,
    )
    small.id = seed<{ id: number }>({ action: 'course', title: small.title, audience: 'adults', deadline, capacity: 1 }).id
  })
  test.afterAll(() => seed({ action: 'deleteCourses', titlePrefix: 'E2E Kurs %' }))

  test('„Jetzt anmelden“ wählt den Kurs im Formular vor', async ({ page }) => {
    await page.goto('/anfaengerkurs')
    const select = page.locator('#anmeldung select[name="course"]')
    // Nacheinander zwei Kurse: auch der zweite Link auf derselben Seite muss die Auswahl ändern
    for (const id of courseIds) {
      await page.locator(`a[href="/anfaengerkurs?kurs=${id}#anmeldung"]`).click()
      await expect(select).toHaveValue(String(id))
    }
  })

  test('Anmeldung mit Bestätigungslink: erst Platz, dann Warteliste; Link nur einmal gültig', async ({ page, request }) => {
    const stamp = Date.now()
    const people = [
      { firstName: 'Erika', email: `e2e-kurs-a-${stamp}@example.org`, status: 'registered', notice: 'ein Platz ist reserviert', mail: 'Anmeldung bestätigt' },
      { firstName: 'Max', email: `e2e-kurs-b-${stamp}@example.org`, status: 'waitlist', notice: 'auf der Warteliste', mail: 'Warteliste' },
    ]
    let usedLink = ''

    for (const person of people) {
      await page.goto(`/anfaengerkurs?kurs=${small.id}#anmeldung`)
      const form = page.locator('#anmeldung form')
      await expect(form.locator('select[name="course"]')).toHaveValue(String(small.id))
      await form.getByLabel('Vorname').fill(person.firstName)
      await form.getByLabel('Nachname').fill('Kurstest')
      await form.getByLabel('Geburtsdatum').fill('1990-04-12')
      await form.getByLabel('E-Mail').fill(person.email)
      await form.getByLabel(/Datenschutzhinweise/).check()
      await altchaSolved(form)
      await form.getByRole('button', { name: 'Verbindlich anmelden' }).click()
      await expect(page.locator('main').getByRole('status')).toContainText('Fast geschafft')

      // Double-Opt-in: erst der Link aus der Mail und ein Klick auf der Seite bestätigen
      const optIn = await waitForMail(request, { to: person.email, subject: 'Bitte bestätige die Anmeldung' })
      const link = new URL(optIn.match(/https?:\/\/\S+token=\S+/)![0])
      expect(link.pathname).toBe('/anmeldung-bestaetigen')
      usedLink = link.pathname + link.search
      await page.goto(usedLink)
      await page.getByRole('button', { name: 'Anmeldung jetzt bestätigen' }).click()
      await expect(page.locator('main').getByRole('status')).toContainText(person.notice)
      await waitForMail(request, { to: person.email, subject: `${person.mail}: ${small.title}` })
    }

    const registrations = seed<{ id: number; email: string; status: string }[]>({
      action: 'findByEmail',
      collection: 'course-registrations',
      emails: people.map((p) => p.email),
    })
    expect(registrations.map((r) => [r.email, r.status])).toEqual(people.map((p) => [p.email, p.status]))

    // Benachrichtigung an den Verein: Admin-Link, keine Personendaten
    const club = await waitForMail(request, { subject: `Kursanmeldung (Platz): ${small.title}`, contains: `/course-registrations/${registrations[0].id}` })
    for (const personal of [people[0].email, 'Kurstest', 'Erika']) expect(club).not.toContain(personal)

    // Ein Link gilt nur einmal
    await page.goto(usedLink)
    await page.getByRole('button', { name: 'Anmeldung jetzt bestätigen' }).click()
    await expect(page.locator('main').getByRole('alert')).toContainText('ungültig oder wurde bereits verwendet')
  })
})

test('Bestätigungsseite: ungültiger Link wird erst per Klick geprüft', async ({ page }) => {
  await page.goto('/anmeldung-bestaetigen?token=' + 'a'.repeat(43))
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await page.getByRole('button', { name: 'Anmeldung jetzt bestätigen' }).click()
  await expect(page.locator('main').getByRole('alert')).toContainText('ungültig')
})
