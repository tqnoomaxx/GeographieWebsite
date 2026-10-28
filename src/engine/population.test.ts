import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { Country } from '@/domain/types'
import { buildContext } from './context'
import { registry } from './registry'
import { createRng } from './rng'
import { buildSession } from './session'
import { refreshCountryFacts } from './countryFacts'

const countries = (
  JSON.parse(readFileSync('public/data/entities/countries.json', 'utf8')) as Country[]
).filter((country) => ['country:IN', 'country:CN'].includes(country.id))
const india = countries.find((country) => country.id === 'country:IN')!
const china = countries.find((country) => country.id === 'country:CN')!
const context = () =>
  buildContext({ countries, cities: [], landmarks: [], regions: [], relationships: [], scope: 'world' })

describe('population comparisons', () => {
  it('uses India as the correct answer against China in either option order', () => {
    const ctx = context()
    const questions = countries
      .flatMap((target) =>
        Array.from({ length: 30 }, (_, seed) =>
          registry.get('country_comparison')!.make(target, ctx, createRng(seed), 2)!,
        ),
      )
      .filter((question) => question.type === 'country_population_compare')
    expect(questions.length).toBeGreaterThan(15)
    for (const question of questions) {
      expect(question.answer).toBe(india.id)
      expect(question.explanation).toContain('1,48 Mrd.')
      expect(question.facts).toEqual(['Mittlere UN-Projektion zum 01.07.2026.'])
      expect(question.sources?.[0].url).toBe('https://population.un.org/wpp/')
    }
  })

  it('also corrects the true/false comparison in both directions', () => {
    const ctx = context()
    for (const target of [india, china]) {
      const questions = Array.from({ length: 30 }, (_, seed) =>
        registry.get('country_true_false')!.make(target, ctx, createRng(seed), 2)!,
      ).filter((question) => question.prompt.key === 'q.population_compare')
      expect(questions.length).toBeGreaterThan(5)
      for (const question of questions) expect(question.answer).toBe(String(target.id === india.id))
    }
  })

  it.each(['country_comparison', 'country_true_false'])(
    'repairs an unanswered saved %s question while keeping played history',
    (generator) => {
      const ctx = context()
      const question = Array.from({ length: 30 }, (_, seed) =>
        registry.get(generator)!.make(india, ctx, createRng(seed), 2)!,
      ).find(
        (question) =>
          question.type === 'country_population_compare' || question.prompt.key === 'q.population_compare',
      )!
      expect(question).toBeDefined()
      const stale = {
        ...question,
        answer: generator === 'country_comparison' ? china.id : 'false',
        explanation: 'Indien: 1,33 Mrd.',
      }
      const session = buildSession(
        ctx,
        {
          category: 'countries',
          exercise: 'country-size',
          mode: 'choice',
          scope: 'world',
          length: 10,
          repeat: false,
        },
        { seed: 'old-population' },
      )
      session.questions = [{ question: stale, given: stale.answer, correct: true }, { question: stale }]
      session.position = 1
      session.score = 125
      const refreshed = refreshCountryFacts(session, ctx)
      expect(refreshed.questions[0]).toBe(session.questions[0])
      expect(refreshed.score).toBe(125)
      expect(refreshed.position).toBe(1)
      expect(refreshed.questions[1].question.answer).toBe(question.answer)
      expect(refreshed.questions[1].question.entities).toEqual(question.entities)
      expect(refreshed.questions[1].question.explanation).toBe(question.explanation)
      expect(
        refreshCountryFacts({ ...session, completedAt: '2026-10-01' }, ctx).questions[1].question.answer,
      ).toBe(stale.answer)
    },
  )
})
