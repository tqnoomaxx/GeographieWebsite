import { test, expect, type Page } from '@playwright/test'
const messages = new WeakMap<Page, string[]>()
test.beforeEach(({ page }, testInfo) => {
  const errors: string[] = []
  messages.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !(testInfo.title.includes('Ausfall') && message.text() === 'Failed to load resource: net::ERR_FAILED')
    )
      errors.push(message.text())
  })
})
test.afterEach(async ({ page }) => {
  expect(messages.get(page)).toEqual([])
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('Karten im Menü: Vorwahlen, Auswahl, Suche und Zoom', async ({ page }, testInfo) => {
  await page.goto('explore')
  await page
    .getByRole('navigation', { name: 'Hauptnavigation', exact: true })
    .getByRole('link', { name: 'Karten', exact: true })
    .filter({ visible: true })
    .click()
  await expect(page).toHaveURL(/\/maps$/)
  await expect(page).toHaveTitle('Karten · Atlasfunke')
  await expect(page.getByRole('heading', { name: 'Karten', exact: true })).toBeVisible()
  await expect(page.locator('[data-map-country]')).toHaveCount(253)
  const search = page.getByRole('searchbox', { name: 'Land oder Kartenwert suchen', exact: true })
  await search.fill('+49')
  const results = page.locator('.atlas-country-results button')
  await expect(results).toHaveCount(1)
  await expect(results).toContainText('Deutschland')
  await results.click()
  await expect(page.locator('.atlas-country-details')).toContainText('+49')
  await expect(page.locator('.atlas-country-details')).toContainText('Rechtsverkehr')
  await expect(page.locator('.atlas-country-details')).toContainText('.de')
  await expect(page.locator('.atlas-country-details')).toContainText('EUR')
  await search.fill('')
  await page.locator('[data-map-country="country:GB"]').focus()
  await page.locator('[data-map-country="country:GB"]').press('Enter')
  await expect(page.locator('.atlas-country-details')).toContainText('+44')
  const before = await page.locator('.atlas-map-label').count()
  await page.getByRole('button', { name: 'Hineinzoomen', exact: true }).click()
  await expect(page.locator('.map-zoom-value')).toHaveText('150%')
  expect(await page.locator('.atlas-map-label').count()).toBeGreaterThanOrEqual(before)
  await page.getByRole('checkbox', { name: 'Beschriftungen', exact: true }).uncheck()
  await expect(page.locator('.atlas-map-label')).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Beschriftungen', exact: true }).check()
  await page.getByRole('button', { name: 'Karte zurücksetzen', exact: true }).click()
  await page
    .locator('.atlas-map-frame')
    .screenshot({ path: `/tmp/atlas-thematic-calling-${testInfo.project.name}.png` })
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: `/tmp/atlas-maps-${testInfo.project.name}.png`, fullPage: true })
})

test('Verkehrsseite filtern, kleine Länder finden und weitere Kartenthemen öffnen', async ({
  page,
}, testInfo) => {
  await page.goto('maps?theme=driving')
  await expect(page.locator('[data-map-country="country:GB"]')).toHaveAttribute('aria-label', /Linksverkehr/)
  await expect(page.locator('[data-map-country="country:DE"]')).toHaveAttribute('aria-label', /Rechtsverkehr/)
  await page.getByRole('button', { name: /^Linksverkehr\s*\d+$/ }).click()
  await expect(page.locator('.atlas-country-results')).not.toContainText('Deutschland')
  await expect(page.locator('.atlas-country-results')).toContainText('Japan')
  await expect(page.locator('[data-map-country="country:DE"]')).toHaveClass(/is-dimmed/)
  await page.getByRole('button', { name: 'Alle Länder', exact: true }).click()
  const search = page.getByRole('searchbox', { name: 'Land oder Kartenwert suchen', exact: true })
  await search.fill('Vatikan')
  await page.locator('.atlas-country-results button').click()
  await expect(page.locator('.atlas-country-details')).toContainText('+39')
  await page.getByRole('button', { name: 'Internet-Endungen', exact: true }).click()
  await expect(page).toHaveURL(/theme=domains/)
  await search.fill('.de')
  await expect(page.locator('.atlas-country-results')).toContainText('Deutschland')
  await page.getByRole('button', { name: 'Währungen', exact: true }).click()
  await search.fill('EUR')
  await expect(page.locator('.atlas-country-results')).toContainText('Deutschland')
  await search.fill('keintrefferxyz')
  await expect(page.locator('.atlas-country-results')).toContainText('Keine Treffer')
  await page.getByRole('button', { name: 'Links- & Rechtsverkehr', exact: true }).click()
  await expect(search).toHaveValue('')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Links- & Rechtsverkehr', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page
    .locator('.atlas-map-frame')
    .screenshot({ path: `/tmp/atlas-thematic-driving-${testInfo.project.name}.png` })
})

test('320px und Tablet: alle sieben Menüpunkte und die Karte sind bedienbar', async ({ page }) => {
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('maps?theme=driving')
    await expect(page.locator('[data-map-country="country:DE"]')).toBeVisible()
    const nav = page
      .getByRole('navigation', { name: 'Hauptnavigation', exact: true })
      .filter({ visible: true })
    await expect(nav.getByRole('link')).toHaveCount(7)
    await expect(nav.getByRole('link', { name: 'Karten', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('Ausfall der Kartendaten lässt sich erneut laden', async ({ page }) => {
  let fail = true
  await page.route('**/data/meta/country-map-facts.json', (route) =>
    fail ? route.abort() : route.continue(),
  )
  await page.goto('maps')
  await expect(
    page.getByText('Die Kartenthemen konnten nicht geladen werden.', { exact: true }),
  ).toBeVisible()
  fail = false
  await page.getByRole('button', { name: /Erneut/ }).click()
  await expect(page.locator('[data-map-country]')).toHaveCount(253)
})

test('Länderprofil führt zurück zur Karte mit demselben Thema und Suchwert', async ({ page }) => {
  await page.goto('maps?theme=currencies')
  await page.getByRole('searchbox', { name: 'Land oder Kartenwert suchen', exact: true }).fill('Deutschland')
  await page.locator('.atlas-country-results button').click()
  await page.getByRole('link', { name: 'Land entdecken', exact: true }).click()
  await expect(page).toHaveURL(/country\/DE$/)
  await page.getByRole('button', { name: 'Zurück', exact: true }).click()
  await expect(page).toHaveURL(/maps\?theme=currencies$/)
  await expect(page.getByRole('searchbox', { name: 'Land oder Kartenwert suchen', exact: true })).toHaveValue(
    'Deutschland',
  )
  await expect(page.locator('.atlas-country-details')).toContainText('Deutschland')
})
