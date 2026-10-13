import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Entity, Relationship } from '@/domain/types'
import { buildContext } from './context'
import { refreshCountryFacts } from './countryFacts'
import { registry } from './registry'
import { createRng } from './rng'
import { buildSession, checkAnswer } from './session'
import { pickDailyFrom } from '@/features/daily/puzzles'

const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8'))
const landmarks = read<Entity[]>('public/data/entities/landmarks.json')
const additions = read<Array<{ id: string }>>('scripts/content/landmark-expansion.json')
const ctx = buildContext({
  countries: read<Entity[]>('public/data/entities/countries.json'),
  cities: read<Entity[]>('public/data/entities/cities.json'),
  landmarks,
  relationships: read<Relationship[]>('public/data/relationships/index.json'),
  regions: [],
  scope: 'world',
})

describe('expanded landmark photos', () => {
  it('makes every added landmark playable with a photograph and its German and English names', () => {
    const generator = registry.get('image_to_landmark_input')!
    const pool = new Set(generator.pool(ctx).map((entity) => entity.id))
    for (const addition of additions) {
      const landmark = ctx.byId.get(`landmark:${addition.id}`)!
      expect(pool.has(landmark.id), landmark.id).toBe(true)
      const question = generator.make(landmark, ctx, createRng(landmark.id), 2)!
      expect(question.media?.kind).toBe('photo')
      expect(checkAnswer(question, landmark.names.de)).toBe(true)
      expect(checkAnswer(question, landmark.names.en!)).toBe(true)
      expect(question.facts?.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('refreshes a stale photograph in a saved round while preserving played history and score', () => {
    const session = buildSession(
      ctx,
      { category: 'landmarks', mode: 'image_to_landmark', scope: 'world', length: 5, repeat: false },
      { seed: 'saved-logo' },
    )
    const landmark = ctx.byId.get('landmark:cn-tower')!
    const question = registry.get('image_to_landmark')!.make(landmark, ctx, createRng('cn'), 2)!
    const stale = { ...question, media: { ...question.media!, url: '/old-cn-logo.webp' } }
    session.questions = [{ question: stale, given: landmark.id, correct: true }, { question: stale }]
    session.score = 150
    session.position = 1
    const updated = refreshCountryFacts(session, ctx)
    expect(updated.questions[0]).toBe(session.questions[0])
    expect(updated.score).toBe(150)
    expect(updated.position).toBe(1)
    expect(updated.questions[1].question.answer).toBe(landmark.id)
    expect(updated.questions[1].question.media?.url).toBe(question.media?.url)
    expect(updated.questions[1].question.media?.url).not.toContain('logo')
  })

  it('keeps the daily photo pool stable on the introduction day and adds new pictures the next day', () => {
    const date = '2026-10-13'
    const available = (day: string) =>
      landmarks.filter(
        (landmark) =>
          !landmark.attributes.daily_available_from ||
          String(landmark.attributes.daily_available_from) <= day,
      )
    const addedIds = new Set(additions.map((item) => `landmark:${item.id}`))
    expect(available(date).some((landmark) => addedIds.has(landmark.id))).toBe(false)
    expect(available('2026-10-14')).toHaveLength(landmarks.length)
    const original = landmarks.filter(
      (landmark) =>
        !addedIds.has(landmark.id) &&
        ![
          'bahrain-world-trade-center',
          'hassan-ii-mosque',
          'independence-monument-cambodia',
          'little-mermaid',
          'monas',
          'sheikh-zayed-mosque',
          'sultan-qaboos-mosque',
        ].includes(landmark.id.slice(9)),
    )
    expect(pickDailyFrom(available(date), 'bildle', date)?.id).toBe(
      pickDailyFrom(original, 'bildle', date)?.id,
    )
  })
})
