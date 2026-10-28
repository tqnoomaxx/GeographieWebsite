import { test, expect, type Page } from '@playwright/test'
import { OrthographicCamera, Vector3 } from 'three'
import { STORY_CHAPTERS } from '../src/features/story/chapters'
import { STORY_STORAGE_KEY } from '../src/features/story/storyProgress'
import { fitDioramaCamera } from '../src/features/play/dioramaGeometry'

async function solveChapter(page: Page, index: number) {
  const chapter = STORY_CHAPTERS[index]
  await page
    .getByRole('button', { name: index === 0 ? 'Abenteuer beginnen' : 'Kapitel beginnen', exact: true })
    .click()
  for (const [taskIndex, task] of chapter.tasks.entries()) {
    await expect(page.locator('.story-task-prompt')).toHaveText(task.prompt)
    await page
      .getByRole('group', { name: 'Deine Antwort', exact: true })
      .getByRole('button')
      .nth(task.answer)
      .click()
    await expect(page.locator('.story-feedback')).toContainText(task.explanation)
    const next = page.getByRole('button', {
      name: taskIndex === chapter.tasks.length - 1 ? 'Fundstück entdecken' : 'Der Spur folgen',
      exact: true,
    })
    if (page.viewportSize()!.width < 600) {
      const mobileNav = page.locator('.mobile-nav')
      await expect
        .poll(async () => {
          const button = (await next.boundingBox())!
          const nav = (await mobileNav.boundingBox())!
          return button.y + button.height <= nav.y
        })
        .toBe(true)
    }
    await next.click()
  }
  await expect(page.locator('.story-artifact')).toContainText(chapter.artifact)
  await page
    .getByRole('button', {
      name: index === 7 ? 'Den Atlas vollenden' : 'Ins Reisetagebuch legen',
      exact: true,
    })
    .click()
}

test('Alle acht Kapitel sind spielbar, speichern Fundstücke und erreichen ein echtes Ende', async ({
  page,
}) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('story')
  for (let i = 0; i < STORY_CHAPTERS.length; i++) {
    await solveChapter(page, i)
    await expect(page.locator(`[data-journey-chapter="${i}"]`)).toHaveAccessibleName(/abgeschlossen/)
    if (i < 7)
      await expect(page.locator('.story-panel')).toHaveAttribute(
        'data-story-chapter',
        STORY_CHAPTERS[i + 1].id,
      )
  }
  await expect(page.locator('.story-complete-note')).toContainText('Abenteuer abgeschlossen')
  await page.reload()
  await expect(page.locator('.story-complete-note')).toContainText('Abenteuer abgeschlossen')
  await page.getByRole('button', { name: 'Reisetagebuch', exact: true }).click()
  const journal = page.getByRole('dialog')
  await expect(journal).toBeVisible()
  await expect(journal.locator('li.is-found')).toHaveCount(8)
  await expect(journal).toContainText('Der Atlas der Winde')
  await journal.getByRole('button', { name: 'Reise neu beginnen' }).click()
  await journal.getByRole('button', { name: 'Abbrechen', exact: true }).click()
  await expect(journal.locator('li.is-found')).toHaveCount(8)
  await journal.getByRole('button', { name: 'Reise neu beginnen' }).click()
  await journal.getByRole('button', { name: 'Ja, neu beginnen', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Abenteuer beginnen', exact: true })).toBeVisible()
  await expect(page.locator('[data-journey-chapter="1"]')).toHaveAccessibleName(/verschlossen/)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Abenteuer beginnen', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('Falsche Antworten geben Hinweise, Fortschritt überlebt Neuladen, spätere Kapitel bleiben gesperrt', async ({
  page,
}) => {
  await page.goto('story')
  await page.locator('[data-journey-chapter="3"]').click()
  await expect(page.locator('.story-locked')).toContainText('Dieser Ort wartet noch auf dich')
  await expect(page.getByRole('button', { name: 'Kapitel beginnen', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Weiter mit Kapitel 1' }).click()
  await page.getByRole('button', { name: 'Abenteuer beginnen', exact: true }).click()
  await page.getByRole('button', { name: 'Mira um einen Hinweis bitten' }).click()
  await expect(page.locator('.story-hint')).toContainText('Im Osten')
  await page.getByRole('group', { name: 'Deine Antwort' }).getByRole('button').nth(0).click()
  await expect(page.locator('.story-feedback')).toContainText('Versuche es noch einmal')
  await page.getByRole('group', { name: 'Deine Antwort' }).getByRole('button').nth(1).click()
  await expect(page.locator('.story-feedback')).toContainText('Spur gefunden')
  await page.reload()
  await expect(page.locator('.story-task-prompt')).toHaveText(STORY_CHAPTERS[0].tasks[1].prompt)
  await expect(page.locator('[data-journey-chapter="1"]')).toHaveAccessibleName(/verschlossen/)
})

test('Die Karte wählt Kapitel, dreht und zoomt; der Nachtmodus bleibt gespeichert', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('play?view=diorama')
  await expect(page).toHaveURL(/\/story$/)
  const world = page.locator('.quiz-diorama-3d')
  await expect(world).toHaveAttribute('aria-busy', 'false')
  await expect(world).toHaveAttribute('data-motion', 'paused')
  await page.getByRole('button', { name: 'Ansicht nach rechts drehen' }).click()
  await expect(world).not.toHaveAttribute('data-view-angle', '0.000')
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click()
  await expect(world).toHaveAttribute('data-view-zoom', '1.15')
  await page.getByRole('button', { name: 'Ansicht zurücksetzen' }).click()
  await expect(world).toHaveAttribute('data-view-angle', '0.000')
  await page.getByRole('button', { name: 'Nachtmodus', exact: true }).click()
  await expect(world).toHaveAttribute('data-time', 'night')
  await page.reload()
  await expect(world).toHaveAttribute('data-time', 'night')
  await page.getByRole('button', { name: 'Ort 7:', exact: false }).click()
  await expect(page.locator('.story-panel')).toHaveAttribute('data-story-chapter', 'gipfel')
  await expect(page.locator('.story-locked')).toBeVisible()
  if (isMobile) await expect(page.locator('.story-panel h2')).toBeInViewport()
  await page.locator('[data-story-route="0"]').click()
  await expect(page.getByRole('button', { name: 'Abenteuer beginnen', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('Ohne WebGL ist die gesamte Geschichte weiterhin spielbar', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return original.call(this, type as '2d', ...(args as []))
    } as typeof HTMLCanvasElement.prototype.getContext
  })
  await page.goto('story')
  await expect(page.locator('.story-island-fallback')).toBeVisible()
  await solveChapter(page, 0)
  await expect(page.locator('.story-panel')).toHaveAttribute('data-story-chapter', 'kartenhaus')
})

test('Auch das 3D-Modell selbst öffnet ein Kapitel statt eines Quiz', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('story')
  const world = page.locator('.quiz-diorama-3d')
  await expect(world).toHaveAttribute('aria-busy', 'false')
  await world.scrollIntoViewIfNeeded()
  const bounds = (await world.locator('canvas').boundingBox())!
  const camera = new OrthographicCamera(
    -bounds.width / 2,
    bounds.width / 2,
    bounds.height / 2,
    -bounds.height / 2,
    0.1,
    80,
  )
  fitDioramaCamera(
    camera,
    bounds.width,
    bounds.height,
    undefined,
    bounds.width < 750 ? { top: 70, bottom: 70, side: 20 } : undefined,
  )
  const point = new Vector3(7.3, 2.35, -3.5).project(camera)
  const x = bounds.x + ((point.x + 1) * bounds.width) / 2
  const y = bounds.y + ((1 - point.y) * bounds.height) / 2
  if (isMobile) {
    await page.touchscreen.tap(x, y)
    await expect(world).toHaveAttribute('data-active-station', 'flags')
    await page.touchscreen.tap(x, y)
  } else await page.mouse.click(x, y)
  await expect(page.locator('.story-panel')).toHaveAttribute('data-story-chapter', 'signale')
  await expect(page.locator('.story-locked')).toBeVisible()
  await expect(page).toHaveURL(/\/story$/)
})

test('Fehlerhafte Spielstände und gesperrter Speicher unterbrechen keine Reise', async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, '{broken')
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Unavailable', 'QuotaExceededError')
      original.call(this, name, value)
    }
  }, STORY_STORAGE_KEY)
  await page.goto('story')
  await expect(page.locator('.story-save-note')).toContainText('nicht speichern')
  await page.getByRole('button', { name: 'Abenteuer beginnen', exact: true }).click()
  await expect(page.locator('.story-task-prompt')).toBeVisible()
})

test('Das Tagebuch hält den Tastaturfokus und schließt mit Escape', async ({ page }) => {
  await page.goto('story')
  const open = page.getByRole('button', { name: 'Reisetagebuch', exact: true })
  await open.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(open).toBeFocused()
})
