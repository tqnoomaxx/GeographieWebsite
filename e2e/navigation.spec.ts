import { readFileSync } from 'node:fs'
import { test, expect, type Page } from '@playwright/test'

const back = (page: Page) => page.getByRole('button', { name: 'Zurück', exact: true }).click()
const footerLink = (page: Page, path: string) => page.locator(`.simple-footer a[href$="/${path}"]`)
const assertNoOverflow = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)

test('Einstellungen kehren zur aufrufenden Seite zurück; vorwärts und zurück erzeugen keine Schleife', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('explore')
  await expect(page).toHaveTitle('Entdecken · Atlasfunke')
  await footerLink(page, 'settings').click()
  await expect(page.getByRole('heading', { name: 'Einstellungen', exact: true })).toBeVisible()
  const length = await page.evaluate(() => history.length)
  await back(page)
  await expect(page).toHaveURL(/\/explore$/)
  await expect(page.getByRole('heading', { name: 'Entdecken', exact: true })).toBeVisible()
  expect(await page.evaluate(() => history.length)).toBe(length)
  await page.goForward()
  await expect(page).toHaveURL(/\/settings$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/explore$/)
  await assertNoOverflow(page)
  await page.screenshot({ path: `/tmp/atlas-navigation-back-${testInfo.project.name}.png`, fullPage: false })
  expect(errors).toEqual([])
})

test('Verschachtelte Infoseiten folgen dem tatsächlichen Weg bis zum Ausgangspunkt', async ({ page }) => {
  await page.goto('learn')
  await footerLink(page, 'settings').click()
  await page.locator('.page-shell a[href$="/quellen"]').click()
  await expect(page).toHaveURL(/\/quellen$/)
  await back(page)
  await expect(page).toHaveURL(/\/settings$/)
  await page.locator('.page-shell a[href$="/datenschutz"]').click()
  await expect(page.getByRole('heading', { name: 'Datenschutz', exact: true })).toBeVisible()
  await back(page)
  await expect(page).toHaveURL(/\/settings$/)
  await back(page)
  await expect(page).toHaveURL(/\/learn$/)
})

test('Ein Direktaufruf ohne internen Vorgänger bleibt beim Zurückpfeil auf der Website', async ({ page }) => {
  await page.goto('data:text/html,<p>Externe Ausgangsseite</p>')
  await page.goto('settings')
  await expect(page.getByRole('heading', { name: 'Einstellungen', exact: true })).toBeVisible()
  const length = await page.evaluate(() => history.length)
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(10)
  await back(page)
  await expect(page).toHaveURL(/\/profile$/)
  expect(await page.evaluate(() => history.length)).toBe(length)
  await page.goto('country/DE')
  await expect(page.getByRole('heading', { name: 'Deutschland', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await back(page)
  await expect(page).toHaveURL(/\/explore$/)
})

test('Suche und Typ bleiben auch mit dem Zurückpfeil der Detailseite erhalten', async ({ page }) => {
  await page.goto('search')
  await page.getByRole('textbox', { name: 'Suche', exact: true }).fill('Berlin')
  await page.getByRole('combobox', { name: 'Typ', exact: true }).selectOption('city')
  await page.getByRole('link', { name: /^Berlin Stadt/ }).click()
  await expect(page.getByRole('heading', { name: /Berlin$/, level: 1 })).toBeVisible()
  await back(page)
  await expect(page).toHaveURL(/search\?q=Berlin&type=city$/)
  await expect(page.getByRole('textbox', { name: 'Suche', exact: true })).toHaveValue('Berlin')
  await expect(page.getByRole('combobox', { name: 'Typ', exact: true })).toHaveValue('city')
})

test('Ländersuche, aufgeklappte Kontinente und Kartenansicht bleiben im Verlauf erhalten', async ({
  page,
}) => {
  await page.goto('explore')
  await page.getByRole('textbox', { name: 'Land suchen', exact: true }).fill('Deutsch')
  await page.getByRole('link', { name: 'Deutschland', exact: true }).click()
  await page
    .getByRole('button', { name: /Auf der Karte zeigen|Auf Karte zeigen|Karte anzeigen/ })
    .count()
    .then(async (count) => {
      if (count)
        await page
          .getByRole('button', { name: /Auf der Karte zeigen|Auf Karte zeigen|Karte anzeigen/ })
          .click()
      else await page.locator('.page-shell .card').first().getByRole('button').click()
    })
  await page.locator('.page-shell a[href$="/country/FR"]').first().click()
  await expect(page.getByRole('heading', { name: 'Frankreich', exact: true })).toBeVisible()
  await back(page)
  await expect(page.getByRole('heading', { name: 'Deutschland', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Weltkarte', exact: true })).toBeVisible()
  await back(page)
  await expect(page.getByRole('textbox', { name: 'Land suchen', exact: true })).toHaveValue('Deutsch')
  await expect(page.locator('.simple-disclosure[open]')).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Deutschland', exact: true })).toBeVisible()
})

test('Zurück stellt die bisherige Scrollposition der geöffneten Länderliste wieder her', async ({ page }) => {
  await page.goto('explore')
  await page.locator('.simple-disclosure').first().locator('summary').click()
  const country = page.getByRole('link', { name: 'Schweiz', exact: true })
  await country.scrollIntoViewIfNeeded()
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200)
  const position = await page.evaluate(() => scrollY)
  await country.click()
  await expect(page.getByRole('heading', { name: 'Schweiz', exact: true })).toBeVisible()
  await back(page)
  await expect(page.locator('.simple-disclosure').first()).toHaveAttribute('open', '')
  await expect.poll(async () => Math.abs((await page.evaluate(() => scrollY)) - position)).toBeLessThan(60)
})

test('Die aktuelle Lernkarte wird nach einer Länderinfo fortgesetzt', async ({ page }) => {
  await page.goto('learn')
  const card = page.locator('.simple-learning-card')
  await expect(card.locator('h2')).toBeVisible()
  await card.locator('footer button').nth(1).click()
  await card.locator('footer button').nth(1).click()
  const title = await card.locator('h2').innerText()
  const position = await card.locator('header span').first().innerText()
  await card.getByRole('link', { name: 'Land entdecken →', exact: true }).click()
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await back(page)
  await expect(card.locator('h2')).toHaveText(title)
  await expect(card.locator('header span').first()).toHaveText(position)
})

test('Quizfrage und Feedback gehen beim Öffnen einer Länderinfo nicht verloren', async ({ page }) => {
  await page.goto(
    'play/flags/round?mode=flag_to_name&scope=europe&len=10&repeat=0&content=country&seed=return-navigation',
  )
  await page.locator('[data-option-id]').first().click()
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await page.locator('[data-option-id]').first().click()
  const answer = await page.locator('[data-answer]').getAttribute('data-answer')
  const position = await page.locator('.quiz-topbar-progress strong').innerText()
  await page
    .locator('.quiz-feedback-layout a[href*="/country/"], .quiz-feedback-layout a[href*="/region/"]')
    .click()
  await expect(page.locator('.page-back')).toBeVisible()
  await back(page)
  await expect(page.locator('[data-answer]')).toHaveAttribute('data-answer', answer!)
  await expect(page.locator('.quiz-topbar-progress strong')).toHaveText(position)
  await expect(page.getByRole('button', { name: 'Weiter', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await expect(page.locator('.quiz-topbar-progress strong')).not.toHaveText(position)
  for (let i = 0; i < 8; i++) {
    await page.locator('[data-option-id]').first().click()
    await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  }
  await expect(page.getByRole('heading', { name: /Runde beendet/ })).toBeVisible()
  const summary = await page.locator('.atlas-surface').textContent()
  await page.locator('.atlas-surface a.chip[href*="/country/"]').first().click()
  await back(page)
  await expect(page.locator('.atlas-surface')).toHaveText(summary!)
  await page.locator('.atlas-surface a.btn-primary').click()
  await expect(page.locator('.quiz-topbar-progress strong')).toHaveText('1 / 10')
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('Lernkarten behalten Suche, verdeckte Namen und aufgedeckte Karten beim Zurückkehren', async ({
  page,
}) => {
  await page.goto('learn/cards?collection=countries')
  await page.getByRole('textbox', { name: 'Suche', exact: true }).fill('Japan')
  const hide = page.locator('.page-shell button.chip')
  await hide.click()
  await page.locator('.page-shell ul li button').first().click()
  await page.locator('.page-shell ul li a').first().click()
  await expect(page.getByRole('heading', { name: 'Japan', exact: true })).toBeVisible()
  await back(page)
  await expect(page.getByRole('textbox', { name: 'Suche', exact: true })).toHaveValue('Japan')
  await expect(hide).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.page-shell ul li')).toHaveCount(1)
  await expect(page.locator('.page-shell ul li button')).toContainText('Japan')
})

test('Die Sehenswürdigkeitenliste erhält beide Filter nach einer Detailansicht', async ({ page }) => {
  await page.goto('explore/landmarks')
  await page.locator('.page-shell input[type="search"]').fill('Taj Mahal')
  await page.locator('.page-shell select').selectOption('asia')
  await expect(page.locator('[data-landmark-grid] a')).toHaveCount(1)
  await page.locator('[data-landmark-grid] a').click()
  await expect(page.getByRole('heading', { name: /Taj Mahal/ })).toBeVisible()
  await back(page)
  await expect(page.locator('.page-shell input[type="search"]')).toHaveValue('Taj Mahal')
  await expect(page.locator('.page-shell select')).toHaveValue('asia')
  await expect(page.locator('[data-landmark-grid] a')).toHaveCount(1)
})

test('Auch nach dem GitHub-Pages-404-Umweg bleibt der ursprüngliche Zurückweg erhalten', async ({ page }) => {
  const base = process.env.VITE_BASE_URL ?? '/'
  const fallback = readFileSync('public/404.html', 'utf8').replace(
    '<meta charset="utf-8">',
    `<meta charset="utf-8"><meta name="gk-base" content="${base}">`,
  )
  await page.route('**/settings', async (route) => {
    if (route.request().resourceType() === 'document')
      await route.fulfill({ status: 404, contentType: 'text/html', body: fallback })
    else await route.continue()
  })
  await page.goto('search?q=Berlin&type=city')
  await footerLink(page, 'settings').click()
  await expect(page.getByRole('heading', { name: 'Einstellungen', exact: true })).toBeVisible()
  const state = await page.evaluate(() => ({ key: history.state.key, idx: history.state.idx }))
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Einstellungen', exact: true })).toBeVisible()
  expect(await page.evaluate(() => ({ key: history.state.key, idx: history.state.idx }))).toEqual(state)
  await back(page)
  await expect(page).toHaveURL(/search\?q=Berlin&type=city$/)
  await expect(page.getByRole('textbox', { name: 'Suche', exact: true })).toHaveValue('Berlin')
})
