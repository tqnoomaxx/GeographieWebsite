import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Entity, Relationship } from '@/domain/types'
import { buildContext } from './context'
import { defaultRound, fromQuery, toQuery } from './round'
import { buildSession, extendSession, poolFor } from './session'
import { createRng } from './rng'
import { SCOPES } from './scope'
import { largeCityToCountry } from './generators/regionsCities'

const read = <T>(file: string): T => JSON.parse(readFileSync(`public/data/${file}`, 'utf8'))
const countries = read<Entity[]>('entities/countries.json')
const cities = read<Entity[]>('entities/cities.json')
const relationships = read<Relationship[]>('relationships/index.json')
const context = (scope = 'world', cityList = cities) =>
  buildContext({
    countries,
    cities: cityList,
    relationships,
    landmarks: [],
    regions: [],
    scope,
  })

describe('Großstädte über 300.000', () => {
  it('wählt den Modus beim ersten Besuch und erhält die Auswahl in der Runden-URL', () => {
    const setup = { ...defaultRound('cities'), scope: 'europe', length: 'all' as const }
    expect(setup.mode).toBe('cities_over_300k')
    expect(fromQuery('cities', new URLSearchParams(toQuery(setup)))).toMatchObject(setup)
  })

  it('schließt genau 300.000, fehlende Werte und unbestätigte Altbestände aus', () => {
    const template = cities.find((city) => city.attributes.geonames_population)!
    const fixtures = [299_999, 300_000, 300_001, undefined].map((population, index) => ({
      ...template,
      id: `city:test-${index}`,
      attributes: { ...template.attributes, population: 900_000, geonames_population: population },
    }))
    expect(largeCityToCountry.pool(context('world', fixtures)).map((c) => c.id)).toEqual(['city:test-2'])
  })

  it('übernimmt den weltweiten Auszug ohne Limit je Land und mit Quellenbelegen', () => {
    const pool = largeCityToCountry.pool(context())
    expect(pool.length).toBeGreaterThan(1_500)
    expect(new Set(pool.map((c) => c.attributes.geonames)).size).toBe(pool.length)
    expect(pool.filter((c) => c.attributes.country === 'country:CN').length).toBeGreaterThan(100)
    for (const city of pool) {
      expect(city.attributes.geonames_population).toBeGreaterThan(300_000)
      expect(city.location).toBeDefined()
      expect(city.provenance.fields?.geonames_population.source).toBe('GeoNames')
    }
  })

  it.each(SCOPES.filter((scope) => scope !== 'world'))(
    'enthält in %s jede Stadt genau einmal, auch nach dem Nachladen einer Alle-Runde',
    (scope) => {
      const ctx = context(scope)
      const setup = { ...defaultRound('cities'), scope, length: 'all' as const, repeat: false }
      const expected = cities.filter(
        (city) =>
          Number(city.attributes.geonames_population) > 300_000 &&
          (city.attributes.continent ?? ctx.byId.get(city.attributes.country!)?.attributes.continent) ===
            scope,
      )
      const pool = poolFor(ctx, setup)
      expect(pool.size).toBe(expected.length)
      expect(pool.size).toBeGreaterThanOrEqual(4)
      let session = buildSession(ctx, setup, { seed: `large-cities-${scope}` })
      while (session.remaining?.length) session = extendSession(session, ctx)
      const ids = session.questions.map(({ question }) => question.entities[0])
      expect(ids.length).toBe(expected.length)
      expect(new Set(ids)).toEqual(new Set(expected.map((city) => city.id)))
      for (const { question } of session.questions) {
        expect(question.type).toBe('large_city_to_country')
        expect(question.options).toHaveLength(4)
        expect(new Set(question.options!.map((option) => option.id)).size).toBe(4)
        expect(question.options!.some((option) => option.id === question.answer)).toBe(true)
        expect(question.answer).toBe(ctx.byId.get(question.entities[0])?.attributes.country)
        expect(question.sources?.[0].url).toMatch(/^https:\/\/www.geonames.org\/\d+\/$/)
      }
    },
  )

  it('unterscheidet gleichnamige Städte, ohne sie auszulassen', () => {
    const originals = cities
      .filter((city) => Number(city.attributes.geonames_population) > 300_000)
      .slice(0, 2)
    const fixtures = originals.map((city) => ({ ...city, names: { de: 'Gleicher Name' } }))
    const ctx = context('world', fixtures)
    expect(largeCityToCountry.pool(ctx)).toHaveLength(2)
    const prompts = fixtures.map(
      (city) => largeCityToCountry.make(city, ctx, createRng(city.id), 2)!.prompt.params!.name,
    )
    expect(prompts[0]).not.toBe(prompts[1])
    expect(prompts.every((name) => String(name).includes('°'))).toBe(true)
  })
})
