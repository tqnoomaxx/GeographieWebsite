import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const countries = JSON.parse(readFileSync('public/data/entities/countries.json', 'utf8'))
const cities = JSON.parse(readFileSync('public/data/entities/cities.json', 'utf8'))

async function countryFixture(page: Page, codes: string[]) {
  await page.route('**/data/entities/countries.json', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        countries.filter((country: { attributes: { iso2: string } }) =>
          codes.includes(country.attributes.iso2),
        ),
      ),
    }),
  )
}

test('Länderprofile unterscheiden aktuelle Hauptstädte und andere Regierungssitze', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('country/ZA')
  await expect(page.getByRole('heading', { name: 'Südafrika', exact: true })).toBeVisible()
  await expect(page.locator('main')).toContainText('Pretoria')
  await expect(page.locator('main')).toContainText('Kapstadt')
  await expect(page.locator('main')).toContainText('Bloemfontein')
  await expect(page.locator('main')).toContainText('Parlamentshauptstadt')
  await expect(page.locator('main')).toContainText('Justizhauptstadt')
  await expect(page.locator('main')).toContainText('Südafrikanische Gebärdensprache')

  await page.goto('country/LK')
  await expect(page.locator('main')).toContainText('Sri Jayewardenepura Kotte')
  await expect(page.locator('main')).toContainText('Handelsmetropole')
  await page.goto('country/GQ')
  await expect(page.locator('main')).toContainText('Ciudad de la Paz')
  await expect(page.locator('main')).toContainText('Frühere Hauptstadt')
  await page.goto('country/NR')
  await expect(page.locator('main')).toContainText('Keine offiziell bestimmte Hauptstadt')
  await expect(page.locator('main')).toContainText('Regierungssitz')
  expect(errors).toEqual([])
})

test('Ein englischer Name einer zweiten südafrikanischen Hauptstadt wird im Quiz angenommen', async ({
  page,
}) => {
  await countryFixture(page, ['ZA', 'DE', 'FR', 'GB'])
  await page.goto('play/capitals/round?mode=capital_input&scope=world&len=all')
  let found = false
  for (let index = 0; index < 4; index++) {
    const question = page.locator('[data-generator="capital_input"]')
    await expect(question).toBeVisible()
    const answer = (await question.getAttribute('data-answer'))!
    const name = answer.startsWith('city:ZA-')
      ? 'Cape Town'
      : cities.find((city: { id: string }) => city.id === answer).names.de
    await page.getByRole('textbox', { name: 'Antwort eingeben …' }).fill(name)
    await page.getByRole('button', { name: 'Prüfen' }).click()
    await expect(page.locator('.quiz-feedback')).toContainText('Richtig')
    if (name === 'Cape Town') {
      found = true
      await expect(page.locator('.quiz-feedback')).toContainText('Kapstadt')
      await expect(page.locator('.quiz-feedback')).toContainText('Bloemfontein')
      break
    }
    await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  }
  expect(found).toBe(true)
})

test('Capitale akzeptiert Kapstadt und markiert die alternative Hauptstadt grün', async ({ page }) => {
  await countryFixture(page, ['ZA'])
  await page.goto('daily/capitale?practice=multi-capital')
  await expect(page.getByRole('heading', { name: 'Capitale' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Raten' }).fill('Cape Town')
  await page.getByRole('button', { name: 'Raten', exact: true }).click()
  await expect(page.locator('.daily-result.is-solved')).toBeVisible()
  await expect(page.locator('.daily-guess-history .is-correct')).toContainText('Kapstadt')
})

test('Nationalsymbole zeigen Quellen und unterscheiden amtliche und kulturelle Symbole', async ({ page }) => {
  await page.goto('country/PH')
  await expect(page.locator('main')).toContainText('Carabao')
  await expect(page.locator('main')).toContainText('kein gesetzlich festgelegtes Nationaltier')
  await expect(page.locator('main')).toContainText('Philippinenadler')
  await expect(page.locator('main')).toContainText('Amtlich bestimmt')
  await page.goto('country/DE')
  await expect(page.locator('main')).toContainText('Keine gesicherte Angabe')
  await expect(page.locator('main')).toContainText('Deutschlandlied')
  await page.goto('play/countries/round?mode=national_symbols&scope=world&len=10')
  await expect(page.locator('[data-generator]')).toHaveAttribute(
    'data-generator',
    /national_(animal|bird|flower|tree)/,
  )
  const answer = (await page.locator('[data-answer]').getAttribute('data-answer'))!
  await page.getByRole('button', { name: answer, exact: true }).click()
  await expect(page.locator('.quiz-feedback')).toContainText('Richtig')
})
