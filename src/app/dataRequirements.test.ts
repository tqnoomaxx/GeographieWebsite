import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resourcesForQuiz, resourcesForPage } from './dataRequirements'
import { QUIZZES } from '@/config/quizzes'
import { buildContext } from '@/engine/context'
import { poolFor } from '@/engine/session'
import type { Entity, Relationship } from '@/domain/types'

const read = <T>(file: string): T => JSON.parse(readFileSync(`public/data/${file}`, 'utf8'))
const all = {
  countries: read<Entity[]>('entities/countries.json'),
  cities: read<Entity[]>('entities/cities.json'),
  landmarks: read<Entity[]>('entities/landmarks.json'),
  rivers: read<Entity[]>('entities/rivers.json'),
  lakes: read<Entity[]>('entities/lakes.json'),
  mountains: read<Entity[]>('entities/mountains.json'),
  trivia: read<Entity[]>('entities/trivia.json'),
  scriptWords: read<Entity[]>('entities/script-words.json'),
  regions: readdirSync('public/data/entities/regions').flatMap((file) =>
    read<Entity[]>(`entities/regions/${file}`),
  ),
  plates: readdirSync('public/data/entities/license-plates').flatMap((file) =>
    read<Entity[]>(`entities/license-plates/${file}`),
  ),
  relationships: read<Relationship[]>('relationships/index.json'),
}

describe('bedarfsgerechte Datenpakete', () => {
  it('lädt auf der Startseite keine Quizpakete und im Flaggen-Schnellstart keine Regionen', () => {
    expect(resourcesForPage('/', new URLSearchParams())).toEqual(['index', 'countries'])
    expect(
      resourcesForPage('/play/flags/round', new URLSearchParams('mode=flag_to_name&content=country')),
    ).toEqual(['index', 'countries'])
    expect(resourcesForPage('/play/trivia/round', new URLSearchParams())).toEqual([
      'index',
      'countries',
      'trivia',
    ])
  })
  for (const quiz of QUIZZES)
    it(`${quiz.id}: erhält alle Fragetypen und Karten ohne fremde Pakete`, () => {
      for (const mode of ['auto', ...quiz.modes.map((mode) => mode.id)]) {
        const resources = resourcesForQuiz(quiz.id, { mode })
        const subset = Object.fromEntries(
          Object.entries(all).map(([key, values]) => [key, resources.includes(key as never) ? values : []]),
        ) as typeof all
        const setup = { category: quiz.id, mode }
        for (const scope of ['world', 'europe', 'country:DE']) {
          const expected = poolFor(buildContext({ ...all, scope }), setup)
          const actual = poolFor(buildContext({ ...subset, scope }), setup)
          expect([...actual.keys()].sort(), `${quiz.id}/${mode}/${scope}`).toEqual(
            [...expected.keys()].sort(),
          )
        }
      }
    })
})
