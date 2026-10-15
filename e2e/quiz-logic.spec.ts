import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Browser plugin not available. Test the real app with the repository's Playwright setup.
// Flow: quiz/daily route -> answer and advance -> correct feedback, score and saved state.
const plates = JSON.parse(readFileSync('public/data/entities/license-plates/DE.json', 'utf8'))

async function savedSessions(page: Page) {
  return page.evaluate(
    () =>
      new Promise<any[]>((resolve, reject) => {
        const request = indexedDB.open('geokompass')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const all = db.transaction('sessions').objectStore('sessions').getAll()
          all.onsuccess = () => {
            db.close()
            resolve(all.result)
          }
          all.onerror = () => reject(all.error)
        }
      }),
  )
}

test('Ein anderer echter Ländername ist falsch; ein Tippfehler bleibt erlaubt', async ({ page }) => {
  const path = 'play/flags/round?mode=flag_input&scope=world&len=1&content=country&repeat=0&only=country:AU'
  await page.goto(path)
  await expect(page).toHaveTitle(/Flaggen/)
  await page.getByRole('textbox', { name: 'Antwort eingeben …' }).fill('Austria')
  await page.getByRole('button', { name: 'Prüfen' }).click()
  await expect(page.locator('.quiz-feedback-wrong')).toContainText('Nicht ganz')
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await expect(page.getByText('0 / 1 richtig')).toBeVisible()
  await page.goto(path)
  await page.getByRole('textbox', { name: 'Antwort eingeben …' }).fill('Austrlia')
  await page.getByRole('button', { name: 'Prüfen' }).click()
  await expect(page.locator('.quiz-feedback')).toContainText('Richtig')
})

test('Tagesrätsel übernehmen den exakten Ländernamen ohne Verwechslung', async ({ page }) => {
  await page.goto('daily/flagle?practice=exact-country')
  await page.getByRole('textbox', { name: 'Raten' }).fill('Island')
  await page.getByRole('button', { name: 'Raten', exact: true }).click()
  await expect(page.locator('.daily-guess-history li')).toHaveCount(1)
  await expect(page.locator('.daily-guess-history li')).toContainText('Island')
  await expect(page.locator('.daily-guess-history li')).not.toContainText('Irland')
})

test('Tagesrätsel ersetzen unvollständige Eingaben nicht durch den ersten Vorschlag', async ({ page }) => {
  await page.goto('daily/flagle?practice=no-implicit-suggestion')
  await page.getByRole('textbox', { name: 'Raten' }).fill('Kan')
  await expect(page.locator('.daily-suggestions')).toBeVisible()
  await page.getByRole('button', { name: 'Raten', exact: true }).click()
  await expect(page.locator('.daily-guess-history li')).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Raten' })).toHaveValue('Kan')
  await page.locator('.daily-suggestions button').first().click()
  await expect(page.locator('.daily-guess-history li')).toHaveCount(1)
})

for (const [codes, answer] of [
  [['AA', 'GD'], 'Ostalbkreis'],
  [['TS', 'LF'], 'Traunstein'],
] as const) {
  test(`Kennzeichle akzeptiert den gültigen Ort für ${codes[1]}`, async ({ page }) => {
    const fixture = codes.map((code) => plates.find((plate: any) => plate.attributes.code === code))
    await page.route('**/data/entities/license-plates/DE.json', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }),
    )
    await page.goto('daily/kennzeichle?practice=duplicates')
    await page.getByRole('textbox', { name: 'Raten' }).fill(answer)
    await page.getByRole('button', { name: 'Raten', exact: true }).click()
    await expect(page.locator('.daily-result.is-solved')).toBeVisible()
    await expect(page.locator('.daily-guess-history .is-correct')).toContainText(answer)
    await expect(page.locator('.daily-game-board')).toContainText(codes[1])
  })
}

test('Kennzeichle leitet keine Einwohnerklasse aus der Kennzeichenlänge ab', async ({ page }) => {
  const fixture = ['B', 'M', 'WOB', 'K'].map((code) =>
    plates.find((plate: any) => plate.attributes.code === code),
  )
  await page.route('**/data/entities/license-plates/DE.json', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }),
  )
  await page.goto('daily/kennzeichle?practice=duplicates')
  for (const answer of ['Berlin', 'München', 'Köln']) {
    await page.getByRole('textbox', { name: 'Raten' }).fill(answer)
    await page.getByRole('button', { name: 'Raten', exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'Raten' })).toHaveValue('')
  }
  await expect(page.locator('.daily-game-board')).toContainText('Zulassungsbezirke: 1')
  await expect(page.locator('.daily-game-board')).toContainText('Niedersachsen')
  await expect(page.locator('.daily-game-board')).not.toContainText('Landkreis')
})

test('Enter schaltet genau eine Frage weiter und zählt drei beantwortete Fragen', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    // Playwright meldet die für Netzwerkmocks bewusst blockierte Registrierung.
    if (message.text() === 'Service Worker registration blocked by Playwright') return
    if (['error', 'warning'].includes(message.type())) errors.push(message.text())
  })
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 740 })
  await page.goto(
    'play/trivia/round?mode=trivia_questions&scope=world&len=3&repeat=0&only=trivia:equator-latitude,trivia:highest-mountain,trivia:south-africa-capitals',
  )
  for (let index = 0; index < 3; index++) {
    const question = page.locator('[data-generator="geography_trivia"]')
    await expect(question).toBeVisible()
    await expect(page.locator('.quiz-topbar-progress')).toContainText(`${index + 1} / 3`)
    await expect(page.locator('.quiz-feedback')).toHaveCount(0)
    const answer = await question.getAttribute('data-answer')
    await page.locator(`[data-option-id="${answer}"]`).click()
    await expect(page.locator('.quiz-feedback')).toContainText('Richtig')
    const next = page.getByRole('button', { name: 'Weiter', exact: true })
    await next.focus()
    await page.keyboard.press('Enter')
  }
  await expect(page.getByRole('heading', { name: 'Runde beendet 🎉' })).toBeVisible()
  await expect(page.getByText('3 / 3 richtig')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(await page.locator('vite-error-overlay').count()).toBe(0)
  expect(errors).toEqual([])
  await page.screenshot({ path: `/tmp/atlas-quiz-result-${testInfo.project.name}.png`, fullPage: true })
})

test('Gespeicherte Alle-Runden überspringen entfernte Karten und spielen weiter', async ({ page }) => {
  await page.goto('play/flags/round?mode=flag_to_name&scope=world&len=all&content=country&repeat=0')
  await expect(page.locator('[data-generator="flag_to_country"]')).toBeVisible()
  await expect.poll(async () => (await savedSessions(page)).length).toBe(1)
  const session = (await savedSessions(page))[0]
  const first = session.questions.find((item: any) => item.question.answer !== 'country:DE')
  session.questions = [{ ...first, given: first.question.answer, correct: true }]
  session.position = 0
  session.remaining = [...Array.from({ length: 26 }, (_, index) => `country:removed-${index}`), 'country:DE']
  await page.evaluate(
    (saved) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('geokompass')
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('sessions', 'readwrite')
          tx.objectStore('sessions').put(saved)
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
    session,
  )
  await page.goto(`play/session/${encodeURIComponent(session.id)}`)
  await expect(page.locator('.quiz-feedback')).toContainText('Richtig')
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await expect(page.locator('[data-answer]')).toHaveAttribute('data-answer', 'country:DE')
  await expect(page.locator('.quiz-feedback')).toHaveCount(0)
  await page.locator('[data-option-id="country:DE"]').click()
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Alles geschafft! 🏁' })).toBeVisible()
  await expect(page.getByText('2 / 2 richtig')).toBeVisible()
  const xp = (await savedSessions(page))[0].xpEarned
  expect(xp).toBeGreaterThan(0)
  await page.reload()
  await expect(page.getByText(`+${xp} XP`, { exact: true })).toBeVisible()
  expect((await savedSessions(page))[0].xpEarned).toBe(xp)
})

test('Vorzeitiges Beenden zeigt den tatsächlichen Bearbeitungsstand', async ({ page }) => {
  await page.goto(
    'play/trivia/round?mode=trivia_questions&scope=world&len=3&repeat=0&only=trivia:equator-latitude,trivia:highest-mountain,trivia:south-africa-capitals',
  )
  const question = page.locator('[data-answer]')
  await expect(question).toBeVisible()
  const answer = await question.getAttribute('data-answer')
  await page.locator(`[data-option-id="${answer}"]`).click()
  await page.getByRole('button', { name: 'Beenden' }).click()
  await expect(page.getByRole('heading', { name: 'Runde vorzeitig beendet' })).toBeVisible()
  await expect(page.getByText('1 von 3 Fragen bearbeitet')).toBeVisible()
})

test('Belgische Provinzen sind auf der richtigen Karte mit der Tastatur lösbar', async ({ page }) => {
  await page.goto(
    'play/countries/round?mode=regions_on_map&scope=country:BE&len=1&repeat=0&only=region:BE-WBR',
  )
  const province = page.locator('[data-id="region:BE-WBR"]')
  await expect(province).toBeVisible()
  await province.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.quiz-feedback')).toContainText('Richtig')
})
