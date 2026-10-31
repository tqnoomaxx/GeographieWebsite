import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Country } from '@/domain/types'
import { MAP_THEMES, matchesMapSearch, themeGroups, themeValue, type CountryMapFacts } from './mapThemes'
const countries: Country[] = JSON.parse(readFileSync('public/data/entities/countries.json', 'utf8'))
const facts: CountryMapFacts = JSON.parse(readFileSync('public/data/meta/country-map-facts.json', 'utf8'))
const country = (iso: string) => countries.find((country) => country.attributes.iso2 === iso)!
describe('Themenkarten', () => {
  it('sucht Vorwahlen als Präfix und unterstützt Namen sowie Ländercodes', () => {
    for (const query of ['+49', '49', '0049'])
      expect(
        countries.filter((country) => matchesMapSearch(country, facts, 'calling', query)).map((c) => c.id),
      ).toEqual(['country:DE'])
    expect(matchesMapSearch(country('DE'), facts, 'calling', 'deutsch')).toBe(true)
    expect(matchesMapSearch(country('GB'), facts, 'driving', 'links')).toBe(true)
    expect(matchesMapSearch(country('DE'), facts, 'currencies', 'EUR')).toBe(true)
  })
  it('enthält einen nachvollziehbaren Datensatz für jedes Land und Gebiet', () => {
    const ids = countries.filter((c) => c.attributes.iso2 !== 'EU').map((c) => c.id)
    expect(Object.keys(facts.countries).sort()).toEqual(ids.sort())
    expect(facts.source.revision).toMatch(/^[a-f0-9]{40}$/)
    for (const c of countries)
      for (const theme of MAP_THEMES) {
        const value = themeValue(c, facts, theme.id)
        expect(typeof value.label).toBe('string')
        expect(
          value.group === 'unknown' || themeGroups(theme.id).some((group) => group.id === value.group),
        ).toBe(true)
      }
  })
  it('behandelt geteilte Vorwahlen und mehrere Gebietskennzahlen vollständig', () => {
    for (const [iso, code] of [
      ['DE', '+49'],
      ['GB', '+44'],
      ['US', '+1'],
      ['CA', '+1'],
      ['RU', '+7'],
      ['KZ', '+7'],
      ['EH', '+212'],
      ['VA', '+39'],
    ])
      expect(themeValue(country(iso), facts, 'calling').label).toBe(code)
    expect(facts.countries['country:DO'].callingCodes).toEqual(['+1809', '+1829', '+1849'])
    expect(facts.countries['country:PR'].callingCodes).toEqual(['+1787', '+1939'])
    expect(themeValue(country('AQ'), facts, 'calling').group).toBe('unknown')
  })
  it('unterscheidet Links-/Rechtsverkehr und behauptet keinen Standard für Antarktis', () => {
    for (const iso of ['GB', 'JP', 'AU', 'IN', 'ZA', 'NZ'])
      expect(themeValue(country(iso), facts, 'driving').label).toBe('Linksverkehr')
    for (const iso of ['DE', 'US', 'FR', 'CA', 'CN', 'KR'])
      expect(themeValue(country(iso), facts, 'driving').label).toBe('Rechtsverkehr')
    expect(themeValue(country('AQ'), facts, 'driving').group).toBe('unknown')
  })
  it('zeigt Internet-Endungen und sämtliche Währungen aus dem Länderbestand', () => {
    expect(themeValue(country('DE'), facts, 'domains').label).toBe('.de')
    expect(themeValue(country('DE'), facts, 'currencies').group).toBe('EUR')
    for (const c of countries) {
      const value = themeValue(c, facts, 'currencies')
      for (const currency of c.attributes.currencies ?? []) expect(value.label).toContain(currency.code)
    }
  })
})
