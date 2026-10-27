import { test, expect } from '@playwright/test'
import { PLAY_QUIZZES } from '../src/config/quizzes'

// Browser plugin not available. Validate the built app using the existing Playwright setup.
// Flow: start -> clear topic list -> continent and length -> quiz -> feedback.
test('Die einfache Auswahl führt ohne weitere Einstellungen ins Städtequiz', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Die Welt ist voller Fragen.')
  await expect(page.locator('canvas')).toHaveCount(0)
  await expect(page.locator('.topic-link')).toHaveCount(6)
  await expect(page.locator('.simple-hero-art')).toBeVisible()
  await page.getByRole('link', { name: 'Quiz auswählen', exact: true }).click()
  await expect(page).toHaveURL(/\/play$/)
  await expect(page.locator('.topic-link')).toHaveCount(PLAY_QUIZZES.length)
  await expect(page.locator('canvas')).toHaveCount(0)
  await page.locator('.topic-link[data-quiz-topic="cities"]').click()
  await expect(page.locator('.simple-advanced')).not.toHaveAttribute('open')
  await expect(page.getByRole('heading', { name: 'Städte', exact: true })).toBeVisible()
  await page.getByRole('radio', { name: 'Europa', exact: true }).click()
  await page.getByRole('radio', { name: '20', exact: true }).click()
  await expect(page.locator('.simple-round-summary')).toHaveText('20 Fragen · Europa')
  await page.screenshot({ path: `/tmp/atlas-simple-${info.project.name}-setup.png`, fullPage: true })
  await page.getByRole('button', { name: 'Quiz starten' }).click()
  await expect(page).toHaveURL(/mode=cities_over_300k&scope=europe&len=20/)
  const question = page.locator('[data-generator="large_city_to_country"]')
  await expect(question).toBeVisible()
  const answer = await question.getAttribute('data-answer')
  await page.locator(`[data-option-id="${answer}"]`).click()
  await expect(page.locator('.quiz-feedback')).toContainText('Richtig')
  await expect(page.locator('.quiz-feedback')).toContainText('Einwohner')
  await page.screenshot({ path: `/tmp/atlas-simple-${info.project.name}-answer.png`, fullPage: true })
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await expect(page.getByText('2 / 20', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('Weitere Einstellungen bieten Länder, Fragetyp und Hinweise weiterhin an', async ({ page }) => {
  await page.goto('play/flags')
  await expect(page.locator('.simple-advanced')).not.toHaveAttribute('open')
  await page.getByRole('radio', { name: 'Europa', exact: true }).click()
  await page.locator('.simple-advanced summary').click()
  await page.getByRole('radio', { name: 'Deutschland', exact: true }).click()
  await page.getByRole('radio', { name: 'Eintippen', exact: true }).click()
  await page.getByRole('radio', { name: '10', exact: true }).click()
  await page.getByRole('button', { name: 'Quiz starten' }).click()
  await expect(page).toHaveURL(/mode=flag_input&scope=country%3ADE&len=10/)
  await expect(page.locator('[data-generator="region_flag_input"]')).toBeVisible()
})

test('Jedes Thema lässt sich mit der einfachen Standardauswahl starten', async ({ page }) => {
  for (const quiz of PLAY_QUIZZES) {
    await page.goto(`play/${quiz.id}`)
    await page.getByRole('button', { name: 'Quiz starten' }).click()
    await expect(page.locator('[data-question-type]')).toBeVisible()
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  }
})

test('Ländersuche öffnet passende Kontinente und ein echtes Länderprofil', async ({ page }) => {
  await page.goto('explore')
  await expect(page.getByRole('link', { name: 'Deutschland', exact: true })).not.toBeVisible()
  await page.getByRole('textbox', { name: 'Land suchen' }).fill('deutsch')
  await page.getByRole('link', { name: 'Deutschland', exact: true }).click()
  await expect(page).toHaveURL(/\/country\/DE$/)
  await expect(page.getByRole('heading', { name: 'Deutschland', exact: true })).toBeVisible()
})

test('Alle Hauptseiten bleiben auf kleinen Bildschirmen ohne seitliches Scrollen lesbar', async ({
  page,
}, info) => {
  for (const route of ['', 'play', 'play/cities', 'learn', 'explore', 'progress', 'daily', 'settings']) {
    await page.goto(route)
    await expect(page.locator('main h1').first()).toBeVisible()
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true)
  }
  if (info.project.name === 'mobile') {
    await page
      .getByRole('navigation', { name: 'Hauptnavigation' })
      .getByRole('link', { name: 'Quiz', exact: true })
      .click()
    await expect(page).toHaveURL(/\/play$/)
  }
})
