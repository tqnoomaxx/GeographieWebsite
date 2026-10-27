import { test, expect } from '@playwright/test'
import { QUIZ_TOPICS } from '../src/config/quizCatalog'

// Browser plugin not available. Validate the built app using the existing Playwright setup.
// Flow: start -> clear topic list -> continent and length -> quiz -> feedback.
test('Die Themenauswahl zeigt jeden Eintrag einmal und behält den Globus auf der Startseite', async ({
  page,
}) => {
  await page.goto('')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Interaktiver Weltatlas')
  await expect(page.locator('.topic-link')).toHaveCount(6)
  await expect(page.getByRole('application', { name: /Interaktive Weltkugel/ })).toBeInViewport({
    ratio: 0.7,
  })
  await page.getByRole('link', { name: 'Quiz auswählen', exact: true }).click()
  await expect(page.locator('.topic-link')).toHaveCount(QUIZ_TOPICS.length)
  const ids = await page
    .locator('.topic-link')
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).dataset.quizTopic))
  expect(new Set(ids).size).toBe(ids.length)
  await expect(page.locator('canvas')).toHaveCount(0)
})

test('Ländersuche öffnet passende Kontinente und ein echtes Länderprofil', async ({ page }) => {
  await page.goto('explore')
  await expect(page.getByRole('link', { name: 'Deutschland', exact: true })).not.toBeVisible()
  await page.getByRole('textbox', { name: 'Land suchen' }).fill('deutsch')
  await page.getByRole('link', { name: 'Deutschland', exact: true }).click()
  await expect(page).toHaveURL(/\/country\/DE$/)
  await expect(page.getByRole('heading', { name: 'Deutschland', exact: true })).toBeVisible()
})

test('Alle Hauptseiten bleiben auf kleinen Bildschirmen ohne seitliches Scrollen lesbar', async ({
  page,
}, info) => {
  for (const route of ['', 'play', 'play/cities', 'learn', 'explore', 'progress', 'daily', 'settings']) {
    await page.goto(route)
    await expect(page.locator('main h1').first()).toBeVisible()
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true)
  }
  if (info.project.name === 'mobile') {
    await page
      .getByRole('navigation', { name: 'Hauptnavigation' })
      .getByRole('link', { name: 'Quiz', exact: true })
      .click()
    await expect(page).toHaveURL(/\/play$/)
  }
})
