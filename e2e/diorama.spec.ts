import { test, expect, type Page } from '@playwright/test'
import { STORY_LEVELS, type StoryTask } from '../src/features/story/levels'

const KEY = 'atlasfunke.story.levels.v2'
const OLD_KEY = 'atlasfunke.story.atlas-of-winds.v1'

async function seed(page: Page, index: number, taskId?: string) {
  const level = STORY_LEVELS[index]
  const tasks = [
    ...level.tasks.filter((task) => task.required),
    ...level.tasks.filter((task) => !task.required),
  ].slice(0, level.taskCount)
  if (taskId) tasks.sort((a, b) => Number(b.id === taskId) - Number(a.id === taskId))
  const progress = {
    version: 2,
    levels: Object.fromEntries(
      STORY_LEVELS.slice(0, index + 1).map((item, i) => [item.id, { stars: i < index ? 3 : 0, attempts: 1 }]),
    ),
    runs: {
      [level.id]: {
        attempt: 1,
        taskIds: tasks.map((task) => task.id),
        cursor: 0,
        mistakes: 0,
        hints: [],
        rejected: {},
        orders: Object.fromEntries(
          tasks.filter((task) => task.mode === 'order').map((task) => [task.id, [...task.answer].reverse()]),
        ),
        status: 'playing',
      },
    },
  }
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value)
    },
    { key: KEY, value: JSON.stringify(progress) },
  )
}

async function taskOnPage(page: Page, index: number) {
  const panel = page.locator('[data-story-task]')
  await expect(panel).toBeVisible()
  const id = await panel.getAttribute('data-story-task')
  const task = STORY_LEVELS[index].tasks.find((item) => item.id === id)
  if (!task) throw new Error(`Unbekannte Aufgabe ${id}`)
  return task
}
async function answer(page: Page, task: StoryTask) {
  if (task.mode === 'choice')
    await page
      .getByRole('button', { name: task.answer, exact: false })
      .filter({ has: page.locator('b') })
      .click()
  if (task.mode === 'input') {
    await page.getByLabel('Deine Antwort', { exact: true }).fill(task.answer)
    await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  }
  if (task.mode === 'order') {
    for (let target = 0; target < task.answer.length; target++) {
      let items = await page
        .locator('[data-order-item]')
        .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-order-item')))
      while (items.indexOf(task.answer[target]) > target) {
        await page.getByRole('button', { name: `${task.answer[target]} nach oben`, exact: true }).click()
        items = await page
          .locator('[data-order-item]')
          .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-order-item')))
      }
    }
    await page.getByRole('button', { name: 'Reihenfolge prüfen' }).click()
  }
  if (task.mode === 'map') await page.locator(`[data-story-country="${task.answer}"]`).press('Enter')
  if (task.mode === 'features')
    await page.locator(`.feature-map-object[data-id="${task.answer}"]`).press('Enter')
  await expect(page.getByText('Geschafft.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^(Weiter|Level abschließen)$/ }).click()
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
}

test('Acht Level mit Vorschau, klarer Freischaltung und eigenem Spielbildschirm', async ({ page }) => {
  await page.goto('story')
  await expect(page.locator('[data-story-level]')).toHaveCount(8)
  await expect(page.getByRole('heading', { name: 'Der Atlas der Winde', exact: true })).toBeVisible()
  await page.locator('[data-story-route="6"]').click()
  await expect(page.locator('[data-scene="ice"]')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Level noch gesperrt' })).toBeVisible()
  await expect(page.locator('[data-story-task]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Zum aktuellen Level' }).click()
  await expect(page.locator('[data-scene="coast"]')).toBeVisible()
  await taskOnPage(page, 0)
  await expect(page.getByRole('img', { name: '3 von 3 Herzen' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toHaveCount(0)
  await noOverflow(page)
  await page.getByRole('button', { name: 'Zur Karte', exact: true }).click()
  await expect(page.locator('[data-story-route="0"]')).toContainText('Fortsetzen')
  await page.getByRole('button', { name: 'Reisetagebuch', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Reisetagebuch', exact: true })).toBeFocused()
})

test('Die ganze Reise: 46 Prüfungen, acht Umgebungen und 24 Sterne', async ({ page }) => {
  test.setTimeout(240_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('story')
  await page.locator('[data-story-route="0"]').click()
  for (let index = 0; index < STORY_LEVELS.length; index++) {
    const level = STORY_LEVELS[index]
    await expect(page.locator('.story-level-stage')).toHaveAttribute('data-scene', level.biome)
    await expect(page.locator('.story-scene-art')).toHaveAttribute(
      'src',
      new RegExp(`${level.biome}\\.webp$`),
    )
    for (let count = 0; count < level.taskCount; count++) await answer(page, await taskOnPage(page, index))
    await expect(page.locator('[data-story-result="cleared"]')).toBeVisible()
    await expect(page.locator('.story-result .story-stars')).toHaveAttribute('aria-label', '3 von 3 Sternen')
    await noOverflow(page)
    await page
      .getByRole('button', { name: index < 7 ? 'Nächstes Level' : 'Zur Reisekarte', exact: true })
      .click()
  }
  await expect(page.locator('.story-total-stars')).toContainText('24 / 24')
  await page.reload()
  await expect(page.locator('.story-total-stars')).toContainText('24 / 24')
  await page.getByRole('button', { name: 'Reisetagebuch', exact: true }).click()
  await expect(page.locator('.story-journal li.is-found')).toHaveCount(8)
  expect(errors).toEqual([])
})

test('Drei Fehler kosten Herzen, bleiben gespeichert und erlauben einen neuen Versuch', async ({ page }) => {
  await seed(page, 3, 'city-lisbon')
  await page.goto('story?level=flussstadt')
  const original = await taskOnPage(page, 3)
  for (let i = 1; i <= 3; i++) {
    await page.getByLabel('Deine Antwort', { exact: true }).fill(`Falscher Ort ${i}`)
    await page.getByRole('button', { name: 'Antwort prüfen' }).click()
    await expect(page.getByRole('img', { name: `${3 - i} von 3 Herzen` })).toBeVisible()
    if (i === 1) {
      await page.reload()
      await expect(page.getByRole('img', { name: '2 von 3 Herzen' })).toBeVisible()
      expect((await taskOnPage(page, 3)).id).toBe(original.id)
    }
  }
  await expect(page.locator('[data-story-result="failed"]')).toBeVisible()
  await page.getByText('Aus deinen Fehlern lernen', { exact: true }).click()
  await expect(page.locator('.story-review')).toContainText('Lissabon')
  await page.getByRole('button', { name: 'Neu versuchen' }).click()
  await expect(page.getByRole('img', { name: '3 von 3 Herzen' })).toBeVisible()
  await taskOnPage(page, 3)
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).runs.flussstadt.attempt, KEY),
  ).toBe(2)
})

test('Eispass: Reihenfolge über Tasten und Touch, Hinweis und Entwurf bleiben erhalten', async ({
  page,
}, testInfo) => {
  await seed(page, 6, 'summit-order')
  await page.goto('story?level=gipfel')
  const task = await taskOnPage(page, 6)
  await page.getByRole('button', { name: 'Mount Everest nach unten', exact: true }).click()
  const before = await page
    .locator('[data-order-item]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-order-item')))
  await page.getByRole('button', { name: 'Hinweis (1)', exact: true }).click()
  await expect(page.locator('.story-hint')).toBeVisible()
  await page.reload()
  await expect(page.locator('.story-hint')).toBeVisible()
  expect(
    await page
      .locator('[data-order-item]')
      .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-order-item'))),
  ).toEqual(before)
  await expect(page.getByRole('button', { name: 'Hinweis genutzt' })).toBeDisabled()
  await noOverflow(page)
  await page.screenshot({ path: `/tmp/atlas-story-ice-${testInfo.project.name}.png`, fullPage: true })
  await answer(page, task)
  await expect(page.getByRole('progressbar', { name: 'Level-Fortschritt' })).toHaveAttribute(
    'aria-valuenow',
    '1',
  )
})

test('Kartenobjekte sind direkt antippbar und zeigen keine Ländernamen als Antwort', async ({
  page,
}, testInfo) => {
  await seed(page, 6, 'summit-everest-map')
  await page.goto('story?level=gipfel')
  await expect(page.locator('.feature-map-object')).toHaveCount(4)
  const mountain = page.locator('.feature-map-object[data-id="mountain:Q513"] .feature-map-summit')
  if (testInfo.project.name === 'mobile') await mountain.tap()
  else await mountain.click()
  await expect(page.getByText('Geschafft.', { exact: true })).toBeVisible()
  await expect(page.locator('.feature-map-answer-label')).toContainText('Everest')
})

test('Alte Reisen bleiben erhalten, ruhige Bewegung und bestätigtes Zurücksetzen funktionieren', async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, chapters }) => localStorage.setItem(key, JSON.stringify({ version: 1, chapters })),
    {
      key: OLD_KEY,
      chapters: Object.fromEntries(
        STORY_LEVELS.slice(0, 2).map((level) => [level.id, { started: true, solved: 3, collected: true }]),
      ),
    },
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('story')
  await expect(page.locator('.story-page')).toHaveAttribute('data-motion', 'paused')
  await expect(page.locator('.story-total-stars')).toContainText('2 / 24')
  await expect(page.locator('[data-story-route="2"]')).toHaveAttribute('aria-current', 'step')
  await page.getByRole('button', { name: 'Reisetagebuch', exact: true }).click()
  await page.getByRole('button', { name: 'Reise neu beginnen', exact: true }).click()
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click()
  await expect(page.locator('.story-journal li.is-found')).toHaveCount(2)
  await page.getByRole('button', { name: 'Reise neu beginnen', exact: true }).click()
  await page.getByRole('button', { name: 'Ja, Reise zurücksetzen', exact: true }).click()
  await expect(page.locator('.story-total-stars')).toContainText('0 / 24')
  await page.reload()
  await expect(page.locator('.story-total-stars')).toContainText('0 / 24')
})

test('Das Abenteuer funktioniert mit sichtbarem Hinweis auch ohne Browser-Speicherung', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Storage blocked')
    }
  })
  await page.goto('story')
  await expect(
    page.getByRole('status').filter({ hasText: 'Dein Browser kann gerade nicht speichern' }),
  ).toBeVisible()
  await page.screenshot({ path: `/tmp/atlas-story-map-${testInfo.project.name}.png`, fullPage: true })
  await page.locator('[data-story-route="0"]').click()
  const task = await taskOnPage(page, 0)
  await page.screenshot({ path: `/tmp/atlas-story-coast-${testInfo.project.name}.png`, fullPage: true })
  await answer(page, task)
  await expect(page.getByRole('progressbar', { name: 'Level-Fortschritt' })).toHaveAttribute(
    'aria-valuenow',
    '1',
  )
})

test('Ungültige Level-Links führen sicher zur vollständigen Reisekarte', async ({ page }) => {
  await page.goto('story?level=gibt-es-nicht')
  await expect(page).toHaveURL(/\/story$/)
  await expect(page.locator('[data-story-level]')).toHaveCount(8)
  await page.locator('[data-story-route="0"]').click()
  await taskOnPage(page, 0)
  await page.getByRole('button', { name: 'Zur Karte', exact: true }).click()
  await page.goto('story?level=weiterhin-unbekannt')
  await expect(page).toHaveURL(/\/story$/)
  await expect(page.getByRole('button', { name: 'Reisetagebuch', exact: true })).toBeVisible()
})
