import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { geoArea, geoBounds } from 'd3-geo'
import type { Entity } from '@/domain/types'
import { hasMapGeometry, mapGeometry } from '@/domain/mapFeatures'
import { buildContext } from './context'
import { registry } from './registry'
import { createRng } from './rng'
import { buildSession, checkAnswer } from './session'
import { refreshCountryFacts } from './countryFacts'

const read = (kind: string): Entity[] => JSON.parse(readFileSync(`public/data/entities/${kind}.json`, 'utf8'))
const data = {
  countries: read('countries'),
  rivers: read('rivers'),
  lakes: read('lakes'),
  mountains: read('mountains'),
  cities: [],
  regions: [],
  landmarks: [],
  relationships: [],
}
const context = (scope = 'world') => buildContext({ ...data, scope })

describe('Direkte Kartenobjekte statt Länderantworten', () => {
  it.each([
    ['water_on_map', 'river:Q584'],
    ['water_on_map', 'river:Q3392'],
    ['water_on_map', 'lake:Q5484'],
    ['mountain_on_map', 'mountain:Q513'],
  ])('%s akzeptiert nur das gesuchte Objekt %s, auch an Ländergrenzen', (generator, id) => {
    const ctx = context()
    const target = ctx.byId.get(id)!
    const gen = registry.get(generator)!
    expect(gen.pool(ctx)).toContain(target)
    const question = gen.make(target, ctx, createRng(id), 2)!
    expect(question.answer).toBe(id)
    expect(question.map).toMatchObject({ kind: 'features', targetId: id, featureType: target.type })
    expect(checkAnswer(question, id)).toBe(true)
    for (const country of target.attributes.countries as string[])
      expect(checkAnswer(question, country)).toBe(false)
    if (question.map?.kind === 'features') {
      expect(question.map.featureIds).toContain(id)
      expect(new Set(question.map.featureIds).size).toBe(question.map.featureIds.length)
      expect(question.map.featureIds.length).toBeGreaterThanOrEqual(4)
      expect(question.map.featureIds.every((key) => ctx.byId.get(key)?.type === target.type)).toBe(true)
    }
  })

  it('ersetzt fehlende Flussläufe niemals durch einen erfundenen Verlauf oder den Mündungspunkt', () => {
    const river = { ...data.rivers[0], mapGeometry: undefined }
    expect(hasMapGeometry(river)).toBe(false)
    expect(mapGeometry(river)).toBeUndefined()
    expect(hasMapGeometry({ ...data.mountains[0], location: undefined })).toBe(false)
  })

  it('enthält echte Linien / geschlossene Seeumrisse mit gültigen Koordinaten und richtiger Flächenausrichtung', () => {
    expect(data.rivers.filter(hasMapGeometry).length).toBeGreaterThan(190)
    expect(data.lakes.filter(hasMapGeometry).length).toBeGreaterThan(80)
    for (const entity of [...data.rivers, ...data.lakes].filter(hasMapGeometry)) {
      const geometry = mapGeometry(entity)!
      const bounds = geoBounds(geometry)
      expect(bounds.flat().every(Number.isFinite), entity.id).toBe(true)
      expect(geoArea(geometry), entity.id).toBeLessThan(2 * Math.PI)
      if (geometry.type === 'MultiPolygon')
        for (const polygon of geometry.coordinates)
          for (const ring of polygon) {
            expect(ring.length, entity.id).toBeGreaterThanOrEqual(4)
            expect(ring[0], entity.id).toEqual(ring[ring.length - 1])
          }
    }
  })

  it('stellt unbeantwortete Kartenfragen gespeicherter Runden um und erhält gespielte Antworten', () => {
    const ctx = context()
    const session = buildSession(
      ctx,
      {
        category: 'water',
        exercise: 'river-country',
        mode: 'map',
        scope: 'world',
        length: 'all',
        repeat: false,
        only: ['river:Q584'],
      },
      { seed: 'old-map' },
    )
    const legacy = {
      ...session.questions[0].question,
      answer: 'country:DE',
      map: { kind: 'world' as const, targetId: 'country:DE' },
    }
    session.questions[0] = { question: legacy }
    const refreshed = refreshCountryFacts(session, ctx)
    expect(refreshed.questions[0].question.map?.kind).toBe('features')
    expect(refreshed.questions[0].question.answer).toBe('river:Q584')
    session.questions[0] = { question: legacy, given: 'country:DE', correct: true }
    expect(refreshCountryFacts(session, ctx)).toBe(session)
  })
})
