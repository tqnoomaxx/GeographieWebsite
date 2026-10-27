import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Entity } from '@/domain/types'
import {
  CITY_RECALL_DEFAULT,
  cityMinimum,
  validCityMinimum,
  type RecallCity,
  type RecallCountry,
} from '@/domain/cityRecall'
import {
  withRecallCities,
  acceptCityRecall,
  cityRecallHits,
  finishCityRecall,
  recallCitiesFromSession,
} from './cityRecall'
import { buildContext } from './context'
import { baseQuestionPosition, buildSession } from './session'
import { fromQuery, toQuery, type RoundConfig } from './round'

const read = <T>(file: string): T => JSON.parse(readFileSync('public/data/' + file, 'utf8'))
const countries = read<Entity[]>('entities/countries.json')
const germany = read<RecallCountry>('city-recall/DE.json')
const config = (minimum = 175001): RoundConfig => ({
  category: 'cities',
  exercise: 'city-recall',
  mode: 'input',
  scope: 'country:DE',
  length: 'all',
  repeat: false,
  minPopulation: minimum,
})
const context = (data = germany) =>
  withRecallCities(
    buildContext({
      countries,
      cities: [],
      landmarks: [],
      regions: [],
      relationships: [],
      scope: data.country,
    }),
    data,
  )
const session = (minimum?: number, data?: RecallCountry) =>
  buildSession(context(data), config(minimum), { seed: 'recall' })
const city = (id: string, name: string, population: number, aliases: string[] = []): RecallCity => ({
  id: 'city:' + id,
  name,
  population,
  aliases,
  lat: 50,
  lon: 10,
  geonameId: id,
})

describe('Städte sammeln mit beliebiger Einwohnergrenze', () => {
  it('behält einen frei gewählten Grenzwert über URL und gespeicherte Runde', () => {
    const setup = config(175001)
    expect(fromQuery('cities', new URLSearchParams(toQuery(setup)))).toMatchObject(setup)
    expect(JSON.parse(JSON.stringify(session(175001))).setup.minPopulation).toBe(175001)
    for (const n of [15000, 50000, 175001, 800000, 1e9]) expect(validCityMinimum(n)).toBe(true)
    for (const n of [0, 14999, -1, NaN, Infinity, 175000.5, 1e9 + 1]) {
      expect(validCityMinimum(n)).toBe(false)
      expect(cityMinimum(n)).toBe(CITY_RECALL_DEFAULT)
    }
  })
  it('verwendet strikt größer und lädt alle Ziele, auch weit mehr als 25', () => {
    const data = {
      country: 'country:DE',
      cities: [city('1', 'Unterhalb', 175000), city('2', 'Grenze', 175001), city('3', 'Darüber', 175002)],
    }
    expect(session(175001, data).questions.map((q) => q.question.place?.name)).toEqual(['Darüber'])
    const full = session(15000)
    expect(full.questions.length).toBe(germany.cities.length)
    expect(full.questions.length).toBeGreaterThan(500)
    expect(full.remaining).toEqual([])
    expect(full.setup).toMatchObject({ length: 'all', repeat: false })
    expect(baseQuestionPosition(full)).toBe(0)
  })
  it('nimmt vollständige Namen und Umlaut-Aliasse in freier Reihenfolge an', () => {
    let s = session()
    const original = s
    for (const input of ['Berli', 'Berlinxxx', 'Paris', '']) expect(acceptCityRecall(s, input)).toBe(original)
    s = acceptCityRecall(s, 'Muenchen')
    s = acceptCityRecall(s, 'BERLIN')
    expect(s.score).toBe(2)
    expect(baseQuestionPosition(s)).toBe(2)
    expect(
      s.questions
        .filter((q) => q.correct)
        .map((q) => q.question.place?.name)
        .sort(),
    ).toEqual(['Berlin', 'München'])
    expect(acceptCityRecall(s, 'Munich')).toBe(s)
    expect(acceptCityRecall(s, 'Berlin')).toBe(s)
    expect(s.points).toBeGreaterThan(0)
  })
  it('zählt alle gleichnamigen Orte; ein Hauptname hat Vorrang vor fremden Aliasen', () => {
    let s = session(15000, {
      country: 'country:DE',
      cities: [
        city('1', 'Neustadt', 90000),
        city('2', 'Neustadt', 80000),
        city('3', 'Anderswo', 70000, ['Neustadt']),
      ],
    })
    expect(cityRecallHits(s, 'Neustadt')).toHaveLength(2)
    s = acceptCityRecall(s, 'Neustadt')
    expect(s.score).toBe(2)
    expect(acceptCityRecall(s, 'Neustadt')).toBe(s)
    expect(s.questions.find((q) => q.question.place?.name === 'Anderswo')?.given).toBeUndefined()
  })
  it('setzt mit Ortsdaten-Snapshot fort und verhindert Eingaben nach Auflösung', () => {
    const saved = JSON.parse(JSON.stringify(acceptCityRecall(session(), 'Berlin')))
    const data = recallCitiesFromSession(saved)
    expect(data.country).toBe('country:DE')
    expect(data.cities).toHaveLength(saved.questions.length)
    expect(context(data).byId.get(germany.cities.find((c) => c.name === 'Berlin')!.id)?.names.de).toBe(
      'Berlin',
    )
    expect(acceptCityRecall(saved, 'Muenchen').score).toBe(2)
    const done = finishCityRecall(saved)
    expect(done.questions.every((q) => q.given !== undefined)).toBe(true)
    expect(done.questions.filter((q) => q.correct)).toHaveLength(1)
    expect(done.score).toBe(1)
    expect(acceptCityRecall(done, 'Muenchen')).toBe(done)
    expect(acceptCityRecall({ ...saved, completedAt: new Date().toISOString() }, 'Muenchen').score).toBe(1)
  })
})
