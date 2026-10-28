import { test, expect, type Locator, type Page } from '@playwright/test'

async function clickShape(page: Page, target: Locator, mobile: boolean) {
  await target.scrollIntoViewIfNeeded()
  const point = await target.evaluate((node) => {
    const shape = node.querySelector<SVGGeometryElement>('.feature-map-shape, .feature-map-summit')!
    const matrix = shape.getScreenCTM()!
    const bounds = shape.getBBox()
    for (let row = 1; row < 10; row++)
      for (let col = 1; col < 10; col++) {
        const local = new DOMPoint(
          bounds.x + (bounds.width * col) / 10,
          bounds.y + (bounds.height * row) / 10,
        )
        if (!shape.isPointInFill(local)) continue
        const screen = local.matrixTransform(matrix)
        if (document.elementFromPoint(screen.x, screen.y)?.closest('[data-id]') === node)
          return { x: screen.x, y: screen.y }
      }
    for (let i = 1; i < 100; i++) {
      const local = shape.getPointAtLength((shape.getTotalLength() * i) / 100)
      const screen = new DOMPoint(local.x, local.y).matrixTransform(matrix)
      if (document.elementFromPoint(screen.x, screen.y)?.closest('[data-id]') === node)
        return { x: screen.x, y: screen.y }
    }
    throw new Error('Kein direkt anklickbarer Punkt auf ' + node.getAttribute('data-id'))
  })
  if (mobile) await page.touchscreen.tap(point.x, point.y)
  else await page.mouse.click(point.x, point.y)
}

for (const fixture of [
  {
    type: 'river',
    category: 'water',
    exercise: 'river-country',
    id: 'river:Q584',
    name: 'Rhein',
    scope: 'europe',
  },
  {
    type: 'lake',
    category: 'water',
    exercise: 'lake-country',
    id: 'lake:Q5484',
    name: 'Kaspisches Meer',
    scope: 'world',
  },
  {
    type: 'mountain',
    category: 'nature',
    exercise: 'mountain-country',
    id: 'mountain:Q513',
    name: 'Mount Everest',
    scope: 'asia',
  },
])
  test(`${fixture.name} wird direkt auf seinem Kartenobjekt ausgewählt`, async ({ page, isMobile }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto(
      `play/${fixture.category}/round?quiz=${fixture.exercise}&mode=map&scope=${fixture.scope}&len=1&repeat=0&only=${fixture.id}`,
    )
    const question = page.locator('[data-question-type]')
    const map = page.locator('[data-feature-map]')
    await expect(question).toHaveAttribute('data-answer', fixture.id)
    await expect(map).toHaveAttribute('data-feature-map', fixture.type)
    expect(await map.locator('[data-feature-type]').count()).toBeGreaterThanOrEqual(4)
    await expect(map.locator('[data-id^="country:"]')).toHaveCount(0)
    await expect(map.locator('[data-context-country]').first()).not.toHaveAttribute('role', 'button')
    await expect(page.getByRole('heading', { level: 1 })).not.toContainText('In welchem Land')
    await expect(map.locator('svg').first()).toBeVisible()
    expect(
      await map
        .locator('[data-feature-type]')
        .evaluateAll((nodes) =>
          nodes.every(
            (node) => node.getAttribute('data-feature-type') === nodes[0].getAttribute('data-feature-type'),
          ),
        ),
    ).toBe(true)

    const wrong = map.locator(`[data-feature-type]:not([data-id="${fixture.id}"])`).first()
    await clickShape(page, wrong, isMobile)
    await expect(wrong).toHaveClass(/is-wrong/)
    await expect(page.locator('.quiz-feedback')).toHaveCount(0)
    await page.getByRole('button', { name: 'Hineinzoomen', exact: true }).click()
    await expect(map.locator('.map-viewport')).toHaveAttribute('data-map-zoom', '1.50')
    await page.getByRole('button', { name: 'Karte zurücksetzen', exact: true }).click()
    await expect(map.locator('.map-viewport')).toHaveAttribute('data-map-zoom', '1.00')

    await clickShape(page, map.locator(`[data-id="${fixture.id}"]`), isMobile)
    await expect(map.locator(`[data-id="${fixture.id}"]`)).toHaveClass(/is-correct/)
    await expect(page.locator('.quiz-feedback')).toContainText(fixture.name)
    await expect(page.locator('.feature-map-answer-label')).toHaveText(fixture.name)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })

test('Die Übung erklärt die direkte Karte und startet sie über die Auswahl', async ({ page }) => {
  await page.goto('play/nature?quiz=mountain-country')
  await page.getByRole('button', { name: 'Karte', exact: true }).click()
  await expect(page.locator('.exercise-setup-heading')).toContainText('Gipfelmarkierung')
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page.locator('[data-feature-map="mountain"]')).toBeVisible()
})

test('Länderflächen lösen keine Flussantwort aus, Tastatur kann den Fluss wählen', async ({ page }) => {
  await page.goto('play/water/round?mode=on_map&scope=europe&len=1&repeat=0&only=river:Q584')
  const map = page.locator('[data-feature-map="river"]')
  const countries = map.locator('.feature-map-countries')
  await countries.waitFor()
  const point = await countries.evaluate((group) => {
    for (const path of group.querySelectorAll<SVGGeometryElement>('path')) {
      const bounds = path.getBBox(),
        matrix = path.getScreenCTM()!
      for (let row = 1; row < 10; row++)
        for (let col = 1; col < 10; col++) {
          const local = new DOMPoint(
            bounds.x + (bounds.width * col) / 10,
            bounds.y + (bounds.height * row) / 10,
          )
          if (!path.isPointInFill(local)) continue
          const screen = local.matrixTransform(matrix)
          const hit = document.elementFromPoint(screen.x, screen.y)
          if (hit?.closest('svg') && !hit.closest('[data-id], [data-feature-hit-id]'))
            return { x: screen.x, y: screen.y }
        }
    }
    throw new Error('Keine freie Landfläche gefunden')
  })
  await page.mouse.click(point.x, point.y)
  await expect(map.locator('.is-wrong')).toHaveCount(0)
  await expect(page.locator('.quiz-feedback')).toHaveCount(0)
  const target = map.locator('[data-id="river:Q584"]')
  await target.focus()
  await target.press('Enter')
  await expect(page.locator('.quiz-feedback')).toContainText('Rhein')
})

test('Kartenfehler lassen sich laden und Länderflaggen behalten ihre Länderkarte', async ({ page }) => {
  let fail = true
  await page.route('**/data/geo/world.json', (route) =>
    fail ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue(),
  )
  await page.goto('play/nature/round?mode=on_map&scope=world&len=1&repeat=0&only=mountain:Q513')
  await expect(page.getByRole('alert')).toContainText('Karte konnte nicht geladen')
  fail = false
  await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click()
  await expect(page.locator('[data-feature-type="mountain"]').first()).toBeVisible()
  await page.goto('play/flags/round?quiz=country-flags&mode=map&scope=world&len=1&repeat=0&only=country:DE')
  await expect(page.locator('[data-question-type]')).toHaveAttribute('data-answer', 'country:DE')
  await expect(page.locator('[data-id="country:DE"]')).toHaveAttribute('role', 'button')
  await expect(page.locator('[data-feature-map]')).toHaveCount(0)
})
