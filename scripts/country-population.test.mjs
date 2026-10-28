import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { applyCountryPopulation } from './lib/country-population.mjs'

const read = (path) => JSON.parse(readFileSync(path, 'utf8'))
const countries = read('public/data/entities/countries.json')
const snapshot = read('scripts/data/country-population.json')
const sovereign = (country) =>
  country.attributes.independent === true || ['TW', 'XK', 'PS', 'VA'].includes(country.attributes.iso2)

describe('same-year UN country populations', () => {
  it('ranks India first, China second, and checks the complete top ten', () => {
    const ranking = countries
      .filter(sovereign)
      .sort((a, b) => b.attributes.population - a.attributes.population)
    expect(ranking.slice(0, 10).map((country) => country.attributes.iso2)).toEqual([
      'IN',
      'CN',
      'US',
      'ID',
      'PK',
      'NG',
      'BR',
      'BD',
      'RU',
      'ET',
    ])
    expect(ranking[0].attributes.population).toBe(1_476_625_576)
    expect(ranking[1].attributes.population).toBe(1_412_914_089)
  })

  it('covers every sovereign quiz country with the same date and UN projection, including Kosovo', () => {
    expect(Object.keys(snapshot.countries)).toHaveLength(237)
    for (const country of countries.filter(sovereign)) {
      const iso3 = country.attributes.iso2 === 'XK' ? 'XKX' : country.attributes.iso3
      expect(country.attributes.population, country.id).toBe(snapshot.countries[iso3])
      expect(country.provenance.fields.population).toMatchObject({
        source: snapshot.source,
        reference_date: '2026-07-01',
        method: 'projection',
      })
    }
    expect(countries.find((country) => country.id === 'country:TG').attributes.population).toBe(8_780_006)
  })

  it('replaces stale maximums and old conflicts, is idempotent and preserves unrelated facts', () => {
    const fixture = structuredClone(countries)
    const india = fixture.find((country) => country.id === 'country:IN')
    india.attributes.population = 1_326_093_247
    india.provenance.conflicts = [
      { field: 'population', values: [{ source: 'wikidata', value: 1_326_093_247 }] },
    ]
    const capital = india.attributes.capital
    expect(applyCountryPopulation(fixture)).toBe(237)
    expect(india.attributes.population).toBe(1_476_625_576)
    expect(india.provenance.conflicts).toBeUndefined()
    expect(india.attributes.capital).toBe(capital)
    const once = structuredClone(fixture)
    applyCountryPopulation(fixture)
    expect(fixture).toEqual(once)
  })
})
