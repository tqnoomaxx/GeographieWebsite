import { test, expect, type Page } from '@playwright/test'
import { INVESTIGATIONS, INVESTIGATION_STORAGE_KEY } from '../src/features/story/investigations'

const noOverflow = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
async function mobileSurface(page: Page, name: 'map' | 'evidence') {
  const tabs = page.getByRole('navigation', { name: 'Arbeitsfläche' })
  if (await tabs.isVisible())
    await tabs
      .getByRole('button', { name: name === 'map' ? /Karte & Markierungen/ : /Unterlagen & Belege/ })
      .click()
}
async function pin(page: Page, index: number, targetIndex: number) {
  const file = INVESTIGATIONS[index],
    target = file.targets[targetIndex]
  await mobileSurface(page, 'map')
  await page.getByRole('button', { name: new RegExp(`^${targetIndex + 1}.*${target.label}`) }).click()
  const coordinates = page.locator('.investigation-coordinates')
  if ((await coordinates.getAttribute('open')) === null) await coordinates.locator('summary').click()
  await page.getByLabel('Breitengrad', { exact: true }).fill(String(target.location.lat).replace('.', ','))
  await page.getByLabel('Längengrad', { exact: true }).fill(String(target.location.lon).replace('.', ','))
  await page.getByRole('button', { name: 'Markierung setzen', exact: true }).click()
  await expect(page.locator(`[data-case-pin="${target.id}"]`)).toBeVisible()
}
async function evidence(page: Page, index: number, id: string) {
  await mobileSurface(page, 'evidence')
  const file = INVESTIGATIONS[index],
    itemIndex = file.evidence.findIndex((item) => item.id === id)
  await page
    .getByRole('tab', { name: `Unterlage ${itemIndex + 1}: ${file.evidence[itemIndex].title}`, exact: true })
    .click()
  await expect(page.getByRole('tabpanel')).toContainText(file.evidence[itemIndex].title)
}
async function solve(page: Page, index: number) {
  const file = INVESTIGATIONS[index]
  await expect(page.locator(`[data-case="${file.id}"]`)).toBeVisible()
  await expect(page.getByRole('group', { name: `Ermittlungskarte ${file.region}` })).toBeVisible()
  for (let i = 0; i < file.targets.length; i++) await pin(page, index, i)
  for (const id of file.proof) {
    await evidence(page, index, id)
    await page.getByLabel('Als Beleg verwenden', { exact: true }).check()
  }
  await evidence(page, index, file.reject!.id)
  await page.getByLabel('Enthält die falsche Schlussfolgerung', { exact: true }).check()
  if (file.calculation)
    await page.getByLabel(file.calculation.label, { exact: true }).fill(String(file.calculation.answer))
  await page.getByRole('button', { name: 'Schlussfolgerung prüfen', exact: true }).click()
  await expect(page.locator('[data-investigation-result="solved"]')).toBeVisible()
}
async function seed(page: Page, index: number) {
  await page.addInitScript(
    ({ key, ids }) =>
      localStorage.setItem(key, JSON.stringify({ version: 1, cases: {}, cleared: ids, best: {} })),
    { key: INVESTIGATION_STORAGE_KEY, ids: INVESTIGATIONS.slice(0, index).map((file) => file.id) },
  )
}

test('Noir-Büro, acht Akten, Freischaltung und Notizen', async ({ page }, testInfo) => {
  await page.goto('story')
  await expect(page).toHaveTitle('Die falsche Route · Story · Atlasfunke')
  await expect(page.getByRole('heading', { name: 'Die falsche Route.', exact: true })).toBeVisible()
  await expect(page.locator('.blind-window')).toBeVisible()
  await expect(page.locator('.desk-lamp')).toBeVisible()
  await page.screenshot({
    path: `/tmp/atlas-investigation-office-${testInfo.project.name}.png`,
    fullPage: true,
  })
  await page.getByRole('button', { name: /Fallarchiv/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('[data-story-archive]')).toHaveCount(8)
  await page.locator('[data-story-archive="6"]').click()
  await expect(page.getByText('Akte noch versiegelt', { exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: /Ermittlungskarte/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Zur aktuellen Ermittlung' }).click()
  await expect(page.locator('[data-case="flussprotokoll"]')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Notizen', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Meine Lernnotizen' })).toBeVisible()
  await page.getByRole('button', { name: 'Notizen schließen' }).click()
  await expect(page.getByRole('button', { name: 'Notizen', exact: true })).toBeFocused()
  await noOverflow(page)
})

test('Die gesamte Ermittlung bis zur letzten Koordinate', async ({ page }, testInfo) => {
  test.setTimeout(240_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('story')
  await page.locator('[data-story-route="0"]').click()
  for (let index = 0; index < INVESTIGATIONS.length; index++) {
    await solve(page, index)
    await noOverflow(page)
    if (index === 0)
      await page.screenshot({
        path: `/tmp/atlas-investigation-result-${testInfo.project.name}.png`,
        fullPage: true,
      })
    await page
      .getByRole('button', { name: index < 7 ? 'Nächste Akte öffnen' : 'Zurück ins Büro', exact: true })
      .click()
  }
  await expect(page.getByText('ALLE 8 FÄLLE GEKLÄRT', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('ALLE 8 FÄLLE GEKLÄRT', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Fallarchiv/ }).click()
  await expect(page.locator('.archive-fragment')).toHaveCount(8)
  expect(errors).toEqual([])
})

test('Korrektur, Belege und gestufte Hilfen bleiben nach Neuladen erhalten', async ({ page }, testInfo) => {
  await page.goto('story?case=flussprotokoll')
  await expect(page.getByRole('group', { name: 'Ermittlungskarte Kaukasus' })).toBeVisible()
  await pin(page, 0, 0)
  await evidence(page, 0, 'bearing')
  await page.getByLabel('Als Beleg verwenden', { exact: true }).check()
  await page.getByRole('button', { name: 'Denkanstoß ansehen (1/3)', exact: true }).click()
  await page.getByRole('button', { name: 'Schlussfolgerung prüfen', exact: true }).click()
  await expect(page.getByText('Noch nicht schlüssig.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-case-pin="confluence"]')).toHaveCount(1)
  await mobileSurface(page, 'evidence')
  await expect(page.getByLabel('Als Beleg verwenden', { exact: true })).toBeChecked()
  await expect(page.getByRole('button', { name: 'Denkanstoß ansehen (2/3)', exact: true })).toBeVisible()
  await evidence(page, 0, 'water')
  await page.getByLabel('Als Beleg verwenden', { exact: true }).check()
  await evidence(page, 0, 'west-report')
  await page.getByLabel('Enthält die falsche Schlussfolgerung', { exact: true }).check()
  await page.screenshot({
    path: `/tmp/atlas-investigation-evidence-${testInfo.project.name}.png`,
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Schlussfolgerung prüfen', exact: true }).click()
  await expect(page.locator('[data-investigation-result="solved"]')).toBeVisible()
  await expect(page.getByText('Mit Denkanstoß ermittelt', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Fall erneut ermitteln' }).click()
  await expect(page.locator('[data-case-pin]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Fallarchiv', exact: true }).click()
  await expect(page.locator('.archive-fragment')).toHaveCount(1)
  await page.locator('[data-story-archive="1"]').click()
  await expect(page.locator('[data-case="grenzroute"]')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Ermittlungskarte Westbalkan' })).toBeVisible()
})

test('Karte: echte Flussläufe, Lineal, Zoom, Tastatur und entfernbarer Pin', async ({ page }, testInfo) => {
  await page.goto('story?case=flussprotokoll')
  const map = page.getByRole('group', { name: 'Ermittlungskarte Kaukasus' })
  await expect(map).toBeVisible()
  await expect(page.locator('.case-map-river')).not.toHaveCount(0)
  await map.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-case-pin]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Zusammenfluss entfernen', exact: true }).click()
  await expect(page.locator('[data-case-pin]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Lineal', exact: true }).click()
  await page.locator('[data-map-place="Tiflis"]').press('Enter')
  await map.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.map-measure-reading')).toContainText('km')
  await page.getByRole('button', { name: 'Karte vergrößern', exact: true }).click()
  await expect(page.locator('.investigation-map-layers')).toContainText('150 %')
  await page.getByRole('button', { name: 'Kartenansicht zurücksetzen' }).click()
  await expect(page.locator('.investigation-map-layers')).toContainText('100 %')
  await page.getByRole('button', { name: 'Markieren', exact: true }).click()
  await map.click({ position: { x: 120, y: 160 } })
  await expect(page.locator('[data-case-pin]')).toHaveCount(1)
  await noOverflow(page)
  await page.screenshot({ path: `/tmp/atlas-investigation-map-${testInfo.project.name}.png`, fullPage: true })
})

test('Zeitprotokoll: richtige Route allein genügt nicht, Rechnung wird gesondert geprüft', async ({
  page,
}) => {
  await seed(page, 3)
  await page.goto('story?case=doppelter-dienstag')
  await expect(page.getByRole('group', { name: 'Ermittlungskarte Samoa-Inseln' })).toBeVisible()
  for (let i = 0; i < 2; i++) await pin(page, 3, i)
  for (const id of INVESTIGATIONS[3].proof) {
    await evidence(page, 3, id)
    await page.getByLabel('Als Beleg verwenden', { exact: true }).check()
  }
  await evidence(page, 3, 'archivist')
  await page.getByLabel('Enthält die falsche Schlussfolgerung', { exact: true }).check()
  await page.getByLabel('Verstrichene Zeit', { exact: true }).fill('1440')
  await page.getByRole('button', { name: 'Schlussfolgerung prüfen', exact: true }).click()
  await expect(page.locator('.investigation-feedback')).toContainText('Ziehe in Apia 13 Stunden ab')
  await expect(page.locator('[data-investigation-result]')).toHaveCount(0)
  await page.getByLabel('Verstrichene Zeit', { exact: true }).fill('40,0')
  await page.getByRole('button', { name: 'Schlussfolgerung prüfen', exact: true }).click()
  await expect(page.locator('[data-investigation-result="solved"]')).toBeVisible()
})

test('Schriftvergleich ist mit lokalen Schriftdateien lesbar', async ({ page }, testInfo) => {
  await seed(page, 5)
  await page.goto('story?case=vertauschte-etiketten')
  await evidence(page, 5, 'script-key')
  await expect(page.locator('.evidence-glyphs')).toContainText('ລ')
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.fonts.check('42px "Noto Story Lao"', 'ລ'))).toBe(true)
  await noOverflow(page)
  await page.screenshot({
    path: `/tmp/atlas-investigation-script-${testInfo.project.name}.png`,
    fullPage: true,
  })
})

test('Kartenfehler ist wiederholbar und löscht keine Belege', async ({ page }) => {
  await page.route('**/data/story/caucasus.geojson', (route) => route.abort())
  await page.goto('story?case=flussprotokoll')
  await expect(page.getByRole('alert')).toContainText('Die Karte konnte nicht geladen werden')
  await evidence(page, 0, 'water')
  await page.getByLabel('Als Beleg verwenden', { exact: true }).check()
  await page.unroute('**/data/story/caucasus.geojson')
  await mobileSurface(page, 'map')
  await page.getByRole('button', { name: 'Karte erneut laden' }).click()
  await expect(page.getByRole('group', { name: 'Ermittlungskarte Kaukasus' })).toBeVisible()
  await mobileSurface(page, 'evidence')
  await expect(page.getByLabel('Als Beleg verwenden', { exact: true })).toBeChecked()
})

test('Speicherblockade, ungültige Links, reduzierte Bewegung und bestätigter Neustart', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Storage blocked')
    }
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('story?case=unknown')
  await expect(page).toHaveURL(/\/story$/)
  await expect(page.locator('.story-page')).toHaveAttribute('data-motion', 'paused')
  await expect(page.getByRole('status')).toContainText('Speichern nicht möglich')
  await page.getByRole('button', { name: /Fallarchiv/ }).click()
  await page.getByRole('button', { name: 'Ermittlungen zurücksetzen …', exact: true }).click()
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click()
  await expect(page.locator('[data-story-archive]')).toHaveCount(8)
  await page.getByRole('button', { name: 'Ermittlungen zurücksetzen …', exact: true }).click()
  await page.getByRole('button', { name: 'Ja, Ermittlungen zurücksetzen', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.locator('[data-story-route="0"]').click()
  await expect(page.getByRole('group', { name: 'Ermittlungskarte Kaukasus' })).toBeVisible()
  await noOverflow(page)
})
