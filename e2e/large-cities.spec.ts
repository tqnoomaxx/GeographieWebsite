import { test, expect } from '@playwright/test'

// Browser plugin not available. Use the repository's Playwright setup.
// Flow: Städte -> Kontinent -> Großstädte über 300.000 -> Alle -> answer -> resume.
test('Großstädte lassen sich nach Kontinent üben und als Alle-Runde fortsetzen', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('play/cities')
  await expect(page).toHaveTitle(/Städte/)
  await expect(page.getByRole('heading', { name: 'Städte', exact: true })).toBeVisible()
  await expect(page.locator('.simple-current-mode')).toContainText('Großstädte über 300.000')
  for (const continent of ['Europa', 'Asien', 'Afrika', 'Nordamerika', 'Südamerika', 'Ozeanien']) {
    const choice = page.getByRole('radio', { name: continent, exact: true })
    await choice.click()
    await expect(choice).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('.simple-current-mode')).toContainText('Großstädte über 300.000')
  }
  await page.getByRole('radio', { name: /^Alle$/ }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `/tmp/large-cities-${testInfo.project.name}-setup.png`, fullPage: true })
  await page.getByRole('button', { name: 'Quiz starten' }).click()
  await expect(page).toHaveURL(/mode=cities_over_300k&scope=oceania&len=all/)
  const question = page.locator('[data-generator="large_city_to_country"]')
  await expect(question).toBeVisible()
  await expect(page.locator('[data-option-id]')).toHaveCount(4)
  const prompt = await page.getByRole('heading', { level: 1 }).textContent()
  const answer = await question.getAttribute('data-answer')
  await page.locator(`[data-option-id="${answer}"]`).click()
  await expect(page.locator('.quiz-feedback')).toContainText('Richtig')
  await expect(page.locator('.quiz-feedback')).toContainText('Einwohner')
  await expect(page.locator('.quiz-feedback').getByRole('link', { name: 'GeoNames' })).toBeVisible()
  await page.screenshot({ path: `/tmp/large-cities-${testInfo.project.name}-answer.png`, fullPage: true })
  await page.getByRole('button', { name: 'Beenden' }).click()
  await page.getByRole('link', { name: /Weiterspielen/ }).click()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(prompt!)
  await expect(page.locator('.quiz-feedback')).toContainText('Richtig')
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(prompt!)
  expect(errors).toEqual([])
})

test('Kontinent und Modus lassen sich direkt verlinken und bleiben nach Neuladen erhalten', async ({
  page,
}) => {
  await page.goto('play/cities?scope=europe&mode=cities_over_300k')
  await expect(page.getByRole('radio', { name: 'Europa', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.getByRole('button', { name: 'Quiz starten' }).click()
  await expect(page.locator('[data-generator="large_city_to_country"]')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-generator="large_city_to_country"]')).toBeVisible()
})
