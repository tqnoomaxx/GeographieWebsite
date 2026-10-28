import { test, expect, type Page } from '@playwright/test'

const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const messages: string[] = []
  errors.set(page, messages)
  page.on('pageerror', (error) => messages.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') messages.push(message.text())
  })
})
test.afterEach(async ({ page }) => {
  await expect(page.locator('main').first()).toBeVisible()
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors.get(page)).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
const round = (exercise: string, mode: string, only: string) =>
  `play/languages/round?quiz=${exercise}&mode=${mode}&scope=world&len=all&repeat=0&only=${only}`
async function submit(page: Page, value: string) {
  await page.locator('.quiz-text-answer input').fill(value)
  await page.locator('.quiz-text-answer button[type="submit"]').click()
}

test('Sprachen und neue Schriftkurse sind über die Themenauswahl erreichbar', async ({ page }) => {
  await page.goto('play')
  await page.locator('[data-quiz-topic="languages"]').click()
  await expect(page).toHaveTitle(/Sprachen & Schriften/)
  for (const id of [
    'recognize-language',
    'identify-script',
    'read-georgian',
    'read-arabic',
    'read-devanagari',
    'read-bengali',
    'read-tamil',
  ])
    await expect(page.locator(`[data-exercise="${id}"]`)).toBeVisible()
  await page.locator('[data-exercise="recognize-language"]').click()
  await expect(page.getByRole('button', { name: 'Eintippen', exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Gebiet', exact: true })).toHaveCount(0)
})

test('Spracherkennung zeigt Originaltext, danach Übersetzung und Erklärung', async ({ page }) => {
  await page.goto(round('recognize-language', 'choice', 'language_sample:hi-3'))
  await expect(page.locator('[data-generator="language_identify"]')).toHaveAttribute(
    'data-answer',
    'language:hi',
  )
  await expect(page.locator('.script-study-meta')).toHaveText('Sprache gesucht')
  await expect(page.locator('.script-study-original')).toHaveAttribute('lang', 'hi')
  await expect(page.locator('.script-study-card')).not.toContainText('Hindi')
  await expect(page.getByRole('region', { name: 'Kurzfakten' })).toHaveCount(0)
  await page.locator('[data-option-id="language:hi"]').click()
  await expect(page.locator('.quiz-option.quiz-answer-correct')).toContainText('Hindi')
  await expect(page.getByRole('region', { name: 'Kurzfakten' })).toContainText('Übersetzung:')
  await expect(page.getByRole('region', { name: 'Kurzfakten' })).toContainText('Devanagari')
})

test('Arabische Textproben zeigen RTL und akzeptieren den arabischen Sprachnamen nach Neuladen', async ({
  page,
}) => {
  await page.goto(round('recognize-language', 'input', 'language_sample:ar-3'))
  await expect(page.locator('.script-study-original')).toHaveAttribute('dir', 'rtl')
  const text = await page.locator('.script-study-original').textContent()
  await page.reload()
  await expect(page.locator('.script-study-original')).toHaveText(text!)
  await submit(page, 'العربية')
  await expect(page.getByText('Die Textprobe ist auf Arabisch.', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Kurzfakten' })).toContainText('Übersetzung:')
})

for (const [exercise, id, language, direction, font] of [
  ['read-georgian', 'ka-tbilisi', 'ka', 'ltr', 'Georgian'],
  ['read-arabic', 'ar-bahr', 'ar', 'rtl', 'Arabic'],
  ['read-devanagari', 'hi-bharat', 'hi', 'ltr', 'Devanagari'],
  ['read-bengali', 'bn-bangla', 'bn', 'ltr', 'Bengali'],
  ['read-tamil', 'ta-vanakkam', 'ta', 'ltr', 'Tamil'],
]) {
  test(`${exercise}: Original, Auswahl und lokale Schriftdatei funktionieren`, async ({ page }) => {
    await page.goto(round(exercise, 'choice', `script_word:${id}`))
    await expect(page.locator('.script-study-original')).toHaveAttribute('lang', language)
    await expect(page.locator('.script-study-original')).toHaveAttribute('dir', direction)
    await expect(page.locator('.quiz-option')).toHaveCount(4)
    await page.locator(`[data-option-id="script-answer:script_word:${id}"]`).click()
    await expect(page.locator('.quiz-option.quiz-answer-correct')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Kurzfakten' })).toContainText('Bedeutung:')
    await page.evaluate(async () => {
      await document.fonts.ready
    })
    expect(
      await page.evaluate(
        (family) =>
          [...document.fonts].some((face) => face.family.includes(family) && face.status === 'loaded'),
        font,
      ),
    ).toBe(true)
  })
}

test('Devanagari-Eingabe bleibt Hindi und akzeptiert eine gebräuchliche Umschrift', async ({ page }) => {
  await page.goto('play/languages?quiz=read-devanagari')
  await page.getByRole('button', { name: 'Eintippen', exact: true }).click()
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page.locator('[data-generator="script_to_latin_input"]')).toBeVisible()
  await expect(page.locator('.script-study-original')).toHaveAttribute('lang', 'hi')
  await page.goto(round('read-devanagari', 'input', 'script_word:hi-paanii'))
  await submit(page, 'paani')
  await expect(page.getByRole('region', { name: 'Kurzfakten' })).toContainText('Bedeutung: Wasser')
})

test('Schrifterkennung fragt Devanagari ohne Sprachhinweise ab', async ({ page }) => {
  await page.goto(round('identify-script', 'choice', 'script_word:hi-bharat'))
  await expect(page.locator('.script-study-meta')).toHaveText('Schrift gesucht')
  await expect(page.locator('.script-study-card')).not.toContainText('Hindi')
  await page.locator('[data-option-id="script:devanagari"]').click()
  await expect(page.locator('.quiz-option.quiz-answer-correct')).toContainText('Devanagari')
})

test('Mchedruli wird als georgische Schrift akzeptiert', async ({ page }) => {
  await page.goto(round('identify-script', 'input', 'script_word:ka-tbilisi'))
  await submit(page, 'Mchedruli')
  await expect(page.getByText(/Das ist Georgisch\./)).toBeVisible()
})

test('Arabische Rückwärtsfragen setzen Sprache und Schreibrichtung an allen Optionen', async ({ page }) => {
  await page.goto(round('recognize-script', 'choice', 'script_word:ar-bahr'))
  await expect(page.locator('.quiz-option-label')).toHaveCount(4)
  for (const label of await page.locator('.quiz-option-label').all()) {
    await expect(label).toHaveAttribute('lang', 'ar')
    await expect(label).toHaveAttribute('dir', 'rtl')
  }
  await page.locator('[data-option-id="script-answer:script_word:ar-bahr"]').click()
  await expect(page.locator('.quiz-option.quiz-answer-correct')).toContainText('بَحْر')
})
