import { test, expect, type Page } from '@playwright/test'
import { accountSession, emitAccountEvent, installAccountMock } from './account-fixture'

// Browser plugin is unavailable in this session. Exercise the built app with Playwright.
test.use({ actionTimeout: 10_000 })
const runtimeErrors = new WeakMap<Page, string[]>()
test.beforeEach(({ page }) => {
  const errors: string[] = []
  runtimeErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
})
test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([])
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})

test('Profil wartet auf die Sitzung und zeigt danach die Kontodaten', async ({ page }, info) => {
  await installAccountMock(page)
  await page.goto('profile')
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Atlas_Alpha')
  await expect(page).toHaveTitle(/Profil/)
  await expect(page).toHaveURL(/\/profile$/)
  await page.screenshot({ path: `/tmp/atlas-session-profile-${info.project.name}.png` })
})

test('Ein temporärer Auth-Ausfall bei Token-Erneuerung meldet das Konto nicht ab', async ({ page }) => {
  const state = await installAccountMock(page)
  await page.goto('account')
  await expect(page.getByRole('button', { name: 'Abmelden', exact: true })).toBeVisible()
  state.userFailure = true
  await emitAccountEvent(page, 'TOKEN_REFRESHED')
  await expect(page.getByRole('button', { name: 'Abmelden', exact: true })).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: /Sitzung/ })).toBeVisible()
  await expect(page).toHaveURL(/\/account$/)
})

test('Ein nach Veröffentlichung fehlendes Seitenpaket wird einmal neu geladen', async ({ page }, info) => {
  let failed = false,
    requests = 0
  await page.route('**/assets/SettingsPage-*.js', (route) => {
    requests++
    if (!failed) {
      failed = true
      return route.fulfill({ status: 404, contentType: 'text/plain', body: 'missing old release chunk' })
    }
    return route.continue()
  })
  await page.goto('')
  await page.locator('footer a[href$="/settings"]').click()
  await expect(page.getByRole('heading', { name: 'Einstellungen', exact: true })).toBeVisible({
    timeout: 15_000,
  })
  expect(requests).toBe(2)
  await page.screenshot({ path: `/tmp/atlas-route-recovery-${info.project.name}.png` })
})

test('Beim Kontowechsel werden Profil und Lernfortschritt neu zugeordnet', async ({ page }) => {
  await installAccountMock(page)
  await page.goto('profile')
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Atlas_Alpha')
  await emitAccountEvent(page, 'SIGNED_IN', 1)
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Atlas_Beta')
  await expect(page.getByText('account-0@example.invalid', { exact: true })).toHaveCount(0)
  await page.reload()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Atlas_Beta')
})

test('Eine verspätete Sitzungsantwort kann eine Abmeldung nicht rückgängig machen', async ({ page }) => {
  const state = await installAccountMock(page)
  await page.goto('profile')
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Atlas_Alpha')
  state.userDelay = 700
  const before = state.userRequests
  const response = page.waitForResponse((r) => r.url().endsWith('/auth/v1/user'))
  await emitAccountEvent(page, 'TOKEN_REFRESHED')
  await expect.poll(() => state.userRequests).toBeGreaterThan(before)
  await emitAccountEvent(page, 'SIGNED_OUT')
  await response
  await expect(page.getByRole('link', { name: 'Anmelden', exact: true })).toBeVisible()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('')
})

test('Profilfehler sind erneut abrufbar; fehlgeschlagenes Speichern meldet keinen Erfolg', async ({
  page,
}) => {
  const state = await installAccountMock(page)
  state.profileFailure = true
  await page.goto('profile')
  await expect(
    page.getByRole('alert').filter({ hasText: 'Dein Profil konnte nicht geladen werden.' }),
  ).toBeVisible({ timeout: 20_000 })
  state.profileFailure = false
  await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Atlas_Alpha')
  await page.getByLabel('Name', { exact: true }).fill('Geänderter_Name')
  state.profileFailure = true
  await page.getByRole('button', { name: /Speichern|Profil speichern/i }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Das Profil konnte nicht gespeichert werden.' }),
  ).toBeVisible()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Geänderter_Name')
})

test('Ein dauerhaft fehlendes Seitenpaket endet ohne Neuladeschleife mit einem klaren Hinweis', async ({
  page,
}) => {
  let requests = 0
  await page.route('**/assets/SettingsPage-*.js', (route) => {
    requests++
    return route.fulfill({ status: 404, contentType: 'text/plain', body: 'missing' })
  })
  await page.goto('')
  await page.locator('footer a[href$="/settings"]').click()
  await expect(
    page.getByRole('heading', { name: 'Diese Seite konnte nicht geladen werden', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Erneut versuchen', exact: true })).toBeVisible()
  expect(requests).toBe(2)
  await page.getByRole('link', { name: 'Zur Startseite', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Direkt spielen', exact: true })).toBeVisible()
})

test('Ein kurzer Serverausfall beim Seitenwechsel wird ohne Fehlerseite abgefangen', async ({ page }) => {
  let requests = 0
  await page.route('**/data/entities/trivia.json', (route) => {
    requests++
    return requests === 1 ? route.fulfill({ status: 503, json: { error: 'temporary' } }) : route.continue()
  })
  await page.goto('play/trivia/round?len=1&repeat=0')
  await expect(page.locator('[data-generator="geography_trivia"]')).toBeVisible()
  expect(requests).toBe(2)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('Eine abgelaufene gemerkte Sitzung wird beim Start erneuert und bleibt nach Reload erhalten', async ({
  page,
}) => {
  const state = await installAccountMock(page, { remembered: true, expired: true })
  await page.goto('profile')
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Atlas_Alpha')
  expect(state.refreshRequests).toBe(1)
  await page.reload()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Atlas_Alpha')
  expect(state.refreshRequests).toBe(1)
})

test('Ein Auth-Ausfall beim Start zeigt Wiederholen statt das gespeicherte Konto zu löschen', async ({
  page,
}) => {
  const state = await installAccountMock(page)
  state.userFailure = true
  await page.goto('profile')
  await expect(page.getByRole('button', { name: 'Sitzung erneut prüfen', exact: true })).toBeVisible()
  expect(await page.evaluate(() => !!sessionStorage.getItem('atlasfunke.auth.session'))).toBe(true)
  state.userFailure = false
  await page.getByRole('button', { name: 'Sitzung erneut prüfen', exact: true }).click()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Atlas_Alpha')
})

test('Zwei offene Tabs übernehmen erneuerte Tokens und die Abmeldung gemeinsam', async ({
  page,
  context,
}) => {
  await installAccountMock(page)
  await page.goto('profile')
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Atlas_Alpha')
  const second = await context.newPage()
  await installAccountMock(second)
  await second.goto('profile')
  await expect(second.getByLabel('Name', { exact: true })).toHaveValue('Atlas_Alpha')
  await emitAccountEvent(page, 'TOKEN_REFRESHED', 0, { refresh_token: 'rotated-test-token' })
  await expect
    .poll(() =>
      second.evaluate(
        () => JSON.parse(sessionStorage.getItem('atlasfunke.auth.session') ?? 'null')?.refresh_token,
      ),
    )
    .toBe('rotated-test-token')
  await emitAccountEvent(page, 'SIGNED_OUT')
  await expect(second.getByRole('link', { name: 'Anmelden', exact: true })).toBeVisible()
  expect(await second.evaluate(() => sessionStorage.getItem('atlasfunke.auth.session'))).toBeNull()
  await second.evaluate(async (session) => {
    const sender = new BroadcastChannel('atlasfunke.auth.session')
    const receiver = new BroadcastChannel('atlasfunke.auth.session')
    const received = new Promise<void>((resolve) => {
      receiver.onmessage = () => resolve()
    })
    sender.postMessage({ event: 'TOKEN_REFRESHED', session })
    await received
    sender.close()
    receiver.close()
  }, accountSession())
  expect(await second.evaluate(() => sessionStorage.getItem('atlasfunke.auth.session'))).toBeNull()
  await expect(second.getByRole('link', { name: 'Anmelden', exact: true })).toBeVisible()
  await second.close()
})
