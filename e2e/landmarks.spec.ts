import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const landmarks = JSON.parse(readFileSync('public/data/entities/landmarks.json', 'utf8'))
const landmark = (slug: string) =>
  landmarks.find((entity: { id: string }) => entity.id === `landmark:${slug}`)

async function photoFixture(page: Page, slugs: string[]) {
  await page.route('**/data/entities/landmarks.json', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(slugs.map(landmark)),
    }),
  )
}

test('Sehenswürdigkeiten sind nach Land und Weltregion auffindbar', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('explore/landmarks')
  await expect(page.getByRole('heading', { name: 'Berühmte Sehenswürdigkeiten', exact: true })).toBeVisible()
  const search = page.getByRole('searchbox', { name: 'Sehenswürdigkeit oder Land suchen …' })
  await search.fill('Schweiz')
  await expect(page.locator('[data-landmark-grid] > li')).toHaveCount(1)
  await expect(page.locator('[data-landmark-grid]')).toContainText('Schloss Chillon')
  await page.getByRole('combobox', { name: 'Weltregion' }).selectOption('africa')
  await expect(page.getByText('Keine passenden Sehenswürdigkeiten gefunden.')).toBeVisible()
  await search.fill('')
  await expect(page.locator('[data-landmark-grid]')).toContainText('Baobab-Allee')
  await page.getByRole('link', { name: /Baobab-Allee/ }).click()
  await expect(page).toHaveURL(/landmark\/avenue-baobabs$/)
  await expect(page.locator('main img[alt="Baobab-Allee"]')).toBeVisible()
  expect(errors).toEqual([])
})

test('Towers show real photographs with the entire portrait visible', async ({ page }) => {
  for (const slug of ['cn-tower', 'petronas-towers', 'taipei-101', 'palacio-salvo']) {
    await page.goto(`landmark/${slug}`)
    const item = landmark(slug)
    const photo = page.getByRole('img', { name: item.names.de, exact: true })
    await expect(photo).toHaveAttribute('src', new RegExp(item.media[0].url))
    await photo.evaluate((image: HTMLImageElement) => image.decode())
    expect(await photo.evaluate((image: HTMLImageElement) => image.naturalHeight)).toBeGreaterThan(400)
    await expect(photo).toHaveCSS('object-fit', 'contain')
    expect(item.media[0].source_url).not.toMatch(/logo|\.svg$/i)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  }
})

test('Bildquiz uses updated photos and reveals the correct source after answering', async ({ page }) => {
  const slugs = ['cn-tower', 'petronas-towers', 'taipei-101', 'palacio-salvo']
  await photoFixture(page, slugs)
  await page.goto('play/landmarks/round?mode=image_to_landmark&scope=world&len=all&repeat=0')
  const question = page.locator('[data-generator="image_to_landmark"]')
  await expect(question).toBeVisible()
  const answer = (await question.getAttribute('data-answer'))!
  const item = landmarks.find((entity: { id: string }) => entity.id === answer)
  const image = page.locator('.quiz-prompt-media img')
  await image.evaluate((image: HTMLImageElement) => image.decode())
  await expect(image).toHaveAttribute('src', new RegExp(item.media[0].url))
  await page.getByRole('button', { name: item.names.de, exact: true }).click()
  await expect(page.locator('.quiz-feedback')).toContainText('Richtig')
  await expect(page.locator('.quiz-prompt-media figcaption')).toContainText(item.media[0].license)
})

test('Bildle reveals the complete photo after solving, including a tall tower', async ({ page }) => {
  await photoFixture(page, ['cn-tower'])
  await page.goto('daily/bildle?practice=full-tower')
  await page.getByRole('textbox', { name: 'Raten' }).fill('CN Tower')
  await page.getByRole('button', { name: 'Raten', exact: true }).click()
  await expect(page.locator('.daily-result.is-solved')).toBeVisible()
  await expect(page.locator('img[alt="Sehenswürdigkeit, teilweise verdeckt"]')).toHaveCSS(
    'object-fit',
    'contain',
  )
})

test('A corrupt photo shows a readable fallback while the landmark facts remain available', async ({
  page,
}) => {
  await page.route('**/media/photos/landmarks/cn-tower*.webp', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/webp',
      body: 'corrupt image',
    }),
  )
  await page.goto('landmark/cn-tower')
  await expect(page.locator('[data-photo-fallback]')).toContainText('Foto momentan nicht verfügbar.')
  await expect(page.locator('.landmark-fact-list li')).toHaveCount(3)
  await expect(page.getByRole('heading', { name: /CN Tower/ })).toBeVisible()
})

test('Online data refresh replaces a stale offline landmark catalog', async ({ page }) => {
  await page.goto('explore/landmarks')
  await expect(page.locator('[data-landmark-grid] > li')).toHaveCount(landmarks.length)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await page.evaluate(
    async (oldCatalog) => {
      const cache = await caches.open('geo-data')
      const url = new URL('data/entities/landmarks.json', document.baseURI).href
      await cache.put(
        url,
        new Response(JSON.stringify(oldCatalog), { headers: { 'Content-Type': 'application/json' } }),
      )
    },
    [landmark('cn-tower')],
  )
  await page.reload()
  await expect(page.locator('[data-landmark-grid] > li')).toHaveCount(landmarks.length)
})
