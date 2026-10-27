import { test, expect } from '@playwright/test'

test('Ziehen per Maus oder Touch behält die Ausrichtung und erlaubt danach die Länderauswahl', async ({
  page,
  isMobile,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('')
  const globe = page.getByRole('application', { name: /Interaktive Weltkugel/ })
  const germany = page.locator('.globe-country[data-country-id="country:DE"]')
  await expect(germany).toHaveAttribute('d', /M/)
  await globe.scrollIntoViewIfNeeded()
  const initialPath = await germany.getAttribute('d')
  const bounds = (await globe.boundingBox())!
  const x = bounds.x + bounds.width / 2
  const y = bounds.y + bounds.height / 2
  if (isMobile) {
    const touch = await page.context().newCDPSession(page)
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y }],
    })
    for (let step = 1; step <= 16; step++) {
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + step * 4, y: y + step }],
      })
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await touch.detach()
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 64, y + 16, { steps: 16 })
    await page.mouse.up()
  }
  await expect(germany).not.toHaveAttribute('d', initialPath!)
  await expect(page.locator('.country-quiz-panel')).toHaveCount(0)
  const rotatedPath = await germany.getAttribute('d')
  await globe.focus()
  await page.mouse.move(2, 2)
  await expect(germany).toHaveAttribute('d', rotatedPath!)
  await globe.press('ArrowRight')
  await expect(germany).not.toHaveAttribute('d', rotatedPath!)
  await page.getByLabel('Land suchen oder auswählen').selectOption('country:JP')
  await expect(page.locator('.country-quiz-panel').getByRole('heading', { name: 'Japan' })).toBeVisible()
  await expect(page.locator('.globe-country[data-country-id="country:JP"]')).toHaveAttribute('d', /M/)
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})
