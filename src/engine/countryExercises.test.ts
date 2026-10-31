import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Country, Entity, Relationship } from '@/domain/types'
import type { RecallIndex, RecallCountry } from '@/domain/cityRecall'
import { countryExercises } from './countryExercises'
import { buildContext } from './context'
import { buildSession } from './session'
import { fromQuery } from './round'
import { inScope } from './scope'
import { withRecallCities } from './cityRecall'
import { exerciseFor, exerciseScopeAllowed } from '@/config/quizCatalog'
const read = <T>(file: string): T => JSON.parse(readFileSync('public/data/' + file, 'utf8'))
const data = {
  countries: read<Country[]>('entities/countries.json'),
  cities: read<Entity[]>('entities/cities.json'),
  landmarks: read<Entity[]>('entities/landmarks.json'),
  regions: readdirSync('public/data/entities/regions').flatMap((file) =>
    read<Entity[]>('entities/regions/' + file),
  ),
  plates: readdirSync('public/data/entities/license-plates').flatMap((file) =>
    read<Entity[]>('entities/license-plates/' + file),
  ),
  rivers: read<Entity[]>('entities/rivers.json'),
  lakes: read<Entity[]>('entities/lakes.json'),
  mountains: read<Entity[]>('entities/mountains.json'),
  relationships: read<Relationship[]>('relationships/index.json'),
}
const recall = read<RecallIndex>('city-recall/index.json')
describe('Landbezogene Übungsauswahl', () => {
  for (const iso of ['DE', 'JP', 'NR', 'SG', 'LI', 'PL', 'US', 'CH', 'AD', 'GB'])
    it(`${iso}: angebotene Übungen behalten das Land und erzeugen passende Fragen`, () => {
      const scope = 'country:' + iso
      const ctx = buildContext({ ...data, scope })
      const options = countryExercises(ctx, recall)
      expect(options.some((option) => option.exercise.id === 'country-profile')).toBe(true)
      for (const option of options) {
        const url = new URL(option.href, 'https://atlas.test')
        const setup = fromQuery(option.exercise.topic, url.searchParams)
        expect(setup.scope).toBe(scope)
        expect(setup.mode).toBe(option.mode)
        expect(exerciseScopeAllowed(option.exercise, scope, option.mode)).toBe(true)
        let context = ctx
        if (option.exercise.kind === 'city-recall')
          context = withRecallCities(ctx, read<RecallCountry>(`city-recall/${iso}.json`))
        const session = buildSession(
          context,
          { ...setup, length: option.exercise.kind === 'city-recall' ? 'all' : 3 },
          { seed: 'country-choices' },
        )
        expect(session.questions.length, option.exercise.id).toBeGreaterThan(0)
        for (const { question } of session.questions) {
          expect(
            inScope(context.byId.get(question.entities[0])!, scope, context.byId),
            option.exercise.id,
          ).toBe(true)
          expect(question.metadata.scope).toBe(scope)
        }
      }
    })
  it('bietet keine trivialen Länderzuordnungen oder weltweiten Sprachquizze im Länderpanel an', () => {
    const options = countryExercises(buildContext({ ...data, scope: 'country:DE' }), recall)
    const ids = options.map((option) => option.exercise.id)
    expect(ids).not.toContain('country-flags')
    expect(ids).not.toContain('large-cities')
    expect(ids).not.toContain('landmark-country')
    expect(ids).not.toContain('mixed-round')
    expect(options.every((option) => option.exercise.topic !== 'languages')).toBe(true)
    for (const id of ['river-country', 'lake-country', 'mountain-country'])
      expect(options.find((option) => option.exercise.id === id)?.mode).toBe('map')
  })
  it('lässt fehlende Inhalte aus und behält bei dünner Datenlage das Länderprofil', () => {
    const ctx = buildContext({
      ...data,
      cities: [],
      regions: [],
      plates: [],
      landmarks: [],
      rivers: [],
      lakes: [],
      mountains: [],
      scope: 'country:NR',
    })
    const options = countryExercises(ctx)
    expect(options.map((option) => option.exercise.id)).toEqual(['country-profile'])
    expect(countryExercises(ctx, recall, () => false)).toEqual([])
  })
  it('erlaubt Naturkarten für einzelne Länder und schließt Länder-Raten dort aus', () => {
    for (const id of ['river-country', 'lake-country', 'mountain-country']) {
      const exercise = exerciseFor(id)!
      expect(exerciseScopeAllowed(exercise, 'country:DE', 'choice')).toBe(false)
      const setup = fromQuery(exercise.topic, new URLSearchParams({ quiz: id, scope: 'country:DE' }))
      expect(setup).toMatchObject({ scope: 'country:DE', mode: 'map' })
    }
  })
})
