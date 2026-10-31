import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cityRecallGeometry } from './cityRecallGeometry'
import type { RecallCountry } from '@/domain/cityRecall'
import type { Entity } from '@/domain/types'
const read = <T>(file: string): T => JSON.parse(readFileSync('public/data/' + file, 'utf8'))
const countries = read<Entity[]>('entities/countries.json')
describe('Geografische Städtekarte', () => {
  for (const iso of ['DE', 'FR', 'US', 'RU', 'NZ'])
    for (const width of [288, 950])
      it(`${iso} bei ${width}px: projiziert alle Ziele in den sichtbaren Kartenausschnitt`, () => {
        const country = countries.find((c) => c.id === 'country:' + iso)!
        const cities = read<RecallCountry>('city-recall/' + iso + '.json').cities.filter(
          (c) => c.population > 175001,
        )
        const geometry = read<GeoJSON.Geometry>('geo/outlines/' + iso + '.json')
        const height = width < 600 ? 340 : 520
        const map = cityRecallGeometry(
          geometry,
          cities,
          iso,
          [country.location!.lon, country.location!.lat],
          width,
          height,
        )
        expect(map.path(map.geometry!)).toBeTruthy()
        for (const city of cities) {
          const point = map.projection([city.lon, city.lat])
          expect(point, city.name).not.toBeNull()
          expect(point![0], city.name).toBeGreaterThanOrEqual(0)
          expect(point![0], city.name).toBeLessThanOrEqual(width)
          expect(point![1], city.name).toBeGreaterThanOrEqual(0)
          expect(point![1], city.name).toBeLessThanOrEqual(height)
        }
      })
  it('zeigt eine Umgebung für Kleinstaaten ohne Umriss', () => {
    const cities = read<RecallCountry>('city-recall/SG.json').cities
    const map = cityRecallGeometry(undefined, cities, 'SG', [103.8, 1.3], 288, 340)
    expect(map.geometry).toBeUndefined()
    for (const c of cities) expect(map.projection([c.lon, c.lat])?.every(Number.isFinite)).toBe(true)
  })
})

it('zeigt auch bei der kleinsten Grenze alle Ziele aller verfügbaren Länder', () => {
  const index = read<{ countries: Record<string, { file: string; hasOutline: boolean }> }>(
    'city-recall/index.json',
  )
  for (const [id, entry] of Object.entries(index.countries)) {
    const country = countries.find((c) => c.id === id)!
    const cities = read<RecallCountry>(entry.file).cities
    const geometry = entry.hasOutline
      ? read<GeoJSON.Geometry>('geo/outlines/' + id.slice(8) + '.json')
      : undefined
    const map = cityRecallGeometry(
      geometry,
      cities,
      id.slice(8),
      [country.location!.lon, country.location!.lat],
      950,
      520,
    )
    for (const city of cities) {
      const point = map.projection([city.lon, city.lat])
      expect(point, id + ':' + city.name).not.toBeNull()
      expect(point!.every(Number.isFinite), id + ':' + city.name).toBe(true)
      expect(point![0], id + ':' + city.name).toBeGreaterThanOrEqual(0)
      expect(point![0], id + ':' + city.name).toBeLessThanOrEqual(950)
      expect(point![1], id + ':' + city.name).toBeGreaterThanOrEqual(0)
      expect(point![1], id + ':' + city.name).toBeLessThanOrEqual(520)
    }
  }
})

it('zeigt die ganze Welt auch mit wenigen Städten auf schmalen Karten', () => {
  for (const width of [288, 950]) {
    const map = cityRecallGeometry(undefined, [], 'world', [13, 52], width, 520)
    expect(map.path({ type: 'Sphere' })).toBeTruthy()
    for (const point of [
      [-179, -70],
      [179, 70],
      [13, 52],
      [-74, 40],
    ]) {
      const projected = map.projection(point)!
      expect(projected[0]).toBeGreaterThanOrEqual(0)
      expect(projected[0]).toBeLessThanOrEqual(width)
      expect(projected[1]).toBeGreaterThanOrEqual(0)
      expect(projected[1]).toBeLessThanOrEqual(520)
    }
  }
})
