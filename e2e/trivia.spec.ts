import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const trivia = JSON.parse(readFileSync('public/data/entities/trivia.json', 'utf8')) as Array<{
  attributes: { continent?: string }
}>
const oceaniaCount = trivia.filter((card) => card.attributes.continent === 'oceania').length

test('Wissensfragen haben eine Übung und einen passenden Kontinentfilter', async ({ page }) => {
  await page.goto('play/trivia')
  await expect(page.getByRole('heading', { name: 'Geografie-Wissensfragen', exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Gebiet', exact: true }).selectOption('oceania')
  await expect(page.locator('.exercise-summary')).toContainText(`${oceaniaCount} Lernkarten`)
  await expect(page.getByRole('button', { name: 'Automatisch', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page.locator('[data-generator="geography_trivia"]')).toBeVisible()
  await expect(page.locator('[data-option-id]')).toHaveCount(4)
})

test('Trivia zeigt Erklärung und Quelle und setzt eine gespeicherte Alle-Runde fort', async ({ page }) => {
  await page.goto('play/trivia/round?mode=trivia_questions&scope=world&len=all&repeat=0')
  const question = page.locator('[data-generator="geography_trivia"]')
  await expect(question).toBeVisible()
  await expect(page.locator('.quiz-feedback')).toHaveCount(0)
  const prompt = await page.getByRole('heading', { level: 1 }).textContent()
  const answer = await question.getAttribute('data-answer')
  await page.locator(`[data-option-id="${answer}"]`).click()
  const feedback = page.locator('.quiz-feedback')
  await expect(feedback).toContainText('Richtig')
  await expect(feedback.getByRole('link')).toHaveAttribute('href', /^https:\/\//)
  await expect(feedback).toContainText('Quelle:')
  await page.getByRole('button', { name: 'Beenden' }).click()
  await page.getByRole('link', { name: /Weiterspielen/ }).click()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(prompt!)
  await expect(page.locator('.quiz-feedback')).toContainText('Richtig')
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(prompt!)
})

test('Eine falsche Trivia-Antwort lässt sich gezielt wiederholen', async ({ page }) => {
  await page.goto(
    'play/trivia/round?mode=trivia_questions&scope=world&len=1&repeat=0&only=trivia:south-africa-capitals',
  )
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Südafrika')
  await page.getByRole('button', { name: 'Eine', exact: true }).click()
  await expect(page.locator('.quiz-feedback')).toContainText('Drei')
  await expect(page.locator('.quiz-feedback')).toContainText('Bloemfontein')
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Runde beendet 🎉' })).toBeVisible()
  await page.getByRole('link', { name: /Fehler wiederholen/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Südafrika')
  await page.getByRole('button', { name: 'Drei', exact: true }).click()
  await expect(page.locator('.quiz-feedback')).toContainText('Richtig')
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await page.getByRole('link', { name: 'Noch einmal', exact: true }).click()
  await expect(page.locator('[data-generator="geography_trivia"]')).toBeVisible()
  await expect(page.locator('.quiz-feedback')).toHaveCount(0)
})

test('Alle Ozeanien-Fragen können ohne Wiederholung beendet werden', async ({ page }) => {
  await page.goto('play/trivia/round?mode=trivia_questions&scope=oceania&len=all&repeat=0')
  const prompts = new Set<string>()
  for (let index = 0; index < oceaniaCount; index++) {
    const question = page.locator('[data-generator="geography_trivia"]')
    await expect(question).toBeVisible()
    const prompt = (await page.getByRole('heading', { level: 1 }).textContent())!
    expect(prompts.has(prompt)).toBe(false)
    prompts.add(prompt)
    const answer = await question.getAttribute('data-answer')
    await page.locator(`[data-option-id="${answer}"]`).click()
    await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  }
  await expect(page.getByRole('heading', { name: 'Alles geschafft! 🏁' })).toBeVisible()
  await expect(page.getByText(`${oceaniaCount} / ${oceaniaCount} richtig`)).toBeVisible()
})

for (const [id, answer, explanation, host] of [
  ['brackish-water', 'Eine Mischung aus Süß- und Salzwasser', 'Flusswasser', 'oceanservice.noaa.gov'],
  ['danube-outlet', 'Schwarzes Meer', 'Delta', 'whc.unesco.org'],
  ['india-population-2026', 'Indien', '1,477 Milliarden', 'population.un.org'],
  ['okavango-dry-season', 'Während der Trockenzeit', 'Trockenzeit', 'whc.unesco.org'],
  ['fundy-tidal-range', 'Bay of Fundy', '16 Meter', 'parks.canada.ca'],
  ['titicaca-border', 'Peru und Bolivien', 'Altiplano', 'science.nasa.gov'],
  ['palau-rock-islands', 'Pilzförmige Kalksteininseln', 'pilzartige Formen', 'whc.unesco.org'],
]) {
  test(`Neue Frage ${id} ist gezielt spielbar und zeigt ihre Erklärung samt Quelle`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto(`play/trivia/round?mode=trivia_questions&scope=world&len=1&repeat=0&only=trivia:${id}`)
    await expect(page.locator('[data-generator="geography_trivia"]')).toBeVisible()
    await expect(page.locator('[data-option-id]')).toHaveCount(4)
    await page.getByRole('button', { name: answer, exact: true }).click()
    const feedback = page.locator('.quiz-feedback')
    await expect(feedback).toContainText('Richtig')
    await expect(feedback).toContainText(explanation)
    const url = await feedback.getByRole('link').getAttribute('href')
    expect(new URL(url!).hostname).toBe(host)
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}
