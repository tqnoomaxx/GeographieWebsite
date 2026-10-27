import { test, expect, type Page } from '@playwright/test'
import { OrthographicCamera, Vector3 } from 'three'
import { fitDioramaCamera } from '../src/features/play/dioramaGeometry'

// Pick visible model surfaces, rather than bypassing the WebGL hit testing with DOM events.
const surfaces: Record<string, [number, number, number]> = {
  trivia: [-1.8, 2.12, -2.65],
  daily: [-6.45, 1, -2.45],
  countries: [-4.55, 1.35, 0.1],
  mixed: [-3.2, 0.28, 3.75],
  capitals: [1.1, 1.7, 0.05],
  cities: [2.3, 0.8, 1.35],
  landmarks: [5.35, 1.65, 1.75],
  languages: [5.9, 1.4, -1],
  flags: [7.3, 2.35, -3.5],
  nature: [2.7, 2, -4.07],
  license_plates: [-5.88, 0.8, 2.49],
  water: [0.15, 0.15, 3.7],
}

async function surfacePoint(page: Page, id: string) {
  await expect(page.locator('.quiz-diorama-3d')).toHaveAttribute('aria-busy', 'false')
  const canvas = page.locator('.quiz-diorama-3d canvas')
  await expect(canvas).toBeVisible()
  const bounds = (await canvas.boundingBox())!
  const camera = new OrthographicCamera(
    -bounds.width / 2,
    bounds.width / 2,
    bounds.height / 2,
    -bounds.height / 2,
    0.1,
    80,
  )
  fitDioramaCamera(camera, bounds.width, bounds.height)
  const point = new Vector3(...surfaces[id]).project(camera)
  return {
    x: bounds.x + ((point.x + 1) * bounds.width) / 2,
    y: bounds.y + ((1 - point.y) * bounds.height) / 2,
  }
}

test('Jedes 3D-Modell wählt die richtige Quizstation', async ({ page, isMobile }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('play?view=diorama')
  await page.locator('.quiz-diorama-3d').scrollIntoViewIfNeeded()
  await expect.poll(() => page.locator('.quiz-diorama-3d canvas').count()).toBe(1)
  await expect(page.locator('.quiz-diorama-3d canvas')).toHaveAttribute('width', /[1-9]\d+/)
  for (const id of Object.keys(surfaces)) {
    const point = await surfacePoint(page, id)
    if (isMobile) await page.touchscreen.tap(point.x, point.y)
    else await page.mouse.move(point.x, point.y)
    await expect(page.locator('.quiz-diorama-3d')).toHaveAttribute('data-active-station', id)
    await expect(page).toHaveURL(/\/play(?:\?view=diorama)?$/)
  }
  expect(errors).toEqual([])
})

test('Die Auswahl bleibt bis zur Konfiguration erreichbar und lässt sich schließen', async ({ page }) => {
  await page.goto('play?view=diorama')
  const countries = page.locator('[data-quiz-station="countries"]')
  await countries.focus()
  await page.mouse.move(2, 2)
  await page.locator('.quiz-diorama-context a').focus()
  await expect(page.locator('.quiz-diorama-3d')).toHaveAttribute('data-active-station', 'countries')
  await page.locator('.quiz-diorama-context a').press('Escape')
  await expect(page.locator('.quiz-diorama-3d')).not.toHaveAttribute('data-active-station')
  await countries.focus()
  await page.locator('.quiz-diorama-context a').click()
  await expect(page).toHaveURL(/\/play\/countries$/)
  await expect(page.locator('[data-exercise="country-map"]')).toBeVisible()
})

test('Direkter 3D-Klick und zweites Antippen öffnen das passende Quiz', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('play?view=diorama')
  await page.locator('.quiz-diorama-3d').scrollIntoViewIfNeeded()
  const point = await surfacePoint(page, 'countries')
  if (isMobile) {
    await page.touchscreen.tap(point.x, point.y)
    await expect(page.locator('.quiz-diorama-3d')).toHaveAttribute('data-active-station', 'countries')
    await page.touchscreen.tap(point.x, point.y)
  } else await page.mouse.click(point.x, point.y)
  await expect(page).toHaveURL(/\/play\/countries$/)
})

test('Langsam ladende Globustexturen unterbrechen die Tastaturbedienung nicht', async ({ page }) => {
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  let requested!: () => void
  const request = new Promise<void>((resolve) => {
    requested = resolve
  })
  await page.route('**/media/illustrations/diorama-globe.svg', async (route) => {
    requested()
    await pending
    await route.continue()
  })
  await page.goto('play?view=diorama', { waitUntil: 'domcontentloaded' })
  await request
  try {
    await page.locator('[data-quiz-station="countries"]').focus()
    const configure = page.locator('.quiz-diorama-context a')
    await expect(configure).toBeVisible()
    await configure.focus()
    await expect(configure).toBeFocused()
    await configure.press('Escape')
    await expect(page.locator('.quiz-diorama-3d')).not.toHaveAttribute('data-active-station')
    await expect(page.locator('.quiz-diorama-dock')).toBeVisible()
  } finally {
    release()
  }
})

test('Alle mobilen Schnellzugriffe sind ohne horizontales Scrollen sichtbar', async ({ page, isMobile }) => {
  test.skip(!isMobile)
  await page.goto('play?view=diorama')
  await page.locator('.quiz-diorama-3d').scrollIntoViewIfNeeded()
  const dock = page.locator('.quiz-diorama-dock')
  const bounds = (await dock.boundingBox())!
  for (const link of await dock.getByRole('link').all()) {
    const box = (await link.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(bounds.x)
    expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width)
    expect(box.height).toBeGreaterThanOrEqual(44)
    await expect(link).toBeInViewport()
  }
  await page.locator('[data-quiz-station="daily"]').tap()
  await expect(page).toHaveURL(/\/daily$/)
})

test('Tag und Nacht sowie Drehen, Zoomen und Zurücksetzen bleiben bedienbar', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('play?view=diorama')
  const world = page.locator('.quiz-diorama-3d')
  await world.scrollIntoViewIfNeeded()
  await expect(world).toHaveAttribute('aria-busy', 'false')
  await expect(world).toHaveAttribute('data-time', 'day')
  await expect(world).toHaveAttribute('data-motion', 'paused')
  await page.getByRole('button', { name: 'Ansicht nach rechts drehen' }).click()
  await expect(world).not.toHaveAttribute('data-view-angle', '0.000')
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click()
  await expect(world).toHaveAttribute('data-view-zoom', '1.15')
  await page.getByRole('button', { name: 'Ansicht zurücksetzen' }).click()
  await expect(world).toHaveAttribute('data-view-angle', '0.000')
  await expect(world).toHaveAttribute('data-view-zoom', '1.00')
  await world.screenshot({ path: `/tmp/atlas-island-${info.project.name}-day.png` })
  await page.getByRole('button', { name: 'Nachtmodus' }).click()
  await expect(world).toHaveAttribute('data-time', 'night')
  await expect(page.getByRole('button', { name: 'Nachtmodus' })).toHaveAttribute('aria-pressed', 'true')
  await world.screenshot({ path: `/tmp/atlas-island-${info.project.name}-night.png` })
  await page.reload()
  await world.scrollIntoViewIfNeeded()
  await expect(world).toHaveAttribute('data-time', 'night')
  await page.locator('[data-quiz-station="cities"]').focus()
  await expect(page.locator('.quiz-diorama-context')).toContainText('Städte')
  await page.locator('.quiz-diorama-context a').click()
  await expect(page).toHaveURL(/\/play\/cities$/)
  await expect(page.locator('[data-exercise="large-cities"]')).toBeVisible()
  expect(errors).toEqual([])
})

test('Kamerazoom bleibt begrenzt und die einfache Auswahl lädt ohne WebGL-Szene', async ({ page }) => {
  await page.goto('play?view=diorama')
  const world = page.locator('.quiz-diorama-3d')
  for (let i = 0; i < 8; i++) {
    const button = page.getByRole('button', { name: 'Vergrößern', exact: true })
    if (await button.isEnabled()) await button.click()
  }
  await expect(page.getByRole('button', { name: 'Vergrößern', exact: true })).toBeDisabled()
  await expect(world).toHaveAttribute('data-view-zoom', '1.65')
  for (let i = 0; i < 10; i++) {
    const button = page.getByRole('button', { name: 'Verkleinern', exact: true })
    if (await button.isEnabled()) await button.click()
  }
  await expect(page.getByRole('button', { name: 'Verkleinern', exact: true })).toBeDisabled()
  await expect(world).toHaveAttribute('data-view-zoom', '0.75')
  await page.goto('play')
  await expect(page.locator('.topic-link')).toHaveCount(12)
  await expect(page.locator('canvas')).toHaveCount(0)
})

test('Die große Insel bietet Vollbild und hält ihre Animationen wirklich an', async ({ page, isMobile }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  if (isMobile) {
    // The CSS fallback also covers browsers without the native Fullscreen API.
    await page.addInitScript(() =>
      Object.defineProperty(Element.prototype, 'requestFullscreen', { value: undefined }),
    )
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('play?view=diorama')
  const world = page.locator('.quiz-diorama-3d')
  await expect(world).toHaveAttribute('aria-busy', 'false')
  await expect(world).toHaveAttribute('data-motion', 'running')
  const initial = (await world.boundingBox())!
  expect(initial.width).toBeGreaterThan(page.viewportSize()!.width * 0.9)
  expect(initial.height).toBeGreaterThan(page.viewportSize()!.height * 0.7)
  await page.getByRole('button', { name: 'Vollbild öffnen', exact: true }).click()
  await expect(world).toHaveAttribute('data-expanded', 'true')
  await expect
    .poll(async () => Math.round((await world.boundingBox())!.height))
    .toBe(page.viewportSize()!.height)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Animationen pausieren' }).click()
  await expect(world).toHaveAttribute('data-motion', 'paused')
  const canvas = world.locator('canvas')
  const still = await canvas.screenshot()
  await page.waitForTimeout(180)
  expect((await canvas.screenshot()).equals(still)).toBe(true)
  await page.getByRole('button', { name: 'Animationen fortsetzen' }).click()
  await expect(world).toHaveAttribute('data-motion', 'running')
  const animated = await canvas.screenshot()
  await page.waitForTimeout(180)
  expect((await canvas.screenshot()).equals(animated)).toBe(false)
  await page.getByRole('button', { name: 'Ansicht nach rechts drehen' }).click()
  await expect(world).toHaveAttribute('data-camera', 'still')
  await page.getByRole('button', { name: 'Vollbild schließen', exact: true }).click()
  await expect(world).toHaveAttribute('data-expanded', 'false')
  await page.getByRole('button', { name: 'Animationen pausieren' }).click()
  await page.reload()
  await expect(world).toHaveAttribute('data-motion', 'paused')
  await expect(page.getByRole('button', { name: 'Animationen fortsetzen' })).toBeVisible()
  expect(errors).toEqual([])
})
