import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { EXERCISES, exerciseFor, exerciseScopeAllowed } from '@/config/quizCatalog'
import { withRecallCities } from './cityRecall'
import type { RecallCountry } from '@/domain/cityRecall'
import { resourcesForQuiz } from '@/app/dataRequirements'
import { buildContext } from './context'
import { acceptProfileInput, buildSession, checkAnswer, extendSession, poolFor } from './session'
import { fromQuery, toQuery, type RoundConfig } from './round'
import type { Entity, Relationship } from '@/domain/types'
import { isSovereign } from './generators/base'
const read = <T>(name: string): T => JSON.parse(readFileSync('public/data/' + name, 'utf8'))
const data = {
  countries: read<Entity[]>('entities/countries.json'),
  cities: read<Entity[]>('entities/cities.json'),
  landmarks: read<Entity[]>('entities/landmarks.json'),
  rivers: read<Entity[]>('entities/rivers.json'),
  lakes: read<Entity[]>('entities/lakes.json'),
  mountains: read<Entity[]>('entities/mountains.json'),
  scriptWords: read<Entity[]>('entities/script-words.json'),
  courseCards: read<Entity[]>('entities/language-courses.json'),
  languageSamples: read<Entity[]>('entities/language-samples.json'),
  trivia: read<Entity[]>('entities/trivia.json'),
  regions: readdirSync('public/data/entities/regions').flatMap((f) =>
    read<Entity[]>('entities/regions/' + f),
  ),
  plates: readdirSync('public/data/entities/license-plates').flatMap((f) =>
    read<Entity[]>('entities/license-plates/' + f),
  ),
  relationships: read<Relationship[]>('relationships/index.json'),
}
const ctx = (scope = 'world') => buildContext({ ...data, scope })
const setup = (id: string, mode?: string, scope?: string): RoundConfig => {
  const q = exerciseFor(id)!
  return {
    category: q.topic,
    exercise: id,
    mode: mode ?? Object.keys(q.variants)[0],
    scope: scope ?? q.defaultScope ?? 'world',
    length: 10,
    repeat: false,
  }
}
describe('gemeinsamer Quizkatalog', () => {
  for (const q of EXERCISES)
    for (const form of Object.keys(q.variants))
      it(`${q.title} / ${form}: lädt nur benötigte Daten und erzeugt die gewählte Aufgabe`, () => {
        const config = setup(q.id, form)
        const resources = resourcesForQuiz(q.topic, config)
        const subset = Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, resources.includes(key as never) ? value : []]),
        ) as typeof data
        const recall = q.kind === 'city-recall' ? read<RecallCountry>('city-recall/DE.json') : undefined
        const context = withRecallCities(buildContext({ ...subset, scope: config.scope }), recall)
        const session = buildSession(context, config, { seed: 'catalog:' + q.id + form })
        expect(session.questions.length).toBeGreaterThan(0)
        expect([...poolFor(context, config).keys()].sort()).toEqual(
          [...poolFor(withRecallCities(ctx(config.scope), recall), config).keys()].sort(),
        )
        for (const item of session.questions) {
          if (q.topic === 'mixed') expect(item.question.category).not.toBe('mixed')
          else expect(item.question.category).toBe(q.topic)
          expect(
            q.variants[form as keyof typeof q.variants]?.includes(item.question.metadata.generator) ||
              q.topic === 'mixed',
          ).toBe(true)
        }
      })
  it('hält Eingabeart und Sammlung beim Speichern und Fortsetzen fest', () => {
    const config = { ...setup('read-greek', 'input'), length: 'all' as const }
    expect(fromQuery(config.category, new URLSearchParams(toQuery(config)))).toMatchObject(config)
    const cities = { ...setup('large-cities'), collection: 'all_cities' }
    expect(fromQuery('cities', new URLSearchParams(toQuery(cities)))).toMatchObject(cities)
  })
  it('ändert beim Wechsel auf Eingabe weder die griechische Schrift noch den Flussfilter', () => {
    for (const id of ['read-greek', 'river-country', 'lake-country']) {
      const config = setup(id, id === 'read-greek' ? 'input' : 'map')
      const pool = poolFor(ctx(), config)
      for (const { entity } of pool.values())
        expect(id === 'read-greek' ? entity.attributes.language : entity.type).toBe(
          id === 'read-greek' ? 'el' : id === 'river-country' ? 'river' : 'lake',
        )
    }
  })
  it('verbietet triviale Länderzuordnung innerhalb desselben Landes', () => {
    expect(exerciseScopeAllowed(exerciseFor('large-cities')!, 'country:DE', 'choice')).toBe(false)
    expect(exerciseScopeAllowed(exerciseFor('landmark-country')!, 'country:DE', 'input')).toBe(false)
  })
  it('bietet Europa als Karten-Sammlung ohne erzwungene Alle-Runde an', () => {
    const config = setup('regional-flags', 'map', 'europe')
    const session = buildSession(ctx('europe'), config, { seed: 'europe' })
    expect(session.questions).toHaveLength(10)
    expect(session.questions.every((q) => q.question.map?.kind === 'europe')).toBe(true)
  })
  it('mischt Themen statt überwiegend große Datensammlungen zu ziehen', () => {
    const session = buildSession(ctx(), setup('mixed-round'), { seed: 'balanced' })
    const topics = new Set(
      session.questions.map(
        (q) => EXERCISES.find((e) => e.variants.choice?.includes(q.question.metadata.generator))?.topic,
      ),
    )
    expect(topics.size).toBeGreaterThanOrEqual(7)
  })
})
describe('Länderprofil', () => {
  it('erzeugt fünf beantwortbare Felder für jedes Land, einschließlich Nauru und Mikronesien', () => {
    let session = buildSession(ctx(), { ...setup('country-profile'), length: 'all' }, { seed: 'profiles' })
    while (session.remaining?.length) session = extendSession(session, ctx())
    expect(session.questions).toHaveLength(data.countries.filter(isSovereign).length)
    for (const { question: q } of session.questions) {
      expect(q.profileFields).toHaveLength(5)
      expect(q.profileFields!.every((f) => f.answers.length && f.display)).toBe(true)
    }
    expect(
      session.questions.find((q) => q.question.answer === 'country:NR')?.question.profileFields?.[0].label,
    ).toBe('Regierungssitz')
  })
  it('übernimmt vollständige Treffer in beliebiger Reihenfolge, keine Teilwörter oder doppelten Antworten', () => {
    let session = buildSession(ctx(), { ...setup('country-profile'), only: ['country:DE'] }, { seed: 'DE' })
    const original = session
    expect(acceptProfileInput(session, 'Berli')).toBe(original)
    session = acceptProfileInput(session, 'eur')
    expect(session.questions[0].profileAnswers).toEqual({ currency: 'eur' })
    expect(acceptProfileInput(session, 'euro')).toBe(session)
    session = acceptProfileInput(session, 'berlin')
    session = acceptProfileInput(session, 'DE')
    session = acceptProfileInput(session, 'Europa')
    expect(session.questions[0].given).toBeUndefined()
    session = acceptProfileInput(session, 'Deutsch')
    expect(session.questions[0].correct).toBe(true)
    expect(session.score).toBe(1)
    expect(acceptProfileInput(session, 'Deutsch')).toBe(session)
    expect(checkAnswer(session.questions[0].question, '{}')).toBe(false)
    expect(JSON.parse(JSON.stringify(session)).questions[0].profileAnswers.capital).toBe('berlin')
  })
  it('unterscheidet Internet-Endung und ISO-Kürzel auch bei freier Eingabereihenfolge', () => {
    let session = buildSession(
      ctx(),
      {
        ...setup('country-profile'),
        fields: ['capital', 'language', 'iso2', 'calling_code', 'tld'],
        only: ['country:DE'],
      },
      { seed: 'domain' },
    )
    session = acceptProfileInput(session, '.de')
    expect(session.questions[0].profileAnswers).toEqual({ tld: '.de' })
    session = acceptProfileInput(session, 'DE')
    expect(session.questions[0].profileAnswers).toEqual({ tld: '.de', iso2: 'DE' })
  })
  it('tauscht Kategorien aus und behält ihre Feldzuordnung in der URL', () => {
    const config = {
      ...setup('country-profile'),
      fields: ['capital', 'language', 'iso2', 'calling_code', 'tld'],
    }
    const parsed = fromQuery('countries', new URLSearchParams(toQuery(config)))
    const session = buildSession(ctx(), parsed, { seed: 'custom' })
    expect(session.questions[0].question.profileFields?.map((f) => f.id)).toEqual(config.fields)
  })
})
