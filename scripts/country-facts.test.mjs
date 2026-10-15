import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { applyCountryQuizFacts } from './lib/country-quiz-facts.mjs'
import { applyLicensePlateFacts } from './lib/license-plate-facts.mjs'

const read = (path) => JSON.parse(readFileSync(`public/data/entities/${path}`, 'utf8'))

describe('belegte Datenkorrekturen', () => {
  it('bewahrt Zyperns abweichende UN-M49-Weltregion bei erneuten Importen', () => {
    const countries = read('countries.json')
    const cy = countries.find((country) => country.attributes.iso2 === 'CY')
    expect(cy.attributes.statistical_region).toBe('asia')
    cy.attributes.statistical_region = 'europe'
    applyCountryQuizFacts(countries)
    expect(cy.attributes.statistical_region).toBe('asia')
    expect(cy.provenance.fields.statistical_region.source_url).toContain('unstats.un.org')
  })
  it('bewahrt ZiG und die korrekte Pfund-Bezeichnung bei erneuten Importen', () => {
    const countries = read('countries.json')
    const gb = countries.find((country) => country.attributes.iso2 === 'GB')
    const zw = countries.find((country) => country.attributes.iso2 === 'ZW')
    expect(gb.attributes.currencies[0].name).toBe('Pfund Sterling')
    expect(zw.attributes.currencies[0].code).toBe('ZWG')
    expect(zw.attributes.currencies.some((currency) => ['ZWL', 'ZWB'].includes(currency.code))).toBe(false)
    gb.attributes.currencies[0].name = 'Wirtschaft des Vereinigten Königreichs'
    zw.attributes.currencies = [
      { code: 'ZWB', name: 'Zimbabwean bonds' },
      { code: 'USD', name: 'US-Dollar' },
    ]
    applyCountryQuizFacts(countries)
    expect(gb.attributes.currencies[0].name).toBe('Pfund Sterling')
    expect(zw.attributes.currencies.map((currency) => currency.code)).toEqual(['ZWG', 'USD'])
    const once = structuredClone(countries)
    applyCountryQuizFacts(countries)
    expect(countries).toEqual(once)
  })

  it('hält historische Erfurt-Kürzel aus aktuellen Leipzig-/Laufen-Fragen heraus', () => {
    const plates = read('license-plates/DE.json')
    const l = plates.find((plate) => plate.attributes.code === 'L')
    const lf = plates.find((plate) => plate.attributes.code === 'LF')
    expect(l.names.de).toBe('Leipzig')
    expect(l.attributes.region).toBe('region:DE-SN')
    expect(lf.attributes.districts).toContain('Landkreis Traunstein')
    for (const plate of [l, lf]) {
      expect([plate.names.de, ...plate.aliases, ...plate.attributes.districts]).not.toContain('Erfurt')
      plate.names.de = 'Erfurt'
    }
    applyLicensePlateFacts(plates)
    expect(l.names.de).toBe('Leipzig')
    expect(lf.names.de).toBe('Berchtesgadener Land')
    const once = structuredClone(plates)
    applyLicensePlateFacts(plates)
    expect(plates).toEqual(once)
  })
})
