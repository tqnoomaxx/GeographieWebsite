import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { TriviaQuestion } from '@/domain/types'
import { buildContext } from './context'
import { geographyTrivia } from './generators/trivia'
import { createRng } from './rng'
import { buildSession, extendSession, baseQuestionTotal, checkAnswer, poolFor } from './session'
import { defaultRound } from './round'
import { generatorsFor } from './registry'
import { SCOPES } from './scope'
import { refreshCountryFacts } from './countryFacts'
import { buildStationProgress } from '@/features/play/stationProgress'
import { emptyStats } from '@/services/progress/types'

const trivia = JSON.parse(readFileSync('public/data/entities/trivia.json', 'utf8')) as TriviaQuestion[]
const context = (scope = 'world') => buildContext({ countries: [], cities: [], landmarks: [], regions: [], relationships: [], trivia, scope })
const setup = { ...defaultRound('trivia'), mode: 'trivia_questions', repeat: false }

describe('Geographie-Trivia', () => {
  it('hat 60 eindeutige, belegte und spielbare Fragen', () => {
    const ctx = context()
    expect(new Set(trivia.map((card) => card.id)).size).toBe(60)
    expect(new Set(trivia.map((card) => card.names.de)).size).toBe(60)
    for (const card of trivia) {
      const q = geographyTrivia.make(card, ctx, createRng(card.id), 2)!
      expect(q).not.toBeNull()
      expect(new Set(q.options?.map((option) => option.label)).size).toBe(4)
      expect(checkAnswer(q, q.answer)).toBe(true)
      for (const wrong of q.options!.filter((option) => option.id !== q.answer)) {
        expect(checkAnswer(q, wrong.id)).toBe(false)
      }
      expect(q.explanation?.length).toBeGreaterThan(30)
      expect(q.sources?.[0].url).toMatch(/^https:\/\//)
      expect(ctx.byId.has(q.entities[0])).toBe(true)
    }
  })

  it('grenzt Kontinente ein und mischt allgemeine Erdfragen nur in Welt', () => {
    expect(poolFor(context(), setup).size).toBe(60)
    for (const scope of SCOPES.filter((scope) => scope !== 'world')) {
      const ctx = context(scope)
      expect(poolFor(ctx, setup).size).toBe(8)
      expect(ctx.trivia.every((card) => card.attributes.continent === scope)).toBe(true)
    }
    expect(poolFor(context('country:DE'), setup).size).toBe(0)
  })

  it('stellt vollständige Runden ohne doppelte Karten und setzt Alle fort', () => {
    const ctx = context()
    const round = buildSession(ctx, { ...setup, length: 50 }, { seed: 'trivia-50' })
    expect(round.questions.length).toBe(50)
    expect(new Set(round.questions.map((q) => q.question.id)).size).toBe(50)
    let all = buildSession(ctx, { ...setup, length: 'all' }, { seed: 'trivia-all' })
    expect(baseQuestionTotal(all)).toBe(60)
    while (all.remaining?.length) all = extendSession(all, ctx)
    expect(all.questions.length).toBe(60)
    expect(new Set(all.questions.map((q) => q.question.id)).size).toBe(60)
  })

  it('nutzt Trivia in Gemischt und zählt den eigenen Stationsfortschritt', () => {
    expect(generatorsFor('mixed').some((g) => g.id === geographyTrivia.id)).toBe(true)
    const stats = emptyStats()
    stats.byCategory.trivia = { answered: 50, correct: 42 }
    expect(buildStationProgress(stats, []).trivia).toMatchObject({ value: 50, level: 1, unit: 'questions' })
  })

  it('aktualisiert unbeantwortete gespeicherte Fragen und bewahrt gespielte Antworten', () => {
    const ctx = context()
    const session = buildSession(ctx, setup, { seed: 'trivia-refresh' })
    session.questions[0].given = session.questions[0].question.answer
    session.questions[0].correct = true
    session.questions[1].question.explanation = 'Veraltete Erklärung'
    const refreshed = refreshCountryFacts(session, ctx)
    expect(refreshed.questions[0]).toBe(session.questions[0])
    expect(refreshed.questions[1].question.explanation).not.toBe('Veraltete Erklärung')
  })
})
