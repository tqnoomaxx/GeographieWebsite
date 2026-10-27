import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { EXERCISES, QUIZ_TOPICS } from '../src/config/quizCatalog'

test('Ein Thema, klare Übungen und nur passende Auswahlmöglichkeiten', async ({ page }) => {
  await page.goto('play')
  await expect(page.locator('.topic-link')).toHaveCount(QUIZ_TOPICS.length)
  await page.locator('[data-quiz-topic="flags"]').click()
  await expect(page.locator('[data-exercise]')).toHaveCount(2)
  await page.locator('[data-exercise="country-flags"]').click()
  await expect(page.getByRole('button', { name: 'Automatisch', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Eintippen', exact: true }).click()
  await page.getByRole('combobox', { name: 'Gebiet', exact: true }).selectOption('europe')
  await page.locator('.training-options summary').click()
  await page.getByRole('combobox', { name: 'Rundenlänge', exact: true }).selectOption('20')
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page.locator('[data-generator="flag_to_country_input"]')).toBeVisible()
  await expect(page).toHaveURL(/quiz=country-flags.*mode=input.*scope=europe.*len=20/)
  await page.goto('play/capitals?quiz=name-capital')
  await expect(page.locator('.exercise-summary')).toContainText('20 Fragen')
  await page.goto('play/cities')
  await expect(page.locator('[data-exercise="name-capital"]')).toHaveCount(0)
  await page.goto('play/regions')
  await expect(page.locator('[data-exercise="regional-flags"]')).toBeVisible()
})

test('Jede Übung und jede angebotene Antwortart startet wirklich den gewählten Spieltyp', async ({
  page,
}) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const exercise of EXERCISES)
    for (const form of Object.keys(exercise.variants)) {
      await page.goto(`play/${exercise.topic}?quiz=${exercise.id}&mode=${form}`)
      await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
      const question = page.locator('[data-question-type]')
      await expect(question, exercise.id + '/' + form).toBeVisible()
      const generator = await question.getAttribute('data-generator')
      expect(
        exercise.topic === 'mixed' ||
          exercise.variants[form as keyof typeof exercise.variants]?.includes(generator!),
        exercise.id + '/' + form,
      ).toBe(true)
      await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    }
  expect(errors).toEqual([])
})

test('Karte, Schrift und Sammlung behalten die ausgewählte Aufgabe', async ({ page }) => {
  await page.goto('play/regions?quiz=regional-flags')
  await page.getByRole('button', { name: 'Karte', exact: true }).click()
  await page.getByRole('combobox', { name: 'Land', exact: true }).selectOption('europe')
  await expect(page.locator('.exercise-summary')).toContainText('10 Fragen')
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page.locator('[data-generator="flag_to_europe_map"]')).toBeVisible()
  await page.goto('play/languages?quiz=read-greek')
  await page.getByRole('button', { name: 'Eintippen', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Gebiet', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page.locator('[data-generator="script_to_latin_input"]')).toBeVisible()
  await page.goto('play/cities?quiz=large-cities')
  await expect(page.getByRole('combobox', { name: 'Sammlung', exact: true })).toHaveValue('over_300k')
  await expect(
    page.getByRole('combobox', { name: 'Gebiet', exact: true }).locator('option[value^="country:"]'),
  ).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Sammlung', exact: true }).selectOption('all_cities')
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page.locator('[data-generator="city_to_country"]')).toBeVisible()
})

test('Länderprofil übernimmt Treffer ohne Enter und speichert auch teilweise gelöste Länder', async ({
  page,
}) => {
  await page.goto('play/countries/round?quiz=country-profile&mode=input&scope=world&len=all')
  const input = page.getByRole('textbox', { name: 'Antwort eingeben', exact: true })
  await expect(input).toBeVisible()
  const country = await page.locator('[data-question-type]').getAttribute('data-answer')
  const countries = JSON.parse(readFileSync('public/data/entities/countries.json', 'utf8'))
  const cities = JSON.parse(readFileSync('public/data/entities/cities.json', 'utf8'))
  const target = countries.find((c: { id: string }) => c.id === country)
  const attributes = target.attributes
  const capitalId =
    attributes.capitals[0] ??
    attributes.capital_details.find((c: { role: string }) => c.role === 'government_seat')?.city
  const capital = cities.find((c: { id: string }) => c.id === capitalId).names.de
  const continent = (
    {
      europe: 'Europa',
      asia: 'Asien',
      africa: 'Afrika',
      'north-america': 'Nordamerika',
      'south-america': 'Südamerika',
      oceania: 'Ozeanien',
    } as Record<string, string>
  )[attributes.statistical_region ?? attributes.continent]
  const values = [
    capital,
    (
      attributes.currencies.find((c: { code: string }) => c.code === attributes.domestic_currency) ??
      attributes.currencies[0]
    ).code,
    continent,
    attributes.languages[0],
    attributes.iso2,
  ]
  await input.fill(values[0].slice(0, -1))
  await expect(page.locator('[data-field="capital"]')).toHaveAttribute('data-solved', 'false')
  await input.fill(values[0])
  await expect(input).toHaveValue('')
  await input.fill(values[1])
  await expect(page.locator('[data-field="currency"]')).toHaveAttribute('data-solved', 'true')
  await page.getByRole('button', { name: 'Beenden' }).click()
  await page.getByRole('link', { name: /Weiterspielen/ }).click()
  await page.reload()
  await expect(page.locator('[data-field="capital"]')).toHaveAttribute('data-solved', 'true')
  await expect(page.locator('[data-field="currency"]')).toHaveAttribute('data-solved', 'true')
  for (const value of values.slice(2)) await input.fill(value)
  await expect(page.getByRole('button', { name: 'Nächstes Land' })).toBeVisible()
  await page.getByRole('button', { name: 'Nächstes Land' }).click()
  await expect(page.locator('[data-question-type]')).not.toHaveAttribute('data-answer', country!)
})

test('Die Suche findet Übungen direkt aus dem gemeinsamen Katalog', async ({ page }) => {
  await page.goto('search?q=Länderprofil&type=quiz')
  await expect(page.getByRole('combobox', { name: 'Typ', exact: true })).toHaveValue('quiz')
  await page.getByRole('link', { name: 'Länderprofil ausfüllen Quiz', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Länderprofil ausfüllen', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Quiz starten', exact: true })).toBeEnabled()
})

test('Alte Themenlinks führen zur passenden konkreten Übung', async ({ page }) => {
  const cases = [
    ['play/countries?mode=regions_on_map&scope=country:DE', 'region-map', 'region_on_map'],
    ['play/images?mode=image_to_city', 'city-photo', 'image_to_city'],
    ['play/cities?mode=capital_input', 'name-capital', 'capital_input'],
    ['play/flags?mode=europe_map', 'regional-flags', 'flag_to_europe_map'],
  ]
  for (const [url, id, generator] of cases) {
    await page.goto(url)
    await expect(page).toHaveURL(new RegExp('quiz=' + id))
    await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
    await expect(page.locator('[data-generator="' + generator + '"]')).toBeVisible()
  }
})
