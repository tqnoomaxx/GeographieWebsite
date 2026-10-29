import { test, expect, type Page, type BrowserContext } from '@playwright/test'

type Note = {
  id: string
  text: string
  context: string
  version: number
  createdAt: string
  updatedAt: string
}
type Book = { secret: string; notes: Note[] }
const runtimeErrors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  runtimeErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
})
test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([])
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
})

const ACCESS_KEY = 'atlasfunke.notes.access.v1'
const round = 'play/flags/round?quiz=country-flags&mode=choice&scope=world&len=10&repeat=0'

function onlineServer() {
  const books = new Map<string, Book>()
  let failNextSave = false
  return {
    books,
    failSave() {
      failNextSave = true
    },
    async attach(context: BrowserContext) {
      await context.route('**/functions/v1/quiz-notes', async (route) => {
        const request = route.request()
        const headers = {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info',
          'content-type': 'application/json',
          'cache-control': 'no-store',
        }
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers, body: '' })
        const body = request.postDataJSON()
        const reply = (status: number, data: unknown) =>
          route.fulfill({ status, headers, body: JSON.stringify(data) })
        if (failNextSave && ['save', 'create'].includes(body.action)) {
          failNextSave = false
          return reply(503, { error: 'store_unavailable' })
        }
        if (body.action === 'create' && !books.has(body.notebookId))
          books.set(body.notebookId, { secret: body.secret, notes: [] })
        const book = books.get(body.notebookId)
        if (!book || book.secret !== body.secret) return reply(404, { error: 'notebook_not_found' })
        if (body.action === 'destroy') {
          books.delete(body.notebookId)
          return reply(200, { notes: [] })
        }
        if (['create', 'save', 'delete'].includes(body.action)) {
          const note = body.note
          const previous = book.notes.find((n) => n.id === note.id)
          if (body.action === 'delete') {
            if (previous && previous.version !== note.expectedVersion)
              return reply(409, { error: 'note_conflict' })
            book.notes = book.notes.filter((n) => n.id !== note.id)
          } else if (!(body.action === 'create' && previous)) {
            if ((previous?.version ?? 0) !== note.expectedVersion)
              return reply(409, { error: 'note_conflict' })
            const now = new Date().toISOString()
            const next = {
              id: note.id,
              text: note.text,
              context: note.context,
              version: (previous?.version ?? 0) + 1,
              createdAt: previous?.createdAt ?? now,
              updatedAt: now,
            }
            book.notes = [next, ...book.notes.filter((n) => n.id !== note.id)]
          }
        }
        return reply(200, { notes: book.notes })
      })
    },
  }
}
async function open(page: Page) {
  await page.getByRole('button', { name: 'Notizen', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}
async function cloudReady(page: Page) {
  test.skip(
    await page.getByText('Online-Notizen noch nicht verbunden', { exact: true }).isVisible(),
    'Online-Tests benötigen einen Build mit VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY; die Netzwerkantworten werden lokal simuliert.',
  )
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}

// This smoke test runs in the normal, backend-free build too.
test('Notizknopf ist in Auswahl-, Karten-, Eingabe-, Städte-, Tages- und Story-Quizzes erreichbar', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const route of [
    round,
    'play/countries/round?quiz=country-map&mode=map&scope=europe&len=10',
    'play/capitals/round?quiz=name-capital&mode=input&scope=europe&len=10',
    'play/countries/round?quiz=country-profile&mode=input&scope=europe&len=10',
    'play/cities/round?quiz=city-recall&scope=country%3ADE&population=175001',
    'daily/flagle',
  ]) {
    await page.goto(route)
    const trigger = page.getByRole('button', { name: 'Notizen', exact: true })
    await expect(trigger).toBeVisible()
    const progress = page.locator('.quiz-topbar-progress > strong')
    if (await progress.count()) {
      const buttonBox = (await trigger.boundingBox())!
      const countBox = (await progress.boundingBox())!
      const overlaps =
        buttonBox.x < countBox.x + countBox.width &&
        buttonBox.x + buttonBox.width > countBox.x &&
        buttonBox.y < countBox.y + countBox.height &&
        buttonBox.y + buttonBox.height > countBox.y
      expect(overlaps).toBe(false)
    }
    await open(page)
    await noOverflow(page)
    await page.getByRole('button', { name: 'Notizen schließen' }).click()
    await expect(page.getByRole('button', { name: 'Notizen', exact: true })).toBeFocused()
  }
  await page.goto('story')
  await page.locator('[data-story-route="0"]').click()
  await open(page)
  await page.screenshot({ path: `/tmp/atlas-notes-setup-${testInfo.project.name}.png`, fullPage: false })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Notizen', exact: true })).toBeFocused()
  await noOverflow(page)
  expect(errors).toEqual([])
})

test('Online-Notizen synchronisieren ohne Anmeldung zwischen zwei unabhängigen Geräten', async ({
  page,
  context,
  browser,
  baseURL,
}, testInfo) => {
  const server = onlineServer()
  await server.attach(context)
  await page.goto(round)
  await open(page)
  await cloudReady(page)
  await page.keyboard.press('1')
  await expect(page.locator('.quiz-feedback')).toHaveCount(0)
  await page
    .getByLabel('Das möchte ich verbessern', { exact: true })
    .fill('Hauptstädte in Afrika wiederholen\nIndien liegt bei den Einwohnern vorn.')
  await page.getByRole('button', { name: 'Notiz speichern', exact: true }).click()
  await expect(page.locator('[data-learning-note]')).toHaveCount(1)
  await expect(page.getByText('Notiz online gespeichert.', { exact: true })).toBeVisible()
  await page.getByText('Auf einem anderen Gerät öffnen', { exact: true }).click()
  const link = await page.getByLabel('Persönlicher Notizlink').inputValue()
  expect(new URL(link).hash).toContain('#notebook=')
  expect(new URL(link).search).toBe('')
  await page.screenshot({ path: `/tmp/atlas-notes-online-${testInfo.project.name}.png`, fullPage: false })
  const otherContext = await browser.newContext({
    baseURL,
    viewport: { width: 393, height: 851 },
    locale: 'de-DE',
    serviceWorkers: 'block',
  })
  try {
    await server.attach(otherContext)
    const other = await otherContext.newPage()
    await other.goto(link)
    await expect(other.locator('[data-learning-note]')).toHaveCount(1)
    await expect(other.locator('[data-learning-note]')).toContainText('Hauptstädte in Afrika')
    await other.getByRole('button', { name: 'Notiz bearbeiten', exact: true }).click()
    await other
      .getByRole('textbox', { name: 'Notiz bearbeiten', exact: true })
      .fill('Afrika geschafft. Jetzt die Flüsse in Europa üben.')
    await other.getByRole('button', { name: 'Änderung speichern', exact: true }).click()
    await expect(other.locator('[data-learning-note]')).toContainText('Afrika geschafft.')
    await page.getByRole('button', { name: 'Notizen aktualisieren', exact: true }).click()
    await expect(page.locator('[data-learning-note]')).toContainText('Afrika geschafft.')
    await other.reload()
    await expect(other.locator('[data-learning-note]')).toContainText('Afrika geschafft.')
    await other.getByRole('button', { name: 'Notiz löschen', exact: true }).click()
    await expect(other.locator('[data-learning-note]')).toHaveCount(0)
    await page.getByRole('button', { name: 'Notizen aktualisieren', exact: true }).click()
    await expect(page.locator('[data-learning-note]')).toHaveCount(0)
    await noOverflow(other)
    await page.getByRole('button', { name: 'Notizen schließen' }).click()
    await page.goto('play/capitals/round?quiz=name-capital&mode=input&scope=europe&len=10')
    await open(page)
    await page
      .getByLabel('Das möchte ich verbessern', { exact: true })
      .fill('Hauptstädte auf der Karte finden')
    await page.getByRole('button', { name: 'Notiz speichern', exact: true }).click()
    await expect(page.locator('[data-learning-note]')).toHaveCount(1)
    expect(server.books.size).toBe(1)
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).id, ACCESS_KEY)).toBe(
      [...server.books.keys()][0],
    )
  } finally {
    await otherContext.close()
  }
})

test('Netzfehler erhalten den Entwurf; ungültige Links geben keine fremden Notizen frei', async ({
  page,
  context,
}) => {
  const server = onlineServer()
  await server.attach(context)
  await page.goto(round)
  await open(page)
  await cloudReady(page)
  server.failSave()
  await page
    .getByLabel('Das möchte ich verbessern', { exact: true })
    .fill('Nicht verlieren: K2 liegt im Karakorum.')
  await page.getByRole('button', { name: 'Notiz speichern', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Dein Text bleibt stehen')
  await expect(page.getByLabel('Das möchte ich verbessern', { exact: true })).toHaveValue(
    'Nicht verlieren: K2 liegt im Karakorum.',
  )
  await page.getByRole('button', { name: 'Notiz speichern', exact: true }).click()
  await expect(page.locator('[data-learning-note]')).toHaveCount(1)
  await page.getByText('Vorhandenes Notizbuch öffnen', { exact: true }).click()
  await page
    .getByLabel('Persönlichen Notizlink oder Zugangscode einfügen', { exact: true })
    .fill(`11111111-1111-4111-8111-111111111111.${'b'.repeat(64)}`)
  await page.getByRole('button', { name: 'Notizbuch verbinden' }).click()
  await expect(page.getByRole('alert')).toContainText('nicht gefunden')
  await expect(page.locator('[data-learning-note]')).toHaveCount(1)
  await page.getByText('Auf einem anderen Gerät öffnen', { exact: true }).click()
  await page.getByRole('button', { name: 'Notizbuch löschen', exact: true }).click()
  await expect(
    page.getByText('Das ganze Notizbuch auf allen Geräten löschen?', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Ja, alles löschen', exact: true }).click()
  expect(server.books.size).toBe(0)
  await expect(page.locator('[data-learning-note]')).toHaveCount(0)
  expect(await page.evaluate((key) => localStorage.getItem(key), ACCESS_KEY)).toBeNull()
})

test('Ein gleichzeitiger Bearbeitungskonflikt überschreibt keine fremde Änderung', async ({
  page,
  context,
}) => {
  const server = onlineServer()
  await server.attach(context)
  await page.goto(round)
  await open(page)
  await cloudReady(page)
  await page.getByLabel('Das möchte ich verbessern', { exact: true }).fill('Originale Notiz')
  await page.getByRole('button', { name: 'Notiz speichern', exact: true }).click()
  await expect(page.locator('[data-learning-note]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Notiz bearbeiten', exact: true }).click()
  await page.getByRole('textbox', { name: 'Notiz bearbeiten', exact: true }).fill('Mein eigener Entwurf')
  const book = [...server.books.values()][0]
  book.notes[0].text = 'Änderung vom anderen Gerät'
  book.notes[0].version++
  await page.getByRole('button', { name: 'Änderung speichern', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('als neuer Entwurf')
  await expect(page.getByLabel('Das möchte ich verbessern', { exact: true })).toHaveValue(
    'Mein eigener Entwurf',
  )
  expect(book.notes[0].text).toBe('Änderung vom anderen Gerät')
})
