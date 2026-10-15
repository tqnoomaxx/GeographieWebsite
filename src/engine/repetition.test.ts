import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dueIds } from './repetition'
import { initialProgress, type EntityProgress } from './srs'
import { buildContext } from './context'
import { buildSession, poolFor } from './session'
import { defaultRound, fromQuery, toQuery } from './round'
import type { Country } from '@/domain/types'

const now = new Date('2026-10-15T12:00:00Z')
const countries = JSON.parse(readFileSync('public/data/entities/countries.json', 'utf8')) as Country[]
const ctx = buildContext({
  countries,
  cities: [],
  landmarks: [],
  regions: [],
  relationships: [],
  scope: 'world',
})
const due = (entityId: string, date = '2026-10-14T12:00:00Z'): EntityProgress => ({
  ...initialProgress(entityId, now),
  state: 'learning',
  wrong: 1,
  dueAt: date,
})

describe('persönliche Wiederholungen', () => {
  it('nimmt nur fällige, bereits gelernte und im Pool enthaltene Karten in stabiler Reihenfolge', () => {
    const progress = new Map([
      ['country:DE', due('country:DE')],
      ['country:FR', due('country:FR', '2026-10-13T12:00:00Z')],
      ['country:AT', due('country:AT', '2026-10-16T12:00:00Z')],
      ['country:CH', initialProgress('country:CH', now)],
      ['trivia:test', due('trivia:test')],
    ])
    expect(
      dueIds(
        ['country:DE', 'country:FR', 'country:FR', 'country:AT', 'country:CH', 'country:IT'],
        progress,
        now,
      ),
    ).toEqual(['country:FR', 'country:DE'])
  })
  for (const count of [1, 2, 3, 10])
    it(`spielt ${count} fällige Karten mit vier Antwortmöglichkeiten über bestehende URLs`, () => {
      const ids = [
        ...poolFor(ctx, { category: 'flags', mode: 'flag_to_name', content: ['country'] }).keys(),
      ].slice(0, count)
      const progress = new Map(ids.map((id) => [id, due(id)]))
      const only = dueIds(ids, progress, now).slice(0, 10)
      const setup = {
        ...defaultRound('flags'),
        mode: 'flag_to_name',
        content: ['country' as const],
        length: only.length,
        only,
      }
      const parsed = fromQuery('flags', new URLSearchParams(toQuery(setup)))
      const session = buildSession(ctx, parsed, { seed: `review-${count}`, progress })
      expect(session.questions).toHaveLength(count)
      expect(new Set(session.questions.map((item) => item.question.entities[0]))).toEqual(new Set(only))
      expect(session.questions.every((item) => item.question.options?.length === 4)).toBe(true)
      expect(session.setup.repeat).toBe(true)
    })
})
