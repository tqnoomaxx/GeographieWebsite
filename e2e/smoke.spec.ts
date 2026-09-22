import { test, expect, type Page } from '@playwright/test'

function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !/favicon|sw\.js|workbox/.test(m.text()) && errors.push(m.text()))
  return errors
}

/** Wählt die erste Antwort (Option oder Kartenfläche) per DOM-Event, unabhängig von SVG-Geometrie. */
async function pickAnswer(page: Page) {
  const root = page.locator('[data-question-type]')
  await expect(root).toBeVisible()
  const type = await root.getAttribute('data-question-type')
  const answer = await root.getAttribute('data-answer')
  if (type === 'map_click') await page.locator(`[data-id="${answer}"]`).first().dispatchEvent('click')
  else await page.getByRole('group').first().getByRole('button').first().dispatchEvent('click')
}

test('Startseite und Kategorien', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Welt/)
  await expect(page.getByRole('link', { name: /Flaggen/ }).first()).toBeVisible()
  expect(errors).toEqual([])
})

test('Flaggenrunde spielen bis zum Ergebnis', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('play/flags/round?mode=auto&scope=europe&len=10&repeat=0&content=country')
  for (let i = 0; i < 10; i++) {
    await expect(page.getByText(new RegExp(`^${i + 1} / 10$`))).toBeVisible()
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
    const input = page.getByPlaceholder('Antwort eingeben …')
    if (await input.count()) {
      await input.fill('Deutschland')
      await page.getByRole('button', { name: 'Prüfen' }).click()
    } else {
      await pickAnswer(page)
    }
    await expect(page.getByRole('status')).toBeVisible()
    await page.getByRole('button', { name: 'Weiter' }).click()
  }
  await expect(page.getByRole('heading', { name: /Runde beendet/ })).toBeVisible()
  await expect(page.getByText(/\+\d+ XP/)).toBeVisible()
  await page.goto('progress')
  await expect(page.getByText(/^Level [0-9]+$/)).toBeVisible()
  await expect(page.getByText(/Fragen beantwortet/)).toBeVisible()
  expect(errors).toEqual([])
})

test('„Alle“-Runde speichern und fortsetzen', async ({ page }) => {
  await page.goto('play/flags')
  await page.getByRole('radio', { name: /^Alle \d+$/ }).click()
  await page.getByRole('button', { name: "Los geht's" }).click()
  await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible()
  await page.getByRole('group').getByRole('button').first().click()
  await page.getByRole('button', { name: 'Weiter' }).click()
  await page.getByRole('button', { name: /Beenden/ }).click()
  await page.goto('')
  await expect(page.getByRole('link', { name: 'Weiterspielen' })).toBeVisible()
  await page.getByRole('link', { name: 'Weiterspielen' }).click()
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible()
})

test('Kartenfrage', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('play/maps/round?scope=europe&len=10&repeat=0')
  await pickAnswer(page)
  await expect(page.getByRole('status')).toBeVisible()
  expect(errors).toEqual([])
})

test('Flagle raten', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('daily/flagle')
  await expect(page.getByRole('heading', { name: /Flagle/ })).toBeVisible()
  await page.getByPlaceholder('Land eingeben …').fill('Frankreich')
  await page.getByRole('button', { name: 'Raten' }).click()
  await expect(page.getByText('1 / 6 Versuche')).toBeVisible()
  await page.reload()
  await expect(page.getByText('1 / 6 Versuche')).toBeVisible()
  expect(errors).toEqual([])
})

test('Countryle mit Hinweisen', async ({ page }) => {
  await page.goto('daily/countryle')
  await page.getByPlaceholder('Land eingeben …').fill('Brasilien')
  await page.getByRole('button', { name: 'Raten' }).click()
  await expect(page.getByText(/km/)).toBeVisible()
})

test('Entdecken → Land → Region', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('country/DE')
  await expect(page.getByRole('heading', { name: 'Deutschland', exact: true })).toBeVisible()
  await expect(page.getByText('Berlin').first()).toBeVisible()
  await page.getByRole('link', { name: /Bayern/ }).click()
  await expect(page.getByRole('heading', { name: 'Bayern', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: /Österreich|Deutschland/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('Lernen, Suche, Einstellungen', async ({ page }) => {
  await page.goto('learn')
  await page.getByRole('button', { name: /Als gelernt markieren/ }).click()
  await expect(page.getByText(/Gelernt: 1/)).toBeVisible()
  await page.goto('search')
  await page.getByRole('textbox').fill('Berl')
  await expect(page.getByRole('link', { name: /Berlin/ }).first()).toBeVisible()
  await page.goto('settings')
  await page.getByRole('radio', { name: /Dunkel/ }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.goto('quellen')
  await expect(page.getByRole('link', { name: 'country-flag-icons' })).toBeVisible()
})

test('Kennzeichen-Runde Deutschland', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('play/license_plates/round?scope=country:DE&len=10&repeat=0')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Kennzeichen/)
  await expect(page.getByText(/^Kennzeichen · Automatisch$/)).toBeVisible()
  await expect(page.getByText(/^Deutschland · 10 Fragen$/)).toBeVisible()
  const input = page.getByPlaceholder('Antwort eingeben …')
  if (await input.count()) {
    await input.fill('Berlin')
    await page.getByRole('button', { name: 'Prüfen' }).click()
  } else await page.getByRole('group').getByRole('button').first().click()
  await expect(page.getByRole('status')).toBeVisible()
  expect(errors).toEqual([])
})

test('Gewässer- und Naturrunde', async ({ page }) => {
  const errors = watchErrors(page)
  for (const cat of ['water', 'nature']) {
    await page.goto(`play/${cat}/round?scope=europe&len=5&repeat=0`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await pickAnswer(page)
    await expect(page.getByRole('status')).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('Bildle und Kennzeichle', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('daily/bildle')
  await expect(page.getByRole('img', { name: /Sehenswürdigkeit/ })).toBeVisible()
  await page.getByPlaceholder('Antwort eingeben …').fill('Kolosseum')
  await page.getByRole('button', { name: 'Raten' }).click()
  await expect(page.getByText('1 / 6 Versuche')).toBeVisible()
  await page.goto('daily/kennzeichle')
  await expect(page.getByText(/Buchstaben/)).toBeVisible()
  await page.getByPlaceholder('Antwort eingeben …').fill('Berlin')
  await page.getByRole('button', { name: 'Raten' }).click()
  await expect(page.getByText('1 / 6 Versuche')).toBeVisible()
  expect(errors).toEqual([])
})

test('Flussseite und Liste', async ({ page }) => {
  await page.goto('explore/rivers')
  await page.getByRole('link', { name: /Donau/ }).click()
  await expect(page.getByRole('heading', { name: /Donau/ })).toBeVisible()
  await expect(page.getByText(/2.850 km/)).toBeVisible()
})

test('Setup: Land als Bereich, Kartenfrage mit Versuchen', async ({ page }) => {
  await page.goto('play/flags')
  await page.getByRole('radio', { name: 'Europa', exact: true }).click()
  await page.getByRole('radio', { name: 'Deutschland' }).click()
  await page.getByRole('radio', { name: /Flagge → Karte/ }).click()
  await page.getByRole('button', { name: "Los geht's" }).click()
  await expect(page.locator('[data-question-type="map_click"]')).toBeVisible()
  await page.locator('[data-id="region:DE-BY"]').first().dispatchEvent('click')
  const answer = await page.locator('[data-question-type]').getAttribute('data-answer')
  if (answer !== 'region:DE-BY') await expect(page.getByText(/versuch es weiter/)).toBeVisible()
  await pickAnswer(page)
  await expect(page.getByRole('status')).toBeVisible()
})

test('Lernkarten-Explorer', async ({ page }) => {
  await page.goto('learn/cards?collection=regions-DE')
  await expect(page.getByText(/16 Karten/)).toBeVisible()
  await page.getByRole('button', { name: /Namen verdecken/ }).click()
  await expect(page.getByText('?').first()).toBeVisible()
})

test('Setup jeder Kategorie startet eine Runde', async ({ page }) => {
  const errors = watchErrors(page)
  for (const cat of ['flags', 'countries', 'capitals', 'images', 'cities', 'landmarks', 'water', 'nature', 'license_plates', 'mixed']) {
    await page.goto(`play/${cat}`)
    await expect(page.getByRole('radiogroup', { name: 'Bereich' })).toBeVisible()
    const start = page.getByRole('button', { name: "Los geht's" })
    await expect(start).toBeEnabled({ timeout: 15000 })
    await start.click()
    await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible()
    await expect(page.locator('[data-question-type]')).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('Karten und Regionen sind in Flaggen und Länder zusammengeführt', async ({ page }) => {
  await page.goto('play')
  await expect(page.getByRole('link', { name: /^Karten/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /^Regionen/ })).toHaveCount(0)
  await page.getByRole('link', { name: /^Länder/ }).click()
  await expect(page.getByRole('radio', { name: 'Region → Land' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Länder auf der Karte' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Regionen auf der Karte' })).toBeVisible()
  await page.goto('play/maps')
  await expect(page).toHaveURL(/\/play\/countries$/)
  await page.goto('play/regions')
  await expect(page).toHaveURL(/\/play\/flags$/)
})

test('Erweiterte Quizmodi erzeugen die passenden Fragen', async ({ page }) => {
  const cases = [
    { category: 'countries', mode: 'Ländercodes', generator: 'country_code' },
    { category: 'countries', mode: 'Ländervergleich', generator: 'country_comparison' },
    { category: 'capitals', mode: 'Hauptstadt → Flagge', generator: 'capital_to_flag' },
    { category: 'cities', mode: 'Städtevergleich', generator: 'city_population' },
  ]
  for (const item of cases) {
    await page.goto(`play/${item.category}`)
    await page.getByRole('radio', { name: item.mode, exact: true }).click()
    await page.getByRole('button', { name: "Los geht's" }).click()
    await expect(page.locator(`[data-generator="${item.generator}"]`)).toBeVisible()
  }
})

test('Mehrdeutige und triviale Varianten werden vermieden', async ({ page }) => {
  await page.goto('play/countries')
  await page.getByRole('radio', { name: 'Europa', exact: true }).click()
  await page.getByRole('radio', { name: 'Deutschland', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Region → Land' })).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'Länder auf der Karte' })).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'Regionen auf der Karte' })).toBeVisible()

  await page.goto('play/flags/round?mode=flag_input&scope=country:DE&len=5&content=region')
  await expect(page.locator('[data-generator="region_flag_input"]')).toBeVisible()
})

test('Kennzeichenvisualisierung übernimmt das ausgewählte Land', async ({ page }) => {
  await page.goto('play/license_plates/round?mode=plate_to_city&scope=country:AT&len=5')
  await expect(page.locator('.license-plate-country-AT')).toBeVisible()
  await expect(page.locator('.license-plate-country-AT .license-plate-eu')).toContainText('A')
  await page.goto('play/license_plates/round?mode=plate_to_city&scope=country:CH&len=5')
  await expect(page.locator('.license-plate-country-CH')).toBeVisible()
  await expect(page.locator('.license-plate-country-CH .license-plate-ch-badge')).toContainText('+')
})

test('Flaggen: Land als Bereich und Fragetyp wählen', async ({ page }) => {
  await page.goto('play/flags')
  await page.getByRole('radio', { name: 'Europa', exact: true }).click()
  await page.getByRole('radio', { name: 'Deutschland' }).click()
  await expect(page.getByText(/^Flaggen · Automatisch$/)).toBeVisible()
  await expect(page.getByText(/^Deutschland · /)).toBeVisible()
  await page.getByRole('radio', { name: 'Flagge → Name' }).click()
  await expect(page.getByText(/^Flaggen · Flagge → Name$/)).toBeVisible()
  await page.getByRole('button', { name: "Los geht's" }).click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('group').getByRole('button')).toHaveCount(4)
})
