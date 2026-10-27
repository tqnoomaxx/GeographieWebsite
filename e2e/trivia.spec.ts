import { openQuizSettings } from './controls'
import { test, expect } from '@playwright/test'

test('Trivia ist über die Themenauswahl erreichbar und bietet Welt und Kontinente an', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('play')
  const station = page.locator('[data-quiz-topic="trivia"]')
  await expect(station).toBeVisible()
  await station.click()
  await expect(page).toHaveURL(/\/play\/trivia$/)
  await expect(page.getByRole('heading', { name: 'Geographie-Trivia' })).toBeVisible()
  await openQuizSettings(page)
  await expect(page.getByRole('radio', { name: 'Wissensfragen', exact: true })).toBeVisible()
  for (const continent of ['Europa', 'Asien', 'Afrika', 'Nordamerika', 'Südamerika', 'Ozeanien']) {
    await openQuizSettings(page)
    await expect(page.getByRole('radio', { name: continent, exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Quiz starten' }).click()
  await expect(page.locator('[data-generator="geography_trivia"]')).toBeVisible()
  await expect(page.locator('[data-option-id]')).toHaveCount(4)
  expect(errors).toEqual([])
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

test('Alle acht Ozeanien-Fragen können ohne Wiederholung beendet werden', async ({ page }) => {
  await page.goto('play/trivia/round?mode=trivia_questions&scope=oceania&len=all&repeat=0')
  const prompts = new Set<string>()
  for (let index = 0; index < 8; index++) {
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
  await expect(page.getByText('8 / 8 richtig')).toBeVisible()
})
