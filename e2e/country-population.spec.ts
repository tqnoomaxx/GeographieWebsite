import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

test('Die Einwohner-Rangliste führt Indien vor China und nennt den UN-Datenstand', async ({ page }) => {
  await page.goto('explore/populous')
  const rows = page.locator('main ol > li')
  await expect(rows.first()).toContainText('Indien')
  await expect(rows.nth(1)).toContainText('China')
  await expect(rows.first()).toContainText('1,48 Mrd.')
  await expect(rows.nth(1)).toContainText('1,41 Mrd.')
  await expect(page.getByText('Mittlere UN-Projektion zum 01.07.2026.')).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'UN World Population Prospects 2024', exact: true }),
  ).toHaveAttribute('href', 'https://population.un.org/wpp/')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('Indiens Länderprofil zeigt die aktualisierte Bevölkerung und verlinkt die richtige Quelle', async ({
  page,
}) => {
  await page.goto('country/IN')
  await expect(page.getByText('Einwohner (UN-Projektion 2026)', { exact: true })).toBeVisible()
  await expect(page.locator('dd').filter({ hasText: '1,48 Mrd.' })).toBeVisible()
  await page.getByRole('button', { name: 'Quelle: Einwohner', exact: true }).click()
  await expect(
    page.getByRole('link', { name: 'UN World Population Prospects 2024', exact: true }),
  ).toHaveAttribute('href', 'https://population.un.org/wpp/')
  await expect(page.getByText('Bezugsdatum: 2026-07-01', { exact: false })).toBeVisible()
})

test('Im direkten Einwohnervergleich ist Indien richtig und die Antwort nennt die UN-Projektion', async ({
  page,
}) => {
  const countries = JSON.parse(readFileSync('public/data/entities/countries.json', 'utf8')).filter(
    (country: { id: string }) => ['country:IN', 'country:CN'].includes(country.id),
  )
  // Isolate the population variant; the fixture retains the actual imported UN values.
  for (const country of countries) delete country.attributes.area_km2
  await page.route('**/data/entities/countries.json', (route) => route.fulfill({ json: countries }))
  await page.goto('play/countries/round?quiz=country-size&mode=choice&scope=world&len=all&repeat=0')
  await expect(page.locator('[data-quiz-kind="country_population_compare"]')).toHaveAttribute(
    'data-answer',
    'country:IN',
  )
  await page.locator('.quiz-option').filter({ hasText: 'Indien' }).click()
  await expect(page.locator('.quiz-option.quiz-answer-correct')).toContainText('Indien')
  await expect(page.getByText('Mittlere UN-Projektion zum 01.07.2026.', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'UN World Population Prospects 2024', exact: true }),
  ).toHaveAttribute('href', 'https://population.un.org/wpp/')
})
