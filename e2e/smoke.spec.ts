import { openQuizSettings } from './controls'
import { test, expect, type Page } from '@playwright/test'

function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on(
    'console',
    (m) => m.type() === 'error' && !/favicon|sw\.js|workbox/.test(m.text()) && errors.push(m.text()),
  )
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
  await expect(page.getByRole('application', { name: /Interaktive Weltkugel/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Flaggen/ }).first()).toBeVisible()
  expect(errors).toEqual([])
})

test('Die frühere Quizinsel führt jetzt zur Geschichte', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('play?view=diorama')
  await expect(page).toHaveURL(/\/story$/)
  await expect(page.getByRole('heading', { name: 'Die falsche Route.', exact: true })).toBeVisible()
  await expect(page.locator('.story-office')).toBeVisible()
  await page.locator('[data-story-route="0"]').click()
  await expect(page.getByRole('group', { name: 'Ermittlungskarte Kaukasus', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('Die Story-Insel respektiert reduzierte Bewegung', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('story')
  await expect(page.locator('.story-page')).toHaveAttribute('data-motion', 'paused')
})

test('Fotoübungen bleiben über die bisherigen Links erreichbar', async ({ page }) => {
  await page.goto('play/landmarks')
  await expect(page.locator('[data-exercise="landmark-photo"]')).toBeVisible()
  await page.goto('play/images')
  await expect(page).toHaveURL(/\/play\/landmarks$/)
  await page.locator('[data-exercise="landmark-photo"]').click()
  await page.getByRole('button', { name: 'Eintippen', exact: true }).click()
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page.locator('[data-generator="image_to_landmark_input"]')).toBeVisible()
})

test('Weltkugel wählt ein Land und öffnet dessen Quizkonfiguration', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('')
  // Die automatische Rotation verändert fortlaufend die SVG-Pfade. Fokus pausiert sie
  // wie bei Tastaturbedienung, damit Playwright einen echten stabilen Klick ausführt.
  const globe = page.getByRole('application', { name: /Interaktive Weltkugel/ })
  await globe.focus()
  await expect(globe).toBeFocused()
  await page.locator('[data-country-id="country:DE"]').click()
  await expect(page.getByLabel('Land suchen oder auswählen')).toHaveValue('country:DE')
  const panel = page.locator('.country-quiz-panel')
  await expect(panel.getByRole('heading', { name: 'Deutschland' })).toBeVisible()
  await expect(panel.getByText('In diesem Land')).toBeVisible()
  await panel.locator('[data-country-exercise="regional-flags"]').click()
  await expect(page).toHaveURL(/play\/regions\?quiz=regional-flags.*scope=country%3ADE/)
  await expect(page.getByRole('combobox', { name: 'Land', exact: true })).toHaveValue('country:DE')
  expect(errors).toEqual([])
})

test('Quiz-Deep-Link validiert unterstützte und ungültige Länderbereiche', async ({ page }) => {
  await page.goto('play/flags?scope=country:DE')
  await expect(page.getByRole('combobox', { name: 'Land', exact: true })).toHaveValue('country:DE')
  await page.goto('play/flags?scope=country:ZZ')
  await expect(page.getByRole('combobox', { name: 'Land', exact: true })).toHaveValue('country:DE')
  await page.goto('play/capitals?scope=country:DE')
  await expect(page.getByRole('combobox', { name: 'Gebiet', exact: true })).toHaveValue('world')
})

test('Weltkugel respektiert reduzierte Bewegung und Drag wählt kein Land', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('')
  const globe = page.getByRole('application', { name: /Interaktive Weltkugel/ })
  await expect(globe).toBeVisible()
  const germany = page.locator('[data-country-id="country:DE"]')
  const initialPath = await germany.getAttribute('d')
  await page.waitForTimeout(180)
  await expect(germany).toHaveAttribute('d', initialPath!)

  const bounds = await globe.boundingBox()
  expect(bounds).not.toBeNull()
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
  await page.mouse.down()
  await page.mouse.move(bounds!.x + bounds!.width / 2 + 80, bounds!.y + bounds!.height / 2 + 15)
  await page.mouse.up()
  await expect(page.locator('.country-quiz-panel')).toHaveCount(0)
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
  await expect(page.getByRole('heading', { name: /^Level [0-9]+$/ })).toBeVisible()
  await expect(page.getByText(/Fragen beantwortet/)).toBeVisible()
  expect(errors).toEqual([])
})

test('„Alle“-Runde speichern und fortsetzen', async ({ page }) => {
  await page.goto('play/flags?quiz=country-flags')
  await page.locator('.training-options summary').click()
  await page.getByRole('combobox', { name: 'Rundenlänge', exact: true }).selectOption('all')
  await page.getByRole('button', { name: 'Quiz starten' }).click()
  await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible()
  await page.getByRole('group').getByRole('button').first().click()
  await page.getByRole('button', { name: 'Weiter' }).click()
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible()
  await page.getByRole('button', { name: /Beenden/ }).click()
  await page.goto('play')
  await expect(page.getByRole('heading', { name: 'Hier geht’s weiter' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Weiterspielen/ })).toBeVisible()
  await page.goto('')
  await expect(page.getByRole('link', { name: /Weiterspielen/ })).toBeVisible()
  await page.getByRole('link', { name: /Weiterspielen/ }).click()
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible()
})

test('Kartenfrage', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('play/maps/round?scope=europe&len=10&repeat=0')
  await pickAnswer(page)
  await expect(page.getByRole('status')).toBeVisible()
  expect(errors).toEqual([])
})

test('Karte lässt sich zoomen, zurücksetzen und real anklicken', async ({ page }, testInfo) => {
  const errors = watchErrors(page)
  await page.goto(
    'play/flags/round?mode=flag_to_map&scope=country:DE&len=1&repeat=0&content=region&only=region:DE-BY',
  )
  const viewport = page.locator('.map-viewport.is-interactive')
  await expect(viewport).toBeVisible()
  await page.getByRole('button', { name: 'Hineinzoomen' }).click()
  await expect(viewport).toHaveAttribute('data-map-zoom', '1.50')
  await page.getByRole('button', { name: 'Karte zurücksetzen' }).click()
  await expect(viewport).toHaveAttribute('data-map-zoom', '1.00')

  const target = page.locator('[data-id="region:DE-BY"]').first()
  await viewport.scrollIntoViewIfNeeded()
  await expect(target).toBeVisible()
  const point = await target.evaluate((node) => {
    const path = node as SVGGeometryElement
    const bounds = path.getBBox()
    const matrix = path.getScreenCTM()
    if (!matrix) throw new Error('Kartenpfad hat keine Bildschirmmatrix')
    for (let row = 1; row < 10; row++) {
      for (let column = 1; column < 10; column++) {
        const local = new DOMPoint(
          bounds.x + (bounds.width * column) / 10,
          bounds.y + (bounds.height * row) / 10,
        )
        if (path.isPointInFill(local)) {
          const screen = local.matrixTransform(matrix)
          return { x: screen.x, y: screen.y }
        }
      }
    }
    throw new Error('Kein anklickbarer Punkt im Kartenpfad gefunden')
  })
  const hitTarget = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('data-id'),
    point,
  )
  expect(hitTarget).toBe('region:DE-BY')
  if (testInfo.project.name === 'mobile') await page.touchscreen.tap(point.x, point.y)
  else await page.mouse.click(point.x, point.y)
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
  await page.getByRole('textbox', { name: 'Suche', exact: true }).fill('Berl')
  await expect(page.getByRole('link', { name: /Berlin/ }).first()).toBeVisible()
  await page.goto('settings')
  await openQuizSettings(page)
  await page.getByRole('radio', { name: /Dunkel/ }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.goto('quellen')
  await expect(page.getByRole('link', { name: 'country-flags' })).toBeVisible()
})

test('Flaggenhinweis bleibt bis zur Antwort verdeckt', async ({ page }) => {
  await page.goto(
    'play/flags/round?mode=flag_to_name&scope=world&len=1&repeat=0&content=country&hide_hints=1&only=country:BR',
  )
  const concealed = page.locator('[data-flag-hint-hidden="true"]')
  await expect(concealed).toBeVisible()
  await expect(concealed.getByRole('img')).toHaveAttribute('src', /BR\.svg/)
  const answer = await page.locator('[data-question-type]').getAttribute('data-answer')
  await page.locator(`[data-option-id="${answer}"]`).click()
  await expect(page.getByRole('status')).toBeVisible()
  await expect(concealed).toHaveCount(0)
  await expect(page.getByRole('img', { name: 'Flagge' })).toHaveAttribute('src', /BR\.svg/)
})

test('Kennzeichen-Runde Deutschland', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('play/license_plates/round?scope=country:DE&len=10&repeat=0')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
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
  await page.goto('play/regions?quiz=regional-flags&mode=map&scope=country:DE')
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
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
  const topics = [
    'flags',
    'countries',
    'capitals',
    'regions',
    'cities',
    'landmarks',
    'water',
    'nature',
    'license_plates',
    'languages',
    'mixed',
    'trivia',
  ]
  for (const topic of topics) {
    await page.goto('play/' + topic)
    await page.locator('[data-exercise], .exercise-start').first().waitFor()
    const exercises = page.locator('[data-exercise]')
    if (await exercises.count()) await exercises.first().click()
    await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
    await expect(page.locator('[data-question-type]')).toBeVisible()
  }
})

test('Schriftenmodus zeigt Original, Umschrift und Lernfakten', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('play/languages?quiz=read-cyrillic')
  await expect(page.getByRole('combobox', { name: 'Gebiet', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page.locator('.script-study-card')).toBeVisible()
  await expect(page.locator('.script-study-original')).not.toBeEmpty()
  const answer = await page.locator('[data-question-type]').getAttribute('data-answer')
  await page.locator(`[data-option-id="${answer}"]`).click()
  await expect(page.getByRole('region', { name: 'Kurzfakten' })).toBeVisible()
  expect(errors).toEqual([])
})

test('Regionen haben einen eigenen Platz, Karten gehören zum jeweiligen Thema', async ({ page }) => {
  await page.goto('play')
  await expect(page.locator('[data-quiz-topic="regions"]')).toBeVisible()
  await page.locator('[data-quiz-topic="regions"]').click()
  await expect(page.locator('[data-exercise="region-country"]')).toBeVisible()
  await expect(page.locator('[data-exercise="region-map"]')).toBeVisible()
  await page.goto('play/maps')
  await expect(page).toHaveURL(/quiz=country-map/)
  await page.goto('play/flags')
  await expect(page.locator('[data-exercise]')).toHaveCount(2)
})

test('Erweiterte Quizmodi erzeugen die passenden Fragen', async ({ page }) => {
  const cases = [
    ['countries', 'country-codes', 'country_code'],
    ['countries', 'country-size', 'country_comparison'],
    ['capitals', 'capital-flag', 'capital_to_flag'],
    ['cities', 'city-size', 'city_population'],
  ]
  for (const [topic, id, generator] of cases) {
    await page.goto(`play/${topic}?quiz=${id}`)
    await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
    await expect(page.locator(`[data-generator="${generator}"]`)).toBeVisible()
  }
  await page.goto('play/countries?quiz=national-symbols')
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page.locator('[data-generator^="national_"]')).toBeVisible()
})

test('Mehrdeutige und triviale Varianten werden vermieden', async ({ page }) => {
  await page.goto('play/countries?quiz=country-map')
  await expect(
    page.getByRole('combobox', { name: 'Gebiet', exact: true }).locator('option[value^="country:"]'),
  ).toHaveCount(0)
  await page.goto('play/regions?quiz=region-map')
  await expect(page.getByRole('combobox', { name: 'Land', exact: true })).toBeVisible()
  await page.goto('play/flags/round?mode=flag_input&scope=country:DE&len=5&content=region')
  await expect(page.locator('[data-generator="region_flag_input"]')).toBeVisible()
})

test('Eintippantwort bleibt auf der Quizfläche kontrastreich lesbar', async ({ page }) => {
  await page.goto('play/flags/round?mode=flag_input&scope=world&len=10&content=country')
  const input = page.getByRole('textbox', { name: 'Antwort eingeben …' })
  await expect(input).toBeVisible()
  await input.fill('Deutschland')
  await expect(input).toHaveValue('Deutschland')
  const contrast = await input.evaluate((node) => {
    const styles = getComputedStyle(node)
    const channels = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
    const luminance = (value: string) => {
      const [red = 0, green = 0, blue = 0] = channels(value).map((channel) => {
        const normalized = channel / 255
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue
    }
    const foreground = luminance(styles.color)
    const background = luminance(styles.backgroundColor)
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
  })
  expect(contrast).toBeGreaterThanOrEqual(7)
})

test('Kennzeichenvisualisierung übernimmt das ausgewählte Land', async ({ page }) => {
  await page.goto('play/license_plates/round?mode=plate_to_city&scope=country:DE&len=5')
  await expect(page.locator('.license-plate-country-DE .license-plate-badges')).toBeVisible()
  await expect(page.locator('.license-plate-country-DE .license-plate-code > span').last()).not.toBeEmpty()
  await page.goto('play/license_plates/round?mode=plate_to_city&scope=country:AT&len=5')
  await expect(page.locator('.license-plate-country-AT')).toBeVisible()
  await expect(page.locator('.license-plate-country-AT .license-plate-eu')).toContainText('A')
  await expect(page.locator('.license-plate-country-AT .license-plate-at-crest')).toBeVisible()
  await page.goto('play/license_plates/round?mode=plate_to_city&scope=country:CH&len=5')
  await expect(page.locator('.license-plate-country-CH')).toBeVisible()
  await expect(page.locator('.license-plate-country-CH .license-plate-ch-badge')).toContainText('+')
  await expect(page.locator('.license-plate-country-CH .license-plate-canton-badge')).toBeVisible()
  await page.goto('play/license_plates/round?mode=plate_to_city&scope=country:PL&len=5')
  await expect(page.locator('.license-plate-country-PL')).toBeVisible()
  await expect(page.locator('.license-plate-country-PL .license-plate-eu')).toContainText('PL')
  await expect(page.locator('.license-plate-country-PL .license-plate-country-label')).toContainText('POLSKA')
  await page.goto('play/license_plates/round?mode=city_to_plate_input&scope=country:DE&len=5')
  await expect(page.getByPlaceholder('Antwort eingeben …')).toBeVisible()
  await expect(page.locator('.license-plate')).toHaveCount(0)
})

test('Sehenswürdigkeiten zeigen nach der Antwort Kurzfakten', async ({ page }) => {
  await page.goto('play/landmarks/round?mode=landmark_to_country&scope=world&len=5&repeat=0')
  const answer = await page.locator('[data-question-type]').getAttribute('data-answer')
  await page.locator(`[data-option-id="${answer}"]`).click()
  await expect(page.getByRole('region', { name: 'Kurzfakten' })).toBeVisible()
  await expect(page.locator('.quiz-feedback-facts li')).toHaveCount(3)
})

test('Regionalflaggen haben eine eindeutige Länder- und Antwortauswahl', async ({ page }) => {
  await page.goto('play/regions?quiz=regional-flags')
  await page.getByRole('combobox', { name: 'Land', exact: true }).selectOption('country:DE')
  await page.getByRole('button', { name: 'Auswählen', exact: true }).click()
  await page.getByRole('button', { name: 'Quiz starten', exact: true }).click()
  await expect(page.locator('[data-generator="flag_to_region"]')).toBeVisible()
  await expect(page.locator('[data-option-id]')).toHaveCount(4)
})

test('Account-Sicherheit berücksichtigt den Verbindungsstatus und schützt die Registrierung', async ({
  page,
}) => {
  const errors = watchErrors(page)
  await page.goto('account')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByLabel('E-Mail')).toBeVisible()
  const configured = !(await page
    .getByText('Konten sind in dieser Installation noch nicht aktiviert.')
    .isVisible())
  await openQuizSettings(page)
  await page.getByRole('radio', { name: 'Registrieren' }).click()
  await page.getByLabel('E-Mail').fill('test@example.org')
  await page.getByLabel('Passwort', { exact: true }).fill('Eine-Lange9!Passphrase')
  await page.getByLabel('Passwort wiederholen').fill('Eine-Lange9!Passphrase')
  await expect(page.getByText('✓ mindestens 12 Zeichen')).toBeVisible()
  await expect(page.getByText('✓ Sonderzeichen')).toBeVisible()
  const register = page.getByRole('button', { name: /Registrieren/ })
  if (configured) await expect(register).toBeEnabled()
  else await expect(register).toBeDisabled()
  expect(errors).toEqual([])
})

test('Datenschutz erklärt Gastmodus, Kontofreiwilligkeit und lokale Löschung', async ({ page }) => {
  await page.goto('datenschutz')
  await expect(page.getByText('Ein Konto ist freiwillig.')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '4. Lokaler Spielfortschritt und Einstellungen' }),
  ).toBeVisible()
  const localOnly = page.getByText(/Konten und Cloud-Synchronisierung sind .* nicht aktiviert/)
  if (await localOnly.isVisible()) await expect(localOnly).toBeVisible()
  else
    await expect(
      page.getByRole('heading', { name: 'Geräteübergreifende Lernnotizen ohne Konto' }),
    ).toBeVisible()
})
