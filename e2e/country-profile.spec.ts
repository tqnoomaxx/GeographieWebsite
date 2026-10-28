import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const countries = JSON.parse(readFileSync('public/data/entities/countries.json', 'utf8')) as Array<{
  id: string
  attributes: { iso2: string; highest_point: { name: string } }
}>

test('15 Kategorien sind frei kombinierbar und der Lernmodus bleibt in der Runde erhalten', async ({
  page,
}) => {
  await page.goto('play/countries?quiz=country-profile')
  await expect(page.getByRole('checkbox')).toHaveCount(15)
  await page.getByRole('checkbox', { name: 'Höchste Erhebung', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Nachbarländer', exact: true }).check()
  await expect(page.locator('.profile-category-options summary')).toContainText('7 ausgewählt')
  await page.getByRole('button', { name: 'Wiederholungslernen', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Länder pro Runde' })).toHaveValue('10')
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page).toHaveURL(/repeat=1/)
  await expect(page.locator('.profile-game')).toHaveAttribute('data-profile-learning', 'true')
  await expect(page.locator('[data-field]')).toHaveCount(7)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('Nach einer Sprache erscheinen alle weiteren Sprachen und nach einem Nachbarn alle Nachbarn', async ({
  page,
}) => {
  await page.goto(
    'play/countries/round?quiz=country-profile&mode=input&scope=world&fields=language,neighbors,highest_point,capital&repeat=0&len=all&only=country:CH',
  )
  const input = page.getByRole('textbox', { name: 'Antwort eingeben', exact: true })
  await input.fill('Deutsch')
  const language = page.locator('[data-field="language"]')
  await expect(language).toHaveAttribute('data-solved', 'true')
  for (const name of ['Französisch', 'Deutsch', 'Italienisch', 'Bündnerromanisch'])
    await expect(language).toContainText(name)
  await input.fill('Österreich')
  for (const name of ['Österreich', 'Frankreich', 'Deutschland', 'Italien', 'Liechtenstein'])
    await expect(page.locator('[data-field="neighbors"]')).toContainText(name)
  await expect(page.locator('[data-field="highest_point"]')).toHaveAttribute('data-solved', 'false')
  await input.fill('Dufourspitze')
  await expect(page.locator('[data-field="highest_point"]')).toContainText('4.634 m')
})

test('Ein Hauptstadt- oder Währungstreffer zeigt auch alle weiteren gültigen Antworten', async ({ page }) => {
  await page.goto(
    'play/countries/round?quiz=country-profile&mode=input&scope=world&fields=capital,language&repeat=0&len=all&only=country:ZA',
  )
  await page.getByRole('textbox', { name: 'Antwort eingeben' }).fill('Cape Town')
  for (const name of ['Pretoria', 'Kapstadt', 'Bloemfontein'])
    await expect(page.locator('[data-field="capital"]')).toContainText(name)
  await expect(page.locator('[data-field="language"]')).toHaveAttribute('data-solved', 'false')
  await page.goto(
    'play/countries/round?quiz=country-profile&mode=input&scope=world&fields=currency,language&repeat=0&len=all&only=country:NA',
  )
  await page.getByRole('textbox', { name: 'Antwort eingeben' }).fill('NAD')
  await expect(page.locator('[data-field="currency"]')).toContainText('NAD')
  await expect(page.locator('[data-field="currency"]')).toContainText('ZAR')
})

test('Wiederholungslernen fragt ausschließlich fehlende Kategorien bis zum Erfolg erneut ab', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(
    'play/countries/round?quiz=country-profile&mode=input&scope=world&fields=capital,highest_point,iso3&repeat=1&len=all&only=country:DE',
  )
  const input = page.getByRole('textbox', { name: 'Antwort eingeben', exact: true })
  await input.fill('Berlin')
  await page.getByRole('button', { name: 'Auflösen und später wiederholen', exact: true }).click()
  await expect(page.locator('[data-field="highest_point"]')).toContainText('Zugspitze')
  await page.getByRole('button', { name: 'Nächstes Land', exact: false }).click()
  await expect(page.locator('.profile-review-banner')).toContainText('2 offene Kategorien')
  await expect(page.locator('[data-field="capital"]')).toHaveCount(0)
  await input.fill('Zugspitze')
  await page.getByRole('button', { name: 'Auflösen und später wiederholen', exact: true }).click()
  await page.getByRole('button', { name: 'Weiterlernen', exact: false }).click()
  await expect(page.locator('[data-field]')).toHaveCount(1)
  await expect(page.locator('[data-field="iso3"]')).toBeVisible()
  await input.fill('DEU')
  await page.getByRole('button', { name: 'Weiterlernen', exact: false }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Runde beendet')
  await expect(page.getByText('1 / 1 Land gelernt', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('Gleiche Antworten für zwei Kategorien werden gezielt zugeordnet', async ({ page }) => {
  await page.goto(
    'play/countries/round?quiz=country-profile&mode=input&scope=world&fields=continent,subregion&repeat=0&len=all&only=country:BR',
  )
  const input = page.getByRole('textbox', { name: 'Antwort eingeben' })
  await input.fill('Südamerika')
  const choices = page.getByRole('group', { name: 'Antwort einer Kategorie zuordnen' })
  await expect(choices.getByRole('button')).toHaveCount(2)
  await choices.getByRole('button', { name: 'Kontinent (UN-Zuordnung)', exact: true }).click()
  await expect(page.locator('[data-field="continent"]')).toHaveAttribute('data-solved', 'true')
  await expect(page.locator('[data-field="subregion"]')).toHaveAttribute('data-solved', 'false')
  await input.fill('Südamerika')
  await expect(page.locator('[data-field="subregion"]')).toHaveAttribute('data-solved', 'true')
})

test('Automatische Eingabe schneidet Deutsch nicht bereits bei DE ab', async ({ page }) => {
  await page.goto(
    'play/countries/round?quiz=country-profile&mode=input&scope=world&fields=language,iso2&repeat=0&len=all&only=country:DE',
  )
  const input = page.getByRole('textbox', { name: 'Antwort eingeben' })
  await input.pressSequentially('Deutsch', { delay: 40 })
  await expect(page.locator('[data-field="language"]')).toHaveAttribute('data-solved', 'true')
  await expect(page.locator('[data-field="iso2"]')).toHaveAttribute('data-solved', 'false')
  await input.fill('DE')
  await expect(page.locator('[data-field="iso2"]')).toHaveAttribute('data-solved', 'true')
})

test('Kategorien mit lückenhaften Angaben filtern Länder und verlangen keine feste Anzahl von Feldern', async ({
  page,
}) => {
  await page.goto('play/countries?quiz=country-profile')
  await page.getByRole('button', { name: 'Alle abwählen', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Quiz starten', exact: true })).toBeDisabled()
  await page.getByRole('checkbox', { name: 'Nationalbaum', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Höchste Erhebung', exact: true }).check()
  await expect(page.getByRole('button', { name: 'Quiz starten', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page.locator('[data-field]')).toHaveCount(2)
  await expect(page.locator('[data-field="national_tree"]')).toBeVisible()
})

test('Alle-Runden speichern den Lernmodus und die offenen Wiederholungsfelder beim Fortsetzen', async ({
  page,
}) => {
  await page.goto(
    'play/countries/round?quiz=country-profile&mode=input&scope=world&fields=iso2,highest_point&repeat=1&len=all',
  )
  const root = page.locator('.profile-game')
  await expect(root).toBeVisible()
  const originalId = await root.getAttribute('data-answer')
  const country = countries.find((c) => c.id === originalId)!
  await page.getByRole('textbox', { name: 'Antwort eingeben' }).fill(country.attributes.iso2)
  await expect(page.locator('[data-field="iso2"]')).toHaveAttribute('data-solved', 'true')
  await page.getByRole('button', { name: 'Auflösen und später wiederholen', exact: true }).click()
  await page.getByRole('button', { name: 'Nächstes Land', exact: false }).click()
  const secondId = await root.getAttribute('data-answer')
  await page.getByRole('button', { name: 'Beenden', exact: true }).click()
  await page.getByRole('link', { name: /Weiterspielen/ }).click()
  await page.reload()
  await expect(root).toHaveAttribute('data-answer', secondId!)
  await expect(root).toHaveAttribute('data-profile-learning', 'true')
  for (let i = 0; i < 3; i++) {
    const id = await root.getAttribute('data-answer')
    const nextCountry = countries.find((c) => c.id === id)!
    await page.getByRole('textbox', { name: 'Antwort eingeben' }).fill(nextCountry.attributes.iso2)
    await expect(page.locator('[data-field="iso2"]')).toHaveAttribute('data-solved', 'true')
    await page
      .getByRole('textbox', { name: 'Antwort eingeben' })
      .fill(nextCountry.attributes.highest_point.name)
    await page.getByRole('button', { name: 'Nächstes Land', exact: false }).click()
  }
  await expect(root).toHaveAttribute('data-answer', originalId!)
  await expect(root).toHaveAttribute('data-profile-review', 'true')
  await expect(page.locator('[data-field]')).toHaveCount(1)
  await expect(page.locator('[data-field="highest_point"]')).toBeVisible()
})
