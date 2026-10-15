import { test, expect, type Page } from '@playwright/test'

async function seed(page: Page, store: string, values: unknown[]) {
  await page.evaluate(
    ({ store, values }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('geokompass')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction(store, 'readwrite')
          for (const value of values) tx.objectStore(store).put(value)
          tx.onerror = () => reject(tx.error)
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
        }
      }),
    { store, values },
  )
}

test('Schnellstart lädt nur benötigte Pakete und spielt zehn Länderflaggen', async ({ page }) => {
  const packets: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/data/entities/')) packets.push(request.url())
  })
  await page.goto('')
  const quick = page.getByRole('navigation', { name: 'Direkt spielen' })
  await expect(quick).toBeVisible()
  await expect(page.getByRole('application', { name: /Interaktive Weltkugel/ })).toBeVisible()
  expect(packets.every((url) => url.endsWith('/countries.json'))).toBe(true)
  await quick.getByRole('link', { name: /10 Flaggen/ }).click()
  await expect(page).toHaveURL(/\/play\/flags\/round\?.*scope=world.*len=10.*content=country/)
  for (let index = 0; index < 10; index++) {
    const question = page.locator('[data-generator="flag_to_country"]')
    await expect(question).toBeVisible()
    await expect(page.locator('[data-option-id]')).toHaveCount(4)
    const answer = await question.getAttribute('data-answer')
    expect(answer).toMatch(/^country:/)
    await page.locator(`[data-option-id="${answer}"]`).click()
    await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  }
  await expect(page.getByRole('heading', { name: 'Runde beendet 🎉' })).toBeVisible()
  expect(packets.every((url) => url.endsWith('/countries.json'))).toBe(true)
})

test('Trivia-Schnellstart umgeht die Konfiguration', async ({ page }) => {
  await page.goto('')
  await page
    .getByRole('navigation', { name: 'Direkt spielen' })
    .getByRole('link', { name: /10 Trivia-Fragen/ })
    .click()
  await expect(page).toHaveURL(/\/play\/trivia\/round\?.*scope=world.*len=10/)
  await expect(page.locator('[data-generator="geography_trivia"]')).toBeVisible()
  await expect(page.locator('[data-option-id]')).toHaveCount(4)
})

test('Lernen zeigt während eines langsamen Abrufs keinen Abschluss', async ({ page }) => {
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/data/entities/countries.json', async (route) => {
    await pending
    await route.continue()
  })
  await page.goto('learn')
  await expect(page.getByRole('status')).toContainText('Inhalte werden geladen')
  await expect(page.getByText(/Alles.*gelernt/)).toHaveCount(0)
  release()
  await expect(page.locator('.learn-country-identity h2')).toBeVisible()
})

test('Ein fehlgeschlagenes Quizpaket lässt sich erneut laden und blockiert die Startseite nicht', async ({
  page,
}) => {
  let failures = 1
  await page.route('**/data/entities/trivia.json', (route) =>
    failures-- > 0 ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue(),
  )
  await page.goto('')
  await page.getByRole('link', { name: /10 Trivia-Fragen/ }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Erneut versuchen' }).click()
  await expect(page.locator('[data-generator="geography_trivia"]')).toBeVisible()
})

test('Ein fehlgeschlagenes Basispaket kann ohne Neuladen erneut abgerufen werden', async ({ page }) => {
  let failures = 1
  await page.route('**/data/entities/countries.json', (route) =>
    failures-- > 0 ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue(),
  )
  await page.goto('learn')
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Erneut versuchen' }).click()
  await expect(page.locator('.learn-country-identity h2')).toBeVisible()
})

for (const count of [1, 2, 3])
  test(`${count} fällige Karten werden vollständig als kurze Wiederholung gespielt`, async ({ page }) => {
    await page.goto('settings')
    await expect(page.getByRole('heading', { name: 'Einstellungen' })).toBeVisible()
    await seed(
      page,
      'entities',
      ['DE', 'FR', 'IT'].slice(0, count).map((iso) => ({
        entityId: `country:${iso}`,
        state: 'learning',
        correct: 1,
        wrong: 1,
        streak: 0,
        ease: 2.5,
        intervalDays: 0,
        dueAt: '2020-01-01T00:00:00Z',
        lastSeenAt: '2020-01-01T00:00:00Z',
      })),
    )
    await page.goto('learn')
    const panel = page.getByRole('region', { name: 'Fällige Inhalte wiederholen' })
    await expect(panel.getByLabel(`${count} fällige Inhalte`)).toHaveText(String(count))
    await panel.getByRole('link', { name: /Lernkarte.*wiederholen/ }).click()
    await expect(page).toHaveURL(new RegExp(`len=${count}.*only=`))
    for (let index = 0; index < count; index++) {
      const question = page.locator('[data-question-type]')
      await expect(question).toBeVisible()
      const answer = await question.getAttribute('data-answer')
      await page.locator(`[data-option-id="${answer}"]`).click()
      await page.getByRole('button', { name: 'Weiter', exact: true }).click()
    }
    await expect(page.getByRole('heading', { name: 'Runde beendet 🎉' })).toBeVisible()
    await page.goto('learn')
    await expect(page.getByText('Hier ist gerade nichts fällig.', { exact: false })).toBeVisible()
  })

test('Suchfilter, Trefferzahl und Suchzustand bleiben beim Zurücknavigieren erhalten', async ({ page }) => {
  await page.goto('search')
  await page.getByRole('textbox', { name: 'Suche' }).fill('Berlin')
  await page.getByRole('combobox', { name: 'Typ', exact: true }).selectOption('city')
  await expect(page.getByRole('status')).toContainText(/\d+ Treffer/)
  await page.getByRole('link', { name: /^Berlin Stadt/ }).click()
  await expect(page.getByRole('heading', { name: /Berlin$/, level: 1 })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('textbox', { name: 'Suche' })).toHaveValue('Berlin')
  await expect(page.getByRole('combobox', { name: 'Typ', exact: true })).toHaveValue('city')
  await expect(page).toHaveURL(/q=Berlin.*type=city/)
  await page.getByRole('textbox', { name: 'Suche' }).fill('all')
  await expect(page.getByRole('textbox', { name: 'Suche' })).toHaveValue('all')
  await expect(page).toHaveURL(/q=all.*type=city/)
})

test('Ruhig bleibt gespeichert, berücksichtigt System und lässt manuelle Steuerung zu', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('settings')
  await page.getByRole('radio', { name: 'Ruhig', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Ruhig', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.goto('')
  const globe = page.locator('.interactive-globe')
  await expect(globe).toHaveAttribute('data-motion', 'paused')
  const svg = page.locator('.globe-svg')
  await svg.focus()
  const before = await page.locator('.globe-country[data-country-id="country:DE"]').getAttribute('d')
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(() => page.locator('.globe-country[data-country-id="country:DE"]').getAttribute('d'))
    .not.toBe(before)
  await page.goto('play')
  await expect(page.locator('.quiz-diorama-3d')).toHaveAttribute('data-motion', 'paused')
  await page.locator('[data-quiz-station="trivia"]').focus()
  await expect(page.locator('.quiz-diorama-3d')).toHaveAttribute('data-active-station', 'trivia')
  await page.goto('settings')
  await page
    .getByRole('radiogroup', { name: 'Bewegung', exact: true })
    .getByRole('radio', { name: 'System' })
    .click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'system')
})

for (const width of [320, 390])
  test(`Lernaktionen bleiben bei ${width} Pixeln erreichbar`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 })
    await page.goto('learn')
    const actions = page.locator('.learn-primary-actions')
    await expect(actions).toBeVisible()
    const initialBox = (await actions.boundingBox())!
    expect(initialBox.x).toBe(0)
    const navBox = (await page.getByRole('navigation', { name: 'Hauptnavigation' }).boundingBox())!
    expect(navBox.y + navBox.height).toBe(740)
    expect(initialBox.y + initialBox.height).toBeLessThanOrEqual(740 - 64)
    await page.evaluate(() => window.scrollTo(0, 400))
    const scrolledBox = (await actions.boundingBox())!
    expect(scrolledBox.y).toBe(initialBox.y)
    const before = await page.locator('.learn-country-identity h2').textContent()
    const next = actions.getByRole('button', { name: 'Weiter', exact: false })
    await next.click()
    await expect(page.locator('.learn-country-identity h2')).not.toHaveText(before!)
    for (const button of await actions.getByRole('button').all()) {
      const box = (await button.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
      expect(box.y + box.height).toBeLessThan(740 - 64)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  })

test('Tagesrätsel setzt beim nächsten offenen Rätsel fort und zeigt danach die Auswertung', async ({
  page,
}) => {
  await page.goto('daily')
  const today = new Date().toISOString().slice(0, 10)
  const puzzles = ['flagle', 'countryle', 'outline', 'capitale', 'bildle', 'kennzeichle']
  const result = (puzzle: string) => ({
    key: `${puzzle}:${today}`,
    puzzle,
    date: today,
    guesses: [],
    solved: false,
    finishedAt: new Date().toISOString(),
  })
  await seed(page, 'puzzles', [result(puzzles[0])])
  await page.reload()
  await expect(page.getByRole('link', { name: 'Nächstes offenes Rätsel' })).toHaveAttribute(
    'href',
    /\/daily\/countryle$/,
  )
  await seed(page, 'puzzles', puzzles.map(result))
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Deine Tagesauswertung' })).toBeVisible()
  await expect(page.getByText('6 von 6 Rätseln abgeschlossen · 0 gelöst · 6 ungelöst.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Nächstes offenes Rätsel' })).toHaveCount(0)
})

test('Meine Welt enthält Trivia und unterscheidet Vertraut und Gemeistert', async ({ page }) => {
  await page.goto('progress')
  await expect(page.getByText('Geographie-Trivia', { exact: true })).toBeVisible()
  await expect(page.getByText('👍 Vertraut', { exact: true })).toBeVisible()
  await expect(page.getByText('⭐ Gemeistert', { exact: true })).toBeVisible()
})

test('Wiederholungen beachten Kategorie und Gebiet', async ({ page }) => {
  await page.goto('settings')
  await expect(page.getByRole('heading', { name: 'Einstellungen' })).toBeVisible()
  await seed(
    page,
    'entities',
    ['country:DE', 'country:BR', 'trivia:south-africa-capitals'].map((entityId) => ({
      entityId,
      state: 'learning',
      correct: 1,
      wrong: 1,
      streak: 0,
      ease: 2.5,
      intervalDays: 0,
      dueAt: '2020-01-01T00:00:00Z',
      lastSeenAt: '2020-01-01T00:00:00Z',
    })),
  )
  await page.goto('learn')
  const panel = page.getByRole('region', { name: 'Fällige Inhalte wiederholen' })
  await expect(panel.getByRole('link', { name: /2 Lernkarten wiederholen/ })).toBeVisible()
  await panel.getByRole('combobox', { name: 'Gebiet', exact: true }).selectOption('europe')
  await expect(panel.getByRole('link', { name: /1 Lernkarte wiederholen/ })).toBeVisible()
  await panel.getByRole('combobox', { name: 'Gebiet', exact: true }).selectOption('africa')
  await expect(panel.getByText('Hier ist gerade nichts fällig.', { exact: false })).toBeVisible()
  await panel.getByRole('combobox', { name: 'Kategorie', exact: true }).selectOption('trivia')
  await expect(panel.getByRole('link', { name: /1 Lernkarte wiederholen/ })).toHaveAttribute(
    'href',
    /only=trivia%3Asouth-africa-capitals/,
  )
})

test('Quellen unterscheiden fachliche Prüfung, Import und fehlende gesicherte Angaben', async ({ page }) => {
  await page.goto('country/ZA')
  const symbol = page
    .locator('li')
    .filter({ hasText: /^Springbock/ })
    .last()
  await symbol.getByRole('button', { name: /Quelle/ }).click()
  await expect(symbol).toContainText('Geprüft: 2026-10-13')
  await expect(symbol.getByRole('link')).toHaveAttribute('href', /^https:\/\/www.gov.za\//)
  await page.getByText('Quellen & Prüfstand', { exact: true }).click()
  await expect(
    page.getByText('Ein Importdatum ist kein fachliches Prüfdatum.', { exact: false }),
  ).toBeVisible()
  await page.goto('country/AD')
  await expect(page.getByText('Keine gesicherte Angabe', { exact: true }).first()).toBeVisible()
})
