import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
const courses = JSON.parse(readFileSync('src/config/languageCourses.json', 'utf8')) as {
  code: string
  name: string
  alphabetTitle: string
  letters: number
  words: number
}[]
const cards = JSON.parse(readFileSync('public/data/entities/language-courses.json', 'utf8')) as {
  id: string
  attributes: {
    language: string
    kind: string
    original: string
    meaning?: string
    transliteration?: string
    topic: string
  }
}[]

const messages = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  messages.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
})
test.afterEach(async ({ page }) => {
  expect(messages.get(page)).toEqual([])
  await expect(page.locator('main').first()).toBeVisible()
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('alle 21 Sprachen bieten Schriftgrundlagen und Wortschatz', async ({ page }) => {
  await page.goto('play/languages')
  await expect(page).toHaveTitle(/Sprachen & Schriften/)
  await expect(page.locator('[data-exercise^="learn-"]')).toHaveCount(21)
  for (const course of courses) {
    await page.goto(`play/languages?quiz=learn-${course.code}`)
    await expect(page.getByRole('heading', { name: `${course.name} lernen`, exact: true })).toBeVisible()
    await expect(
      page.getByRole('button', { name: new RegExp(`${course.alphabetTitle}.*${course.letters} Zeichen`) }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.language-flashcard .script-study-original')).toHaveAttribute(
      'lang',
      course.code,
    )
    await page.getByRole('button', { name: /Wörter lernen.*205 Wörter/ }).click()
    await expect(page.locator('.exercise-summary')).toContainText('205 Lernkarten')
    await expect(
      page.getByRole('combobox', { name: 'Themenbereich', exact: true }).locator('option'),
    ).toHaveCount(6)
  }
})

test('Karten aufdecken, wechseln, filtern und mit der Auswahl üben', async ({ page }, testInfo) => {
  await page.goto('play/languages?quiz=learn-en&collection=words')
  const card = page.getByRole('region', { name: 'Lernkarte', exact: true })
  await expect(card).toContainText('dog')
  await expect(card.locator('.language-card-answer')).toHaveCount(0)
  await page.getByRole('button', { name: 'Bedeutung zeigen', exact: true }).click()
  await expect(card.locator('.language-card-answer')).toContainText('Hund')
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await expect(card).toContainText('cat')
  await expect(card.locator('.language-card-answer')).toHaveCount(0)
  await page.getByRole('button', { name: 'Zurück', exact: true }).click()
  await expect(card).toContainText('dog')
  const topic = page.getByRole('combobox', { name: 'Themenbereich', exact: true })
  await topic.selectOption('Essen & Trinken')
  await expect(card).toContainText('apple')
  const search = page.getByRole('searchbox', { name: 'Lernkarten suchen', exact: true })
  await search.fill('zzzzzz')
  await expect(page.getByText('Keine Lernkarten gefunden.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Übung starten', exact: true })).toBeDisabled()
  await search.fill('Apfel')
  await expect(card).toContainText('apple')
  await expect(page.locator('.exercise-summary')).toContainText('1 Lernkarte')
  await page.getByRole('button', { name: 'Bedeutung zeigen', exact: true }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `/tmp/language-course-words-${testInfo.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Übung starten', exact: true }).click()
  await expect(page).toHaveURL(/collection=words/)
  await expect(page.locator('[data-generator="language_course_choice"]')).toBeVisible()
  await expect(page.locator('.script-study-task')).toHaveText('Deutsche Bedeutung gesucht')
  const answer = cards.find((c) => c.attributes.language === 'en' && c.attributes.original === 'red apple')!
  await page.locator(`[data-option-id="${answer.id}"]`).click()
  await expect(page.locator('.quiz-option.quiz-answer-correct')).toContainText('Apfel')
})

for (const code of ['ar', 'ja', 'zh', 'ko'])
  test(`${code}: Schriftkarten, Schriftdarstellung und Eingabe`, async ({ page }, testInfo) => {
    await page.goto(`play/languages?quiz=learn-${code}`)
    await expect(page.locator('.language-flashcard .script-study-original')).toHaveAttribute(
      'dir',
      code === 'ar' ? 'rtl' : 'ltr',
    )
    await page.getByRole('button', { name: 'Lesehilfe zeigen', exact: true }).click()
    const first = cards.find((c) => c.attributes.language === code && c.attributes.kind === 'letter')!
    await expect(page.locator('.language-card-answer')).toContainText(first.attributes.transliteration!)
    await page.evaluate(() => document.fonts.ready)
    if (code !== 'ar')
      expect(
        await page.evaluate(
          (language) =>
            [...document.fonts].some(
              (font) =>
                font.family.includes({ ja: 'JP', zh: 'SC', ko: 'KR' }[language]!) &&
                font.family.includes('Course') &&
                font.status === 'loaded',
            ),
          code,
        ),
      ).toBe(true)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({
      path: `/tmp/language-course-${code}-${testInfo.project.name}.png`,
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Eintippen', exact: true }).click()
    await page
      .getByRole('searchbox', { name: 'Lernkarten suchen', exact: true })
      .fill(first.attributes.original)
    await page.getByRole('button', { name: 'Übung starten', exact: true }).click()
    await expect(page.locator('[data-generator="language_course_input"]')).toBeVisible()
    await page.locator('.quiz-text-answer input').fill(first.attributes.transliteration!)
    await page.locator('.quiz-text-answer button[type="submit"]').click()
    await expect(page.getByRole('region', { name: 'Kurzfakten' })).toContainText('Lernbereich:')
  })

test('Wortschatz-Eingabe und Fortsetzen behalten die Sprache und den Modus', async ({ page }) => {
  await page.goto('play/languages?quiz=learn-fr&collection=words&mode=input')
  await page.getByRole('searchbox', { name: 'Lernkarten suchen', exact: true }).fill('Apfel')
  await page.getByRole('button', { name: 'Übung starten', exact: true }).click()
  await expect(page.locator('.script-study-original')).toHaveText('pomme rouge')
  await page.reload()
  await expect(page.locator('.script-study-original')).toHaveText('pomme rouge')
  await expect(page).toHaveURL(/collection=words/)
  await page.locator('.quiz-text-answer input').fill('roter Apfel')
  await page.locator('.quiz-text-answer button[type="submit"]').click()
  await expect(page.getByRole('region', { name: 'Kurzfakten' })).toContainText('Bedeutung: roter Apfel')
})
