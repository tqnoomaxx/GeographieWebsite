import { test, expect, type Page } from '@playwright/test'
import type { Improvement } from '../src/services/improvements'

// Browser plugin not available. Flow: quiz -> capture improvement -> shared panel -> edit/filter/delete.
// Every backend request is intercepted; these tests never write to the online project.
test.use({ actionTimeout: 10_000 })
const USER = '91e11111-1111-4111-8111-111111111111'
const round = 'play/flags/round?quiz=country-flags&mode=choice&scope=world&len=10&repeat=0'
const errors = new WeakMap<Page, string[]>()
test.beforeEach(({ page }) => {
  const list: string[] = []
  errors.set(page, list)
  page.on('pageerror', (e) => list.push(e.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:'))
      list.push(message.text())
  })
  page.on('response', (response) => {
    // Two cases deliberately exercise save failures and an unapplied migration.
    if (
      response.status() >= 400 &&
      !(response.url().includes('/quiz_improvements') && [404, 503].includes(response.status()))
    )
      list.push(`${response.status()} ${response.url()}`)
  })
})
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([])
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})

async function backend(page: Page, role: 'developer' | 'user' | 'mfa' = 'developer') {
  const user = {
    id: USER,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'developer@example.invalid',
    email_confirmed_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: { role: 'admin', developer: true },
    factors: role === 'mfa' ? [{ id: 'test-factor', factor_type: 'totp', status: 'verified' }] : [],
  }
  await page.addInitScript(
    ({ user }) => {
      const encode = (value: object) =>
        btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
      const expires = Math.floor(Date.now() / 1000) + 3600
      const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', aal: 'aal1', exp: expires })}.fake-test-signature`
      sessionStorage.setItem(
        'atlasfunke.auth.session',
        JSON.stringify({
          access_token: token,
          refresh_token: 'test-only-refresh',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: expires,
          user,
        }),
      )
    },
    { user },
  )
  const state = { items: [] as Improvement[], failSave: false, conflict: false, missing: false, reads: 0 }
  let version = 0
  await page.route(/\/(auth|rest|functions)\/v1\//, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const respond = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        json: body,
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
      })
    if (method === 'OPTIONS') return respond({})
    if (url.pathname.endsWith('/auth/v1/user')) return respond(user)
    if (url.pathname.endsWith('/admin_users')) return respond(role !== 'user' ? [{ user_id: USER }] : [])
    if (url.pathname.endsWith('/quiz_improvements')) {
      if (state.missing) return respond({ code: 'PGRST205', message: 'not found' }, 404)
      if (method === 'GET') {
        state.reads++
        return respond(state.items)
      }
      if (state.failSave) {
        state.failSave = false
        return respond({ code: 'test_unavailable' }, 503)
      }
      const stamp = () => new Date(Date.UTC(2026, 9, 29, 12, 0, ++version)).toISOString()
      if (method === 'POST') {
        const time = stamp()
        const item = {
          ...request.postDataJSON(),
          id: crypto.randomUUID(),
          created_at: time,
          updated_at: time,
        }
        state.items.unshift(item)
        return respond(item, 201)
      }
      const id = url.searchParams.get('id')?.slice(3)
      const item = state.items.find(
        (item) => item.id === id && `eq.${item.updated_at}` === url.searchParams.get('updated_at'),
      )
      if (!item || state.conflict) {
        state.conflict = false
        return respond(null)
      }
      if (method === 'PATCH') {
        Object.assign(item, request.postDataJSON(), { updated_at: stamp() })
        return respond(item)
      }
      if (method === 'DELETE') {
        state.items = state.items.filter((i) => i !== item)
        return respond({ id })
      }
    }
    if (url.pathname.includes('/rest/v1/'))
      return respond(
        url.pathname.endsWith('/user_stats')
          ? { xp: 0, answered: 0, correct: 0, sessions: 0, by_category: {} }
          : [],
      )
    return respond({})
  })
  return state
}

async function fill(page: Page, title = 'Flüsse deutlicher zeichnen') {
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Titel', { exact: true }).fill(title)
  await dialog
    .getByLabel('Verbesserung', { exact: true })
    .fill('Die Karte soll beim Zoomen die Flusslinien stärker anzeigen.')
  await dialog.getByRole('combobox', { name: 'Priorität', exact: true }).selectOption('high')
}

test('Besucher behalten Notizblock und Fehlerreport, erhalten aber kein Entwicklerpanel', async ({
  page,
}) => {
  let reads = 0
  await page.route('**/rest/v1/quiz_improvements**', (route) => {
    reads++
    return route.fulfill({ json: [] })
  })
  await page.goto(round)
  await expect(page.getByRole('button', { name: 'Notizen', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Verbesserung notieren' })).toHaveCount(0)
  await page.locator('.quiz-option').first().click()
  await page.getByRole('button', { name: '⚠ Frage melden', exact: true }).click()
  await expect(page.getByLabel('Verbesserungsvorschlag · Entwickler')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /GitHub/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('developer')
  await expect(page.getByRole('heading', { name: 'Entwicklerrechte erforderlich' })).toBeVisible()
  expect(reads).toBe(0)
})

for (const role of ['user', 'mfa'] as const)
  test(`${role}: keine Freischaltung durch Metadaten oder unvollständige MFA`, async ({ page }) => {
    const state = await backend(page, role)
    await page.goto('developer')
    await expect(page.getByRole('heading', { name: 'Entwicklerrechte erforderlich' })).toBeVisible()
    if (role === 'mfa')
      await expect(page.getByRole('link', { name: 'Zwei-Faktor-Anmeldung abschließen' })).toBeVisible()
    else await expect(page.getByText('Dein Konto hat keine Entwicklerrechte.')).toBeVisible()
    expect(state.reads).toBe(0)
  })

test('Entwickler erfasst im Quiz, bearbeitet und löscht im Panel mit persistentem Quizbezug', async ({
  page,
}, info) => {
  const state = await backend(page)
  await page.goto(round)
  await expect(page).toHaveTitle(/Länderflaggen/)
  await page.getByRole('button', { name: 'Verbesserung notieren' }).click()
  await fill(page)
  await page.getByRole('button', { name: 'Verbesserung speichern', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Verbesserung gespeichert')
  expect(state.items).toHaveLength(1)
  expect(state.items[0].context.questionId).toBeTruthy()
  expect(state.items[0].context.generator).toBeTruthy()
  expect(state.items[0].context.path).toContain('quiz=country-flags')
  await page.getByRole('link', { name: 'Zum Entwicklerpanel' }).click()
  await expect(page.getByRole('heading', { name: 'Flüsse deutlicher zeichnen' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Flüsse deutlicher zeichnen' })).toBeVisible()
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
  await page.getByRole('dialog').getByRole('combobox', { name: 'Status', exact: true }).selectOption('done')
  await page.getByRole('button', { name: 'Änderungen speichern' }).click()
  await expect(page.getByText('Keine passenden Einträge')).toBeVisible()
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('done')
  await expect(page.getByRole('heading', { name: 'Flüsse deutlicher zeichnen' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Suche', exact: true }).fill('Unpassend')
  await expect(page.getByText('Keine passenden Einträge')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Suche', exact: true }).fill('Flüsse')
  await page.getByRole('link', { name: 'Quiz öffnen' }).click()
  await expect(page.locator('.quiz-option').first()).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('searchbox', { name: 'Suche', exact: true })).toHaveValue('Flüsse')
  await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toHaveValue('done')
  await expect(page.getByRole('heading', { name: 'Flüsse deutlicher zeichnen' })).toBeVisible()
  await page.mouse.wheel(0, -2000)
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await page.screenshot({ path: `/tmp/atlas-developer-panel-${info.project.name}.png` })
  await page.getByRole('button', { name: 'Löschen', exact: true }).click()
  await expect(page.getByText('Diesen Eintrag endgültig löschen?')).toBeVisible()
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click()
  expect(state.items).toHaveLength(1)
  await page.getByRole('button', { name: 'Löschen', exact: true }).click()
  await page.getByRole('button', { name: 'Endgültig löschen', exact: true }).click()
  await expect(page.getByText('Noch keine Verbesserungen')).toBeVisible()
  expect(state.items).toHaveLength(0)
})

test('Report-Option erfasst eine Verbesserung und Fehler lassen den Entwurf stehen', async ({
  page,
}, info) => {
  const state = await backend(page)
  await page.goto(round)
  await expect(page.getByRole('button', { name: 'Verbesserung notieren' })).toBeVisible()
  await page.locator('.quiz-option').first().click()
  await page.getByRole('button', { name: '⚠ Frage melden', exact: true }).click()
  await page.getByLabel('Verbesserungsvorschlag · Entwickler').check()
  await fill(page, 'Antworten übersichtlicher machen')
  state.failSave = true
  await page.getByRole('button', { name: 'Verbesserung speichern', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Verbindung prüfen')
  await expect(page.getByRole('dialog').getByLabel('Titel', { exact: true })).toHaveValue(
    'Antworten übersichtlicher machen',
  )
  await page.screenshot({ path: `/tmp/atlas-developer-report-${info.project.name}.png` })
  await page.getByRole('button', { name: 'Verbesserung speichern', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Verbesserung gespeichert')
  expect(state.items[0].context.questionId).toBeTruthy()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('Konflikt überschreibt nichts; fehlende Migration wird verständlich angezeigt', async ({ page }) => {
  const state = await backend(page)
  await page.goto('developer')
  await page.getByRole('button', { name: 'Verbesserung notieren' }).click()
  await fill(page)
  await page.getByRole('button', { name: 'Verbesserung speichern', exact: true }).click()
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Titel', { exact: true }).fill('Neue Fassung')
  state.conflict = true
  await page.getByRole('button', { name: 'Änderungen speichern' }).click()
  await expect(page.getByRole('alert')).toContainText('inzwischen geändert')
  expect(state.items[0].title).toBe('Flüsse deutlicher zeichnen')
  await page.keyboard.press('Escape')
  state.missing = true
  await page.getByRole('button', { name: 'Liste neu laden' }).click()
  await expect(page.getByRole('alert')).toContainText('noch nicht eingerichtet')
})

test('Entwicklerwerkzeuge sind auch in Daily und Story erreichbar und per Escape schließbar', async ({
  page,
}) => {
  await backend(page)
  for (const path of ['daily/flagle', 'story']) {
    await page.goto(path)
    const button = page.getByRole('button', { name: 'Verbesserung notieren' })
    await expect(button).toBeVisible()
    await button.click()
    await expect(page.getByRole('heading', { name: 'Verbesserung notieren', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(button).toBeFocused()
  }
  await page.goto('settings')
  await page.getByRole('link', { name: 'Quiz-Verbesserungen · Entwicklerpanel' }).click()
  await expect(page).toHaveURL(/\/developer$/)
})
