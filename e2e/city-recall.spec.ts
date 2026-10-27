import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
const germany = JSON.parse(readFileSync('public/data/city-recall/DE.json', 'utf8')) as {
  cities: Array<{ id: string; name: string; population: number }>
}
const berlin = germany.cities.find((c) => c.name === 'Berlin')!
const munich = germany.cities.find((c) => c.name === 'München')!
const count = (min: number) => germany.cities.filter((c) => c.population > min).length

test('Freie Grenze, Auto-Annahme, Karte und Fortsetzen', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (message) => {
    // Playwright sperrt den Service Worker ausdrücklich, damit Ausfalltests reproduzierbar bleiben.
    if (
      ['error', 'warning'].includes(message.type()) &&
      message.text() !== 'Service Worker registration blocked by Playwright'
    )
      errors.push(message.text())
  })
  await page.goto('play/cities')
  await page.locator('[data-exercise="city-recall"]').click()
  await expect(page.getByRole('heading', { name: 'Städte auf der Karte sammeln', exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Land', exact: true })).toHaveValue('country:DE')
  await expect(page.locator('.training-options')).toHaveCount(0)
  const limit = page.getByRole('spinbutton', { name: 'Einwohnergrenze', exact: true })
  await limit.fill('175001')
  await expect(page.locator('.exercise-summary')).toContainText(`${count(175001)} Städte über 175.001`)
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page).toHaveURL(/population=175001/)
  await expect(page).toHaveTitle(/Städte auf der Karte sammeln/)
  const input = page.getByRole('textbox', { name: 'Welche Städte kennst du?', exact: true })
  await expect(input).toBeVisible()
  await expect(page.locator('.recall-map-land')).toBeVisible()
  await expect(page.locator('[data-city-pin]')).toHaveCount(0)
  await input.fill('Berli')
  await input.press('Enter')
  await expect(page.locator('[data-city-pin]')).toHaveCount(0)
  await input.fill('Berlin')
  await expect(page.locator(`[data-city-pin="${berlin.id}"]`)).toHaveAttribute('data-found', 'true')
  await expect(input).toHaveValue('')
  await page.getByRole('button', { name: 'Hineinzoomen', exact: true }).click()
  await expect(page.locator('.map-zoom-value')).toHaveText('150%')
  await input.fill('Muenchen')
  await expect(page.locator(`[data-city-pin="${munich.id}"]`)).toHaveAttribute('data-found', 'true')
  await expect(page.locator('.map-zoom-value')).toHaveText('150%')
  await expect(page.locator('.city-recall-count strong')).toHaveText('2')
  await input.fill('Berlin')
  await input.press('Enter')
  await expect(page.locator('#city-guess-status')).toContainText('schon gefunden')
  await expect(page.locator('[data-city-pin]')).toHaveCount(2)
  await input.fill('Paris')
  await input.press('Enter')
  await expect(page.locator('#city-guess-status')).toContainText('Kein Treffer')
  await expect(page.locator('[data-city-pin]')).toHaveCount(2)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  expect(overflow).toBe(false)
  await page.getByRole('button', { name: 'Beenden', exact: true }).click()
  await expect(page.getByRole('link', { name: /Weiterspielen/ })).toContainText('175.001')
  await page.getByRole('link', { name: /Weiterspielen/ }).click()
  await expect(page.locator('[data-city-pin]')).toHaveCount(2)
  await page.reload()
  await expect(page.locator('[data-city-pin]')).toHaveCount(2)
  await expect(page.locator('.city-recall-heading')).toContainText('175.001')
  await expect(input).toHaveValue('')
  await page.screenshot({ path: `/tmp/city-recall-${testInfo.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Auflösen & fehlende Städte zeigen', exact: true }).click()
  await expect(page.locator('[data-city-pin]')).toHaveCount(count(175001))
  await expect(input).toHaveCount(0)
  await expect(page.locator('[data-city-pin][data-found="true"]')).toHaveCount(2)
  await page.getByRole('button', { name: 'Ergebnis speichern', exact: true }).click()
  await expect(page.locator('.city-recall-finish-note')).toContainText('Ergebnis wurde gespeichert')
  await expect(page.getByRole('link', { name: 'Noch einmal', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Land oder Grenze ändern', exact: true }).click()
  await expect(limit).toHaveValue('175001')
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('Ungültige, leere und beliebige Einwohnergrenzen', async ({ page }) => {
  await page.goto('play/cities?quiz=city-recall')
  const limit = page.getByRole('spinbutton', { name: 'Einwohnergrenze', exact: true })
  const start = page.getByRole('button', { name: 'Quiz starten', exact: true })
  await expect(start).toBeEnabled()
  for (const value of ['', '0', '14999', '175000.5']) {
    await limit.fill(value)
    await expect(start).toBeDisabled()
  }
  for (const value of [50000, 123456, 800000]) {
    await limit.fill(String(value))
    await expect(page.locator('.exercise-summary')).toContainText(
      `${count(value)} Städte über ${value.toLocaleString('de-DE')}`,
    )
    await expect(start).toBeEnabled()
  }
  await limit.fill('999999999')
  await expect(start).toBeDisabled()
  await expect(page.getByRole('status')).toContainText('keine Städte')
})

test('Fehlgeschlagene Städtedaten lassen sich erneut laden; USA-Karte funktioniert', async ({ page }) => {
  let fail = true
  await page.route('**/data/city-recall/US.json', async (route) => {
    if (fail) await route.abort()
    else await route.continue()
  })
  await page.goto(
    'play/cities/round?quiz=city-recall&mode=input&scope=country%3AUS&population=8000000&len=all&repeat=0',
  )
  await expect(page.getByText('Städte konnten nicht geladen werden.')).toBeVisible()
  fail = false
  await page.getByRole('button', { name: /Erneut/ }).click()
  await expect(page.locator('.recall-map-land')).toBeVisible()
  await page.getByRole('textbox', { name: 'Welche Städte kennst du?', exact: true }).fill('New York City')
  await expect(page.locator('[data-city-pin][data-found="true"]')).toHaveCount(1)
  await expect(page.getByText('Alle Städte gefunden – starke Runde!')).toBeVisible()
  await page.getByRole('button', { name: 'Ergebnis speichern', exact: true }).click()
  await expect(page.locator('.city-recall-finish-note')).toContainText('Ergebnis wurde gespeichert')
})

test('320px bleiben bedienbar; Karte lässt sich ziehen und zurücksetzen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('play/cities/round?quiz=city-recall&scope=country%3ADE&population=50000')
  await expect(page.locator('.recall-map-land')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Welche Städte kennst du?', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Hineinzoomen', exact: true }).click()
  const svg = page.locator('.city-recall-map svg.map-canvas')
  const box = (await svg.boundingBox())!
  const drawing = svg.locator(':scope > g')
  const before = await drawing.getAttribute('transform')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 30, { steps: 5 })
  await page.mouse.up()
  await expect(drawing).not.toHaveAttribute('transform', before!)
  await page.getByRole('button', { name: 'Karte zurücksetzen', exact: true }).click()
  await expect(page.locator('.map-zoom-value')).toHaveText('100%')
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('Kartenausfall blockiert das Raten nicht und lässt sich beheben', async ({ page }) => {
  let fail = true
  await page.route('**/data/geo/outlines/DE.json', async (route) => {
    if (fail) await route.abort()
    else await route.continue()
  })
  await page.goto('play/cities/round?quiz=city-recall&scope=country%3ADE&population=175001')
  await expect(
    page.getByText('Karte konnte nicht geladen werden. Du kannst weiter Städtenamen eingeben.'),
  ).toBeVisible()
  await page.getByRole('textbox', { name: 'Welche Städte kennst du?', exact: true }).fill('Berlin')
  await expect(page.locator('.city-recall-count strong')).toHaveText('1')
  fail = false
  await page.getByRole('button', { name: /Erneut/ }).click()
  await expect(page.locator(`[data-city-pin="${berlin.id}"]`)).toHaveAttribute('data-found', 'true')
})
