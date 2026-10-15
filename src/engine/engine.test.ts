import { describe, it, expect, vi } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { buildContext } from './context'
import {
  baseQuestionPosition,
  advanceSession,
  baseQuestionTotal,
  buildSession,
  checkAnswer,
  extendSession,
  pendingRepeatCount,
  poolFor,
  recordAnswer,
  skipQuestion,
} from './session'
import { generatorsFor, registry } from './registry'
import { fromQuery, toQuery, type RoundConfig } from './round'
import { PLAY_QUIZZES, QUIZZES } from '@/config/quizzes'
import { matchesAnswer, normalizeAnswer } from './normalize'
import { createRng } from './rng'
import { review, initialProgress } from './srs'
import { levelForXp, xpForLevel } from '@/config/levels'
import type { Country, Entity, Relationship } from '@/domain/types'
import { isSovereign, options } from './generators/base'
import { resolvePuzzleGuess, samePuzzlePlace } from '@/features/daily/puzzles'
import { platePlaceKeys, sharePlatePlace } from '@/domain/licensePlates'

const DATA = join(process.cwd(), 'public', 'data')
const read = <T>(p: string): T => JSON.parse(readFileSync(join(DATA, p), 'utf8'))
const countries = read<Entity[]>('entities/countries.json')
const cities = read<Entity[]>('entities/cities.json')
const landmarks = read<Entity[]>('entities/landmarks.json')
const regions = readdirSync(join(DATA, 'entities/regions')).flatMap((f) =>
  read<Entity[]>(`entities/regions/${f}`),
)
const relationships = read<Relationship[]>('relationships/index.json')
const plates = readdirSync(join(DATA, 'entities/license-plates')).flatMap((file) =>
  read<Entity[]>(`entities/license-plates/${file}`),
)
const rivers = read<Entity[]>('entities/rivers.json')
const lakes = read<Entity[]>('entities/lakes.json')
const mountains = read<Entity[]>('entities/mountains.json')
const scriptWords = read<Entity[]>('entities/script-words.json')
const trivia = read<Entity[]>('entities/trivia.json')
/** Runden-Setup mit Standardwerten (Automatisch, Welt, 10, Wiederholung an). */
const setup = (o: Partial<RoundConfig> & { category: RoundConfig['category'] }): RoundConfig => ({
  mode: 'auto',
  scope: 'world',
  length: 10,
  repeat: true,
  ...o,
})
const ctx = (scope = 'world') =>
  buildContext({
    countries,
    cities,
    landmarks,
    regions,
    plates,
    rivers,
    lakes,
    mountains,
    scriptWords,
    trivia,
    relationships,
    scope,
  })

describe('normalize', () => {
  it('toleriert Umlaute, Diakritika und kleine Tippfehler', () => {
    expect(normalizeAnswer('Österreich')).toBe('oesterreich')
    expect(matchesAnswer('oesterreich', ['Österreich'])).toBe(true)
    expect(matchesAnswer('Sao Tome und Principe', ['São Tomé und Príncipe'])).toBe(true)
    expect(matchesAnswer('Deutschlnad', ['Deutschland'])).toBe(true)
    expect(matchesAnswer('Peru', ['Chile'])).toBe(false)
    expect(matchesAnswer('Iran', ['Irak'])).toBe(false)
  })
  it('bewahrt nichtlateinische Namen und unterscheidet griechische und kyrillische Antworten', () => {
    expect(matchesAnswer('Москва', ['Москва'])).toBe(true)
    expect(matchesAnswer('Москва', ['Сочи'])).toBe(false)
    expect(normalizeAnswer('Αθήνα')).not.toBe('')
  })
})

describe('Quizlogik-Regressionen', () => {
  it.each([
    ['AU', 'Austria'],
    ['AT', 'Australia'],
    ['KR', 'North Korea'],
    ['KP', 'South Korea'],
    ['IE', 'Island'],
    ['IS', 'Irland'],
    ['LV', 'Republik Estland'],
  ])('wertet einen anderen echten Ländernamen für %s als falsch', (iso, input) => {
    const c = ctx()
    const target = c.byId.get(`country:${iso}`)!
    const q = registry.get('flag_to_country_input')!.make(target, c, createRng('names'), 2)!
    expect(checkAnswer(q, input, c)).toBe(false)
    const session = buildSession(
      c,
      setup({ category: 'flags', mode: 'flag_input', content: ['country'], length: 1, only: [target.id] }),
    )
    expect(recordAnswer(session, input, undefined, c).questions[0].correct).toBe(false)
  })

  it('behält Tippfehlertoleranz, ISO-Codes und mehrere gültige Hauptstädte', () => {
    const c = ctx()
    const question = (generator: string, iso: string) =>
      registry.get(generator)!.make(c.byId.get(`country:${iso}`)!, c, createRng('typos'), 2)!
    expect(checkAnswer(question('flag_to_country_input', 'DE'), 'Deutschlnad', c)).toBe(true)
    expect(checkAnswer(question('flag_to_country_input', 'AU'), 'Austrlia', c)).toBe(true)
    expect(checkAnswer(question('flag_to_country_input', 'AU'), 'AUS', c)).toBe(true)
    for (const name of ['Pretoria', 'Cape Town', 'Bloemfontein'])
      expect(checkAnswer(question('capital_input', 'ZA'), name, c)).toBe(true)
  })

  it('bietet bei Währungsfragen genau eine gültige Währung an', () => {
    const c = ctx()
    const generator = registry.get('country_attribute')!
    let multiCurrencyQuestions = 0
    for (const country of countries as Country[]) {
      if (!isSovereign(country)) continue
      const valid = new Set(
        country.attributes.domestic_currency
          ? [country.attributes.domestic_currency]
          : country.attributes.currencies?.map((currency) => currency.code),
      )
      for (let seed = 0; seed < 12; seed++) {
        const q = generator.make(country, c, createRng(`${country.id}:${seed}`), 2)!
        if (q.type !== 'country_currency') continue
        expect(
          q.options!.filter((option) => valid.has(option.id)),
          q.id,
        ).toHaveLength(1)
        expect(q.options!.find((option) => option.id === q.answer)).toBeDefined()
        expect(new Set(q.options!.map((option) => normalizeAnswer(option.label))).size).toBe(4)
        if (valid.size > 1) multiCurrencyQuestions++
      }
    }
    expect(multiCurrencyQuestions).toBeGreaterThan(20)
  })

  it('schließt weitere gültige Flussländer auch aus dem globalen Ersatzpool aus', () => {
    const river: Entity = {
      ...rivers[0],
      attributes: { continent: 'europe', country: 'country:DE', countries: ['country:DE', 'country:AT'] },
    }
    const c = buildContext({
      countries: countries.filter((country) =>
        ['DE', 'AT', 'FR', 'IT', 'JP', 'BR'].includes(country.attributes.iso2 as string),
      ),
      cities: [],
      landmarks: [],
      regions: [],
      rivers: [river],
      relationships: [],
      scope: 'europe',
    })
    for (let seed = 0; seed < 30; seed++) {
      const q = registry.get('river_to_country')!.make(river, c, createRng(seed), 2)!
      expect(q).not.toBeNull()
      expect(q.options!.filter((option) => ['country:DE', 'country:AT'].includes(option.id))).toHaveLength(1)
    }
  })

  it('füllt Antworten trotz gleichnamiger Kandidaten im globalen Ersatzpool vollständig', () => {
    const selected = ['DE', 'FR', 'JP', 'BR', 'US'].map((iso) =>
      structuredClone(countries.find((country) => country.id === `country:${iso}`)!),
    )
    selected[2].names.de = selected[1].names.de
    const c = buildContext({
      countries: selected,
      cities: [],
      landmarks: [],
      regions: [],
      relationships: [],
      scope: 'world',
    })
    for (let seed = 0; seed < 20; seed++) {
      const result = options(selected[0], selected.slice(0, 2), c, createRng(seed), 2)!
      expect(result).toHaveLength(4)
      expect(new Set(result.map((option) => option.label)).size).toBe(4)
    }
  })

  it.each(['europe', 'south-america', 'oceania', 'country:DE', 'country:AT', 'country:CH'])(
    'hält Fragen in kleinen Gebieten spielbar: %s',
    (scope) => {
      const c = ctx(scope)
      for (const id of [
        'national_animal',
        'national_bird',
        'national_tree',
        'country_attribute',
        'country_code',
        'country_comparison',
        'country_true_false',
      ]) {
        const generator = registry.get(id)!
        for (const target of generator.pool(c)) {
          for (let seed = 0; seed < 3; seed++)
            expect(
              generator.make(target, c, createRng(seed), 2),
              `${scope}/${id}/${target.id}`,
            ).not.toBeNull()
        }
      }
    },
  )

  it('überspringt beim Nachladen entfernte Karten und erreicht die nächste gültige Frage', () => {
    const c = ctx()
    let session = buildSession(
      c,
      setup({ category: 'flags', mode: 'flag_to_name', content: ['country'], length: 'all' }),
      { seed: 'stale' },
    )
    session = recordAnswer(
      { ...session, position: session.questions.length - 1 },
      session.questions.at(-1)!.question.answer,
    )
    session.remaining = [...Array.from({ length: 26 }, (_, i) => `country:removed-${i}`), 'country:DE']
    const next = advanceSession(session, c)!
    expect(next).not.toBeNull()
    expect(next.questions[next.position].question.entities[0]).toBe('country:DE')
    expect(next.remaining).toEqual([])
  })

  it('füllt die erste Alle-Etappe trotz nicht mehr spielbarer Karten', () => {
    const c = ctx()
    const generator = registry.get('flag_to_country')!
    const original = generator.make.bind(generator)
    let calls = 0
    const spy = vi
      .spyOn(generator, 'make')
      .mockImplementation((...args) => (++calls <= 25 ? null : original(...args)))
    try {
      const session = buildSession(
        c,
        setup({ category: 'flags', mode: 'flag_to_name', content: ['country'], length: 'all' }),
        { seed: 'first-batch' },
      )
      expect(session.questions).toHaveLength(25)
      expect(session.remaining!.length).toBeGreaterThan(0)
    } finally {
      spy.mockRestore()
    }
  })

  it('lässt unbeantwortete Fragen beim Weiterklicken stehen', () => {
    const c = ctx()
    const session = buildSession(c, setup({ category: 'flags' }), { seed: 'advance' })
    expect(advanceSession(session, c)).toBe(session)
  })

  it('ordnet tägliche Eingaben exakt zu und verwirft mehrdeutige Tippfehler', () => {
    expect(resolvePuzzleGuess('Austria', countries)?.id).toBe('country:AT')
    expect(resolvePuzzleGuess('Australia', countries)?.id).toBe('country:AU')
    expect(resolvePuzzleGuess('South Korea', countries)?.id).toBe('country:KR')
    expect(resolvePuzzleGuess('Deutschlnad', countries)?.id).toBe('country:DE')
    const ambiguous = ['country:IE', 'country:IS'].map((id) =>
      countries.find((country) => country.id === id)!,
    )
    expect(resolvePuzzleGuess('Ixland', ambiguous)).toBeUndefined()
  })

  it('akzeptiert jeden gleichnamigen Kennzeichenbezirk und wiederholt keine Bezirke', () => {
    const pool = plates.filter((plate) => plate.attributes.country === 'country:DE')
    const targets = pool.filter(
      (plate) => pool.find((other) => samePuzzlePlace(plate, other))!.id !== plate.id,
    )
    expect(targets.length).toBeGreaterThan(100)
    for (const target of targets) {
      const guess = resolvePuzzleGuess(target.names.de, pool)!
      expect(guess, target.names.de).toBeDefined()
      expect(samePuzzlePlace(guess, target), target.names.de).toBe(true)
    }
  })

  it('akzeptiert LF für beide Landkreise und vermeidet gültige Kennzeichen-Distraktoren', () => {
    const c = ctx()
    const lf = c.byId.get('license_plate:DE-LF')!
    for (const id of ['license_plate:DE-BGL', 'license_plate:DE-TS']) {
      const place = c.byId.get(id)!
      expect(sharePlatePlace(place, lf)).toBe(true)
      const input = registry.get('city_to_plate_input')!.make(place, c, createRng('lf'), 2)!
      expect(checkAnswer(input, 'LF', c)).toBe(true)
    }
    for (const target of c.plates.filter((plate) => plate.attributes.country === 'country:DE')) {
      const q = registry.get('plate_to_city')!.make(target, c, createRng(target.id), 2)!
      for (const option of q.options!.filter((option) => option.id !== q.answer))
        expect(platePlaceKeys(target), q.id).not.toContain(normalizeAnswer(option.label))
    }
  })

  it('stellt bei Russland die statistische Weltregion mit Quelle klar', () => {
    const c = ctx()
    const ru = c.byId.get('country:RU')!
    const q = Array.from({ length: 12 }, (_, seed) =>
      registry.get('country_attribute')!.make(ru, c, createRng(seed), 2)!,
    ).find((q) => q.type === 'country_continent')!
    expect(q.answer).toBe('europe')
    expect(q.explanation).toContain('statistischen UN-Einteilung')
    expect(q.sources?.[0].url).toBe('https://unstats.un.org/unsd/methodology/m49/')
  })

  it('unterscheidet bei Zypern die gebräuchliche Europa-Zuordnung von UN-M49', () => {
    const c = ctx()
    const cy = c.byId.get('country:CY')!
    expect(cy.attributes.continent).toBe('europe')
    const q = Array.from({ length: 12 }, (_, seed) =>
      registry.get('country_attribute')!.make(cy, c, createRng(seed), 2)!,
    ).find((q) => q.type === 'country_continent')!
    expect(q.answer).toBe('asia')
  })

  it('unterscheidet beanspruchte Hauptstädte auch im Städte-Eintippmodus', () => {
    const c = ctx()
    const city = c.byId.get('city:PS-ostjerusalem')!
    expect(registry.get('city_input')!.make(city, c, createRng('ps'), 2)!.prompt.key).toBe(
      'q.claimed_capital_input',
    )
  })

  it('führt bei BK beide Bundesländer als gültig und bietet keines als Falschantwort an', () => {
    const c = ctx()
    const plate = c.byId.get('license_plate:DE-BK')!
    for (let seed = 0; seed < 20; seed++) {
      const q = registry.get('plate_to_region')!.make(plate, c, createRng(seed), 2)!
      expect(
        q.options!.filter((option) => ['region:DE-BW', 'region:DE-ST'].includes(option.id)),
      ).toHaveLength(1)
      expect(q.explanation).toContain('Sachsen-Anhalt')
    }
  })
})

describe('rng', () => {
  it('ist deterministisch', () => {
    const a = createRng('2026-09-18')
    const b = createRng('2026-09-18')
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()])
  })
})

describe('session', () => {
  it('erzeugt Flaggenrunde mit 10 gültigen Fragen', () => {
    const s = buildSession(ctx(), setup({ category: 'flags', scope: 'world', length: 10 }), { seed: 'test' })
    expect(s.questions).toHaveLength(10)
    for (const { question: q } of s.questions) {
      if (q.options) {
        expect(q.options).toHaveLength(4)
        expect(q.options.some((o) => o.id === q.answer)).toBe(true)
        expect(new Set(q.options.map((o) => o.label || o.id)).size).toBe(4)
      }
      expect(checkAnswer(q, q.answer) || q.question_type === 'text_input').toBe(true)
    }
  })
  it('„Alle“ deckt jede Entity genau einmal ab und lässt sich fortsetzen', () => {
    const c = ctx('europe')
    const pool = poolFor(c, setup({ category: 'flags' }))
    let s = buildSession(c, setup({ category: 'flags', scope: 'europe', length: 'all' }), { seed: 'all' })
    const seen = new Set<string>()
    while (true) {
      for (const q of s.questions) seen.add(q.question.entities[0])
      if (!s.remaining?.length) break
      const before = s.questions.length
      s = extendSession(s, c)
      expect(s.questions.length).toBeGreaterThan(before)
    }
    expect(seen.size).toBe(pool.size)
    expect(s.questions.length).toBe(pool.size)
  })
  it('Bereich country:DE liefert Regionen-Fragen', () => {
    const s = buildSession(
      ctx('country:DE'),
      setup({ category: 'regions', scope: 'country:DE', length: 'all' }),
      { seed: 'de' },
    )
    expect(s.questions.length).toBe(16)
  })
  it('stellt in einem einzelnen Land keine triviale Region-zu-Land-Frage', () => {
    for (const category of ['countries', 'flags'] as const) {
      const s = buildSession(
        ctx('country:DE'),
        setup({ category, scope: 'country:DE', content: ['region'], length: 10 }),
        { seed: `no-trivial-country-${category}` },
      )
      expect(s.questions.length).toBe(10)
      expect(s.questions.map(({ question }) => question.metadata?.generator)).not.toContain(
        'region_to_country',
      )
      expect(s.questions.map(({ question }) => question.metadata?.generator)).not.toContain(
        'region_flag_to_country',
      )
    }
  })
  it('verteilt weltweite Regionen am Rundenanfang über verschiedene Länder', () => {
    for (const seed of ['region-mix-a', 'region-mix-b', 'region-mix-c']) {
      const c = ctx('world')
      const s = buildSession(
        c,
        setup({
          category: 'countries',
          mode: 'region_to_country',
          scope: 'world',
          content: ['region'],
          length: 10,
        }),
        { seed },
      )
      const parentCountries = s.questions.map(
        ({ question }) => c.byId.get(question.entities[0])?.attributes.country,
      )
      expect(parentCountries).toHaveLength(10)
      expect(new Set(parentCountries).size, seed).toBe(10)
    }
  })
  it('jede Kategorie hat Fragen im Welt-Bereich', () => {
    for (const cat of [
      'flags',
      'countries',
      'capitals',
      'regions',
      'cities',
      'maps',
      'images',
      'landmarks',
      'license_plates',
      'languages',
      'water',
      'nature',
      'mixed',
    ] as const) {
      const s = buildSession(ctx(), setup({ category: cat, scope: 'world', length: 5 }), { seed: cat })
      expect(s.questions.length, cat).toBe(5)
    }
  })
  it('Eingabefragen akzeptieren Namen und Aliasse', () => {
    const s = buildSession(
      ctx(),
      setup({ category: 'flags', scope: 'world', length: 5, mode: 'flag_input', content: ['country'] }),
      { seed: 'inp' },
    )
    for (const { question: q } of s.questions) {
      const target = countries.find((c) => c.id === q.answer)!
      expect(checkAnswer(q, target.names.de)).toBe(true)
      if (target.names.en) expect(checkAnswer(q, target.names.en)).toBe(true)
    }
  })
})

describe('plates', () => {
  it('Kennzeichen-Runde für Deutschland', () => {
    const s = buildSession(
      ctx('country:DE'),
      setup({ category: 'license_plates', scope: 'country:DE', length: 10 }),
      { seed: 'pl' },
    )
    expect(s.questions).toHaveLength(10)
    const q = s.questions[0].question
    if (q.options) expect(q.options.some((o) => o.id === q.answer)).toBe(true)
  })
  it('Kennzeichen-Runde für Polen nutzt amtliche geografische Kürzel', () => {
    const polish = plates.filter((plate) => plate.attributes.country === 'country:PL')
    expect(polish.length).toBeGreaterThan(300)
    const s = buildSession(
      ctx('country:PL'),
      setup({ category: 'license_plates', scope: 'country:PL', length: 10 }),
      { seed: 'poland' },
    )
    expect(s.questions).toHaveLength(10)
    expect(
      s.questions.every(({ question }) => question.entities.some((id) => id.startsWith('license_plate:PL-'))),
    ).toBe(true)
  })
  it('akzeptiert beim Modus Ort → Kennzeichen alle gültigen Kürzel des Ortes', () => {
    const s = buildSession(
      ctx('country:DE'),
      setup({ category: 'license_plates', scope: 'country:DE', length: 10, mode: 'city_to_plate_input' }),
      { seed: 'plate-input' },
    )
    expect(s.questions).toHaveLength(10)
    for (const { question } of s.questions) {
      expect(question.question_type).toBe('text_input')
      expect(question.accepted).toContain(question.answer)
      expect(checkAnswer(question, question.answer)).toBe(true)
      expect(question.media).toBeUndefined()
    }
  })
})

describe('landmarks', () => {
  it('liefert zu jeder Sehenswürdigkeit mindestens drei Kurzfakten', () => {
    expect(landmarks.length).toBeGreaterThanOrEqual(150)
    for (const landmark of landmarks)
      expect(landmark.attributes.facts, landmark.id).toEqual(expect.arrayContaining([expect.any(String)]))
    expect(landmarks.every((landmark) => (landmark.attributes.facts as string[]).length >= 3)).toBe(true)
  })

  it('zeigt Fakten auch in Auswahl- und Eingabefragen', () => {
    for (const mode of ['landmark_to_country', 'landmark_to_country_input']) {
      const s = buildSession(ctx(), setup({ category: 'landmarks', scope: 'world', length: 10, mode }), {
        seed: mode,
      })
      expect(
        s.questions.every(({ question }) => (question.facts?.length ?? 0) >= 3),
        mode,
      ).toBe(true)
    }
  })
})

describe('Schriften & Sprachen', () => {
  it('enthält belastbare russische und griechische Lernkarten', () => {
    expect(scriptWords).toHaveLength(131)
    expect(scriptWords.filter((entity) => entity.attributes.language === 'ru').length).toBeGreaterThan(60)
    expect(scriptWords.filter((entity) => entity.attributes.language === 'el').length).toBeGreaterThan(55)
    for (const entity of scriptWords) {
      expect(entity.attributes.original).toBeTruthy()
      expect(entity.attributes.transliteration).toBeTruthy()
      expect(entity.attributes.accepted).toContain(entity.attributes.transliteration)
    }
  })

  it('akzeptiert beim Eintippen internationale und deutsche Umschriften', () => {
    const s = buildSession(
      ctx(),
      setup({ category: 'languages', scope: 'world', length: 10, mode: 'script_input' }),
      { seed: 'scripts' },
    )
    expect(s.questions).toHaveLength(10)
    for (const { question } of s.questions) {
      expect(question.question_type).toBe('text_input')
      expect(checkAnswer(question, question.accepted![0])).toBe(true)
      expect(question.facts?.length).toBeGreaterThanOrEqual(1)
    }
    const rossiya = scriptWords.find((entity) => entity.id === 'script_word:ru-rossiya')!
    const question = registry.get('script_to_latin_input')!.make(rossiya, ctx(), createRng('rossiya'), 2)!
    expect(checkAnswer(question, 'Rossiya')).toBe(true)
    expect(checkAnswer(question, 'Rossija')).toBe(true)
  })

  it('hält Rückwärtsfragen eindeutig und verrät das Original nicht im Prompt', () => {
    const s = buildSession(
      ctx(),
      setup({ category: 'languages', scope: 'world', length: 20, mode: 'latin_to_script' }),
      { seed: 'reverse-scripts' },
    )
    expect(s.questions).toHaveLength(20)
    for (const { question } of s.questions) {
      expect(question.options).toHaveLength(4)
      expect(new Set(question.options!.map((option) => option.label)).size).toBe(4)
      expect(question.prompt.params?.text).toBeTruthy()
    }
  })
})

describe('nature', () => {
  it('Flussfragen im Bereich Deutschland nutzen Mehrländer-Zuordnung', () => {
    const s = buildSession(ctx('country:DE'), setup({ category: 'water', scope: 'country:DE', length: 10 }), {
      seed: 'w',
    })
    expect(s.questions.length).toBeGreaterThan(3)
    for (const { question: q } of s.questions)
      if (q.options && q.question_type === 'multiple_choice')
        expect(q.options.some((o) => o.id === q.answer)).toBe(true)
  })
})

describe('maps', () => {
  it('Weltkarten-Fragen zielen nur auf anklickbare Länder', () => {
    const c = ctx('world')
    for (const [category, mode] of [
      ['maps', 'countries_on_map'],
      ['flags', 'flag_to_map'],
      ['water', 'on_map'],
      ['nature', 'on_map'],
    ] as const) {
      const s = buildSession(
        c,
        setup({
          category,
          mode,
          scope: 'world',
          length: 'all',
          content: category === 'flags' ? ['country'] : undefined,
        }),
        { seed: mode },
      )
      for (const q of s.questions)
        if (q.question.map?.kind === 'world')
          expect(c.byId.get(q.question.answer)?.attributes.on_world_map, q.question.answer).toBe(true)
    }
  })
})

describe('konfiguration', () => {
  it('fängt ungültige URL-Parameter ab', () => {
    const parsed = fromQuery('flags', new URLSearchParams('mode=kaputt&scope=moon&len=NaN'))
    expect(parsed).toMatchObject({ mode: 'auto', scope: 'world', length: 10 })
  })
  it('setzt einen im einzelnen Land trivialen Modus auf Automatisch zurück', () => {
    const parsed = fromQuery(
      'countries',
      new URLSearchParams('mode=region_to_country&scope=country:DE&len=10'),
    )
    expect(parsed).toMatchObject({ mode: 'auto', scope: 'country:DE' })
  })
  it('behält den optionalen Flaggen-Hinweisschutz in der URL', () => {
    const query = toQuery(setup({ category: 'flags', hideFlagHints: true }))
    expect(query).toContain('hide_hints=1')
    expect(fromQuery('flags', new URLSearchParams(query)).hideFlagHints).toBe(true)
  })
  it('jeder Fragetyp in config/quizzes.ts verweist auf registrierte Generatoren der richtigen Kategorie', () => {
    for (const quiz of QUIZZES) {
      const allowed = new Set([quiz.id, ...(quiz.mergedFrom ?? [])])
      for (const m of quiz.modes)
        for (const g of generatorsFor(quiz.id, m.id))
          expect(allowed.has(g.category), `${quiz.id}/${m.id}/${g.id}`).toBe(true)
    }
  })
  it('„Automatisch“ mischt nur Multiple Choice, wo es welches gibt (R10)', () => {
    expect(generatorsFor('flags').map((g) => g.id)).not.toContain('flag_to_country_input')
    expect(generatorsFor('maps').length).toBe(2) // nur Kartenfragen → alle
    expect(generatorsFor('countries', 'countries_on_map').map((g) => g.id)).toEqual(['country_on_map'])
    expect(generatorsFor('countries').map((g) => g.id)).toContain('region_to_country')
    expect(generatorsFor('mixed').map((g) => g.id)).not.toContain('region_to_flag')
  })
  it('Fragetyp ohne Eintrag liefert keine Generatoren', () => {
    expect(generatorsFor('flags', 'gibt_es_nicht')).toEqual([])
  })
})

describe('vollständiges Quiz-Inhaltsaudit', () => {
  it('hat für jedes angebotene Kartenziel eine tatsächlich anklickbare Fläche', () => {
    const c = ctx()
    const shapesByFile = new Map<string, Set<string>>()
    for (const generator of registry.values()) {
      for (const target of generator.pool(c)) {
        const q = generator.make(target, c, createRng(`map-audit:${target.id}`), 2)
        if (!q?.map) continue
        const file =
          q.map.kind === 'world'
            ? 'data/geo/world.json'
            : q.map.kind === 'europe'
              ? 'media/maps/regions/europe.json'
              : (c.byId.get(q.answer)!.attributes.map as string)
        expect(file, q.id).toBeTypeOf('string')
        if (!shapesByFile.has(file)) {
          const map = JSON.parse(readFileSync(join('public', file), 'utf8'))
          shapesByFile.set(
            file,
            new Set(
              map.features
                ? map.features.map((feature: { properties: { id: string } }) => feature.properties.id)
                : map.shapes.map((shape: { flagId: string }) =>
                    shape.flagId.replace(/^region-/, 'region:').replace(/^country-/, 'country:'),
                  ),
            ),
          )
        }
        expect(shapesByFile.get(file)!.has(q.answer), `${q.id}/${file}`).toBe(true)
      }
    }
  }, 15_000)
  const translations = JSON.parse(
    readFileSync(join(process.cwd(), 'locales/de/common.json'), 'utf8'),
  ) as Record<string, unknown>
  const translation = (key: string) =>
    key
      .split('.')
      .reduce<unknown>(
        (value, part) =>
          value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined,
        translations,
      )

  it('verwendet ausschließlich den kuratierten Pool aus Staaten und anerkannten Sonderfällen', () => {
    const sovereign = countries.filter(isSovereign)
    expect(sovereign).toHaveLength(197)
    expect(sovereign.map((country) => country.attributes.iso2)).not.toEqual(
      expect.arrayContaining(['AC', 'EU', 'IC', 'TA']),
    )
  })

  it('erzeugt für jedes Ziel jedes Generators eine vollständige, auflösbare Frage', () => {
    const c = ctx('world')
    for (const generator of registry.values()) {
      const targets = generator.pool(c)
      expect(targets.length, `${generator.id}: leerer Pool`).toBeGreaterThan(0)
      for (const target of targets) {
        const q = generator.make(target, c, createRng(`audit:${generator.id}:${target.id}`), 2)
        expect(q, `${generator.id}/${target.id}: keine Frage`).not.toBeNull()
        if (!q) continue
        expect(translation(q.prompt.key), `${q.id}: Übersetzung ${q.prompt.key}`).toBeTypeOf('string')
        expect(Object.values(q.prompt.params ?? {}), `${q.id}: leere Prompt-Parameter`).not.toContain('')
        expect(q.difficulty, `${q.id}: Schwierigkeit`).toBeGreaterThanOrEqual(1)
        expect(q.difficulty, `${q.id}: Schwierigkeit`).toBeLessThanOrEqual(3)
        expect(q.metadata.generator, q.id).toBe(generator.id)
        for (const entityId of q.entities)
          expect(c.byId.has(entityId), `${q.id}: unbekannte Entity ${entityId}`).toBe(true)
        if (q.options) {
          expect(
            q.options.some((option) => option.id === q.answer),
            `${q.id}: Lösung fehlt`,
          ).toBe(true)
          expect(new Set(q.options.map((option) => option.id)).size, `${q.id}: doppelte Options-ID`).toBe(
            q.options.length,
          )
          if (q.question_type !== 'image_choice')
            expect(
              new Set(q.options.map((option) => option.label)).size,
              `${q.id}: doppelte Beschriftung`,
            ).toBe(q.options.length)
          for (const option of q.options)
            if (option.image)
              expect(
                existsSync(join(process.cwd(), 'public', option.image.replace(/^\//, ''))),
                `${q.id}: ${option.image}`,
              ).toBe(true)
        }
        if (q.question_type === 'text_input')
          expect(q.accepted?.length, `${q.id}: keine Texteingaben`).toBeGreaterThan(0)
        if (q.media?.url)
          expect(
            existsSync(join(process.cwd(), 'public', q.media.url.replace(/^\//, ''))),
            `${q.id}: ${q.media.url}`,
          ).toBe(true)
        if (q.map) {
          expect(q.map.targetId, q.id).toBe(q.answer)
          expect(c.byId.has(q.answer), `${q.id}: unbekanntes Kartenziel`).toBe(true)
        }
      }
    }
  }, 15_000)

  it('bietet alle sichtbaren Modi mit mindestens vier belastbaren Fragen an', () => {
    const c = ctx('world')
    for (const quiz of PLAY_QUIZZES) {
      for (const mode of quiz.modes) {
        if (mode.scopes && !mode.scopes.includes('world')) continue
        expect(
          poolFor(c, setup({ category: quiz.id, mode: mode.id, content: mode.content })).size,
          `${quiz.id}/${mode.id}`,
        ).toBeGreaterThanOrEqual(4)
      }
    }
  })
})

describe('regeln', () => {
  it('R10: Automatisch enthält keine Eintipp- oder Kartenfragen', () => {
    for (const cat of ['flags', 'capitals', 'cities', 'water', 'languages'] as const) {
      const s = buildSession(ctx(), setup({ category: cat, scope: 'world', length: 30 }), { seed: 'auto' })
      for (const q of s.questions)
        expect(['multiple_choice', 'image_choice', 'true_false']).toContain(q.question.question_type)
    }
  })
  it('R3: ISO-Code wird beim Eintippen akzeptiert', () => {
    const s = buildSession(
      ctx(),
      setup({ category: 'flags', scope: 'world', length: 3, mode: 'flag_input', content: ['country'] }),
      { seed: 'iso' },
    )
    const q = s.questions[0].question
    expect(checkAnswer(q, countries.find((c) => c.id === q.answer)!.attributes.iso2 as string)).toBe(true)
  })
  it('R7: Überspringen zählt als Fehler ohne Wiederholung', () => {
    let s = buildSession(
      ctx('europe'),
      setup({ category: 'flags', scope: 'europe', length: 2, mode: 'europe_map' }),
      { seed: 'skip' },
    )
    s = skipQuestion(s)
    expect(s.questions[0].correct).toBe(false)
    expect(s.questions).toHaveLength(2)
  })
})

describe('srs + level', () => {
  it('steigt bei richtigen Antworten und fällt bei falschen', () => {
    let p = initialProgress('country:DE')
    for (let i = 0; i < 6; i++) p = review(p, true, new Date(2026, 0, 1 + i * 30))
    expect(p.state).toBe('mastered')
    p = review(p, false)
    expect(p.state).toBe('learning')
    expect(p.intervalDays).toBe(0)
  })
  it('Levelformel', () => {
    expect([1, 2, 3, 4].map(xpForLevel)).toEqual([0, 100, 250, 450])
    expect(levelForXp(300).level).toBe(3)
    expect(levelForXp(0).level).toBe(1)
  })
})

describe('recordAnswer', () => {
  it('reiht falsche Antworten vier Positionen später erneut ein und zählt Streak-Punkte', () => {
    let s = buildSession(
      ctx('europe'),
      setup({
        category: 'flags',
        scope: 'europe',
        length: 10,
        mode: 'flag_to_name',
        content: ['country'],
        repeat: true,
      }),
      { seed: 'rep' },
    )
    const q0 = s.questions[0].question
    const wrong = q0.options!.find((o) => o.id !== q0.answer)!.id
    s = recordAnswer(s, wrong)
    expect(s.questions).toHaveLength(11)
    expect(baseQuestionTotal(s)).toBe(10)
    expect(baseQuestionPosition(s)).toBe(1)
    expect(pendingRepeatCount(s)).toBe(1)
    expect(s.questions[4].repeated).toBe(true)
    expect(s.questions[4].question.answer).toBe(q0.answer)
    s = { ...s, position: 1 }
    s = recordAnswer(s, s.questions[1].question.answer)
    s = { ...s, position: 2 }
    s = recordAnswer(s, s.questions[2].question.answer)
    expect(s.points).toBe(100 + 115)
    expect(s.streak).toBe(2)
  })
  it('Kartenfragen bleiben bei Fehlklick offen und zählen Versuche', () => {
    let s = buildSession(
      ctx('europe'),
      setup({ category: 'maps', scope: 'europe', length: 3, mode: 'countries_on_map' }),
      { seed: 'map' },
    )
    const q = s.questions[0].question
    s = recordAnswer(s, 'country:XX')
    expect(s.questions[0].given).toBeUndefined()
    expect(s.questions[0].attempts).toBe(1)
    s = recordAnswer(s, q.answer)
    expect(s.questions[0].given).toBe(q.answer)
    expect(s.questions[0].correct).toBe(false) // nicht beim ersten Versuch
    expect(s.questions).toHaveLength(3) // keine Wiederholung bei Karten
  })
  it('Distraktoren schließen optisch identische Flaggen aus', () => {
    const c = ctx('world')
    const s = buildSession(
      c,
      setup({ category: 'flags', scope: 'world', length: 'all', mode: 'flag_to_name', content: ['country'] }),
      { seed: 'vk' },
    )
    for (const { question: q } of s.questions) {
      const vk = c.byId.get(q.answer)?.attributes.visual_key
      if (!vk) continue
      for (const o of q.options!)
        if (o.id !== q.answer) expect(c.byId.get(o.id)?.attributes.visual_key).not.toBe(vk)
    }
  })
})
