import { expect, type Page } from '@playwright/test'

/** Shared training preferences are optional; unrelated pages have no quiz controls. */
export async function openQuizSettings(page: Page) {
  const settings = page.locator('.training-options')
  if (
    (await settings.count()) &&
    !(await settings.evaluate((element) => (element as HTMLDetailsElement).open))
  )
    await settings.locator('summary').click()
}
export async function openAtlas(page: Page) {
  await expect(page.getByRole('application', { name: /Interaktive Weltkugel/ })).toBeVisible()
}
