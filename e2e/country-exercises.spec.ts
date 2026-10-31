import { test, expect, type Page } from '@playwright/test'
const errors = new WeakMap<Page, string[]>()
test.beforeEach(({ page }, info) => {
  const messages: string[] = []
  errors.set(page, messages)
  page.on('pageerror', (error) => messages.push(error.message))
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !(info.title.includes('Ausfall') && message.text() === 'Failed to load resource: net::ERR_FAILED')
    )
      messages.push(message.text())
  })
})
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([])
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
const choose = async (page: Page, iso: string) => {
  await page.goto('')
  await page.getByLabel('Land suchen oder auswählen').selectOption('country:' + iso)
  await expect(page.locator('.country-exercise-status').filter({ hasText: 'Weitere passende' })).toHaveCount(
    0,
  )
}

test('Weltkugel zeigt konkrete Deutschland-Übungen und behält die Auswahl beim Zurückgehen', async ({
  page,
}, info) => {
  await choose(page, 'DE')
  const panel = page.locator('.country-quiz-panel')
  await expect(panel.getByRole('heading', { name: 'Deutschland', exact: true })).toBeVisible()
  await expect(panel.locator('[data-country-exercise="country-profile"]')).toContainText('5 Wissensfelder')
  await expect(panel.locator('[data-country-exercise="city-recall"]')).toBeVisible()
  await expect(panel.locator('[data-country-exercise="river-country"]')).toContainText('Flüsse auf der Karte')
  await expect(panel).not.toContainText('Weltweite Quizze')
  for (const href of await panel
    .locator('[data-country-exercise]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')!)))
    expect(new URL(href, 'https://atlas.test').searchParams.get('scope')).toBe('country:DE')
  await panel.locator('[data-country-exercise="regional-flags"]').click()
  await expect(page.getByRole('combobox', { name: 'Land', exact: true })).toHaveValue('country:DE')
  await expect(page.locator('.country-setup-context')).toContainText('Deutschland')
  await page.goBack()
  await expect(page.getByLabel('Land suchen oder auswählen')).toHaveValue('country:DE')
  await expect(panel.getByRole('heading', { name: 'Deutschland', exact: true })).toBeVisible()
  await panel.scrollIntoViewIfNeeded()
  await panel.screenshot({
    style: '.simple-header, .mobile-nav { visibility: hidden !important; }',
    path: `/tmp/country-exercises-${info.project.name}.png`,
  })
})

test('Dünne Datenlage: Nauru bekommt sein eigenes angepasstes Länderprofil', async ({ page }) => {
  await choose(page, 'NR')
  const panel = page.locator('.country-quiz-panel')
  await expect(panel.getByRole('heading', { name: 'Nauru', exact: true })).toBeVisible()
  await expect(panel.locator('[data-country-exercise="regional-flags"]')).toHaveCount(0)
  await panel.locator('[data-country-exercise="country-profile"]').click()
  await expect(page.locator('.country-setup-context')).toContainText('Nauru')
  await expect(page.getByRole('combobox', { name: 'Länder pro Runde', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page).toHaveURL(/scope=country%3ANR/)
  await expect(page.locator('.profile-game')).toContainText('Nauru')
  await page.reload()
  await expect(page.locator('.profile-game')).toContainText('Nauru')
})

test('Naturkarten halten das Land fest und bieten kein triviales Länder-Raten an', async ({ page }) => {
  await page.goto('play/water?quiz=river-country&scope=country:DE')
  await expect(page.getByRole('button', { name: 'Karte', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: 'Auswählen', exact: true })).toBeDisabled()
  await expect(page.locator('.country-setup-context')).toContainText('Deutschland')
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page).toHaveURL(/scope=country%3ADE/)
  await expect(page.locator('[data-feature-map="river"]')).toBeVisible()
  await expect(page.locator('.quiz-topbar')).toContainText('Deutschland')
})

test('Länderseite nutzt dieselbe Übungsauswahl; fehlende Inhalte wechseln nicht das Land', async ({
  page,
}) => {
  await page.goto('country/JP')
  const panel = page.locator('.country-quiz-panel')
  await expect(panel.locator('[data-country-exercise="city-recall"]')).toBeVisible()
  await panel.locator('[data-country-exercise="city-recall"]').click()
  await expect(page.getByRole('combobox', { name: 'Land', exact: true })).toHaveValue('country:JP')
  await page.goto('play/regions?quiz=regional-flags&scope=country:NR')
  await expect(page.locator('.country-setup-context')).toContainText('Nauru')
  await expect(page.getByRole('button', { name: 'Quiz starten', exact: true })).toBeDisabled()
  await page.goto('play/cities?quiz=city-recall&scope=country:AQ')
  await expect(page.locator('.exercise-summary')).toContainText('Antarktis')
  await expect(page.getByRole('button', { name: 'Quiz starten', exact: true })).toBeDisabled()
})

test('Ausfall eines Pakets lässt andere passende Übungen erreichbar', async ({ page }) => {
  await page.route('**/data/entities/landmarks.json', (route) => route.abort())
  await choose(page, 'DE')
  const panel = page.locator('.country-quiz-panel')
  await expect(panel).toContainText('Einige Inhalte konnten nicht geladen werden.')
  await expect(panel.locator('[data-country-exercise="country-profile"]')).toBeVisible()
  await expect(panel.locator('[data-country-exercise="city-recall"]')).toBeVisible()
  await expect(panel.locator('[data-country-exercise="landmark-photo"]')).toHaveCount(0)
})

test('Gemeinsamer Ländereinstieg bietet echte Übungen für das übergebene Land', async ({ page }) => {
  await page.goto('play?scope=country%3AJP')
  await expect(page.getByRole('heading', { name: 'Quizze für Japan', exact: true })).toBeVisible()
  const profile = page.locator('[data-country-exercise="country-profile"]')
  await expect(profile).toBeVisible()
  await profile.click()
  await expect(page.locator('.country-setup-context')).toContainText('Japan')
})
