import { expect, type Page } from '@playwright/test'

/** Zusätzliche Fragetypen liegen seit der vereinfachten Auswahl hinter einem Disclosure. */
export async function openQuizSettings(page: Page) {
  if (!/\/play\/[^/]+\/?$/.test(new URL(page.url()).pathname)) return
  const settings = page.locator('.simple-advanced')
  await expect(settings).toBeAttached()
  if (!(await settings.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await settings.locator('summary').click()
  }
}
export async function openAtlas(page: Page) {
  await page.locator('.atlas-disclosure > summary').click()
}
