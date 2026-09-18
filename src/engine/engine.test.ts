import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { buildContext } from './context'
import { buildSession, checkAnswer, extendSession, poolFor } from './session'
import { matchesAnswer, normalizeAnswer } from './normalize'
import { createRng } from './rng'
import { review, initialProgress } from './srs'
import { levelForXp, xpForLevel } from '@/config/levels'
import type { Entity, Relationship } from '@/domain/types'

const DATA = join(process.cwd(), 'public', 'data')
const read = <T,>(p: string): T => JSON.parse(readFileSync(join(DATA, p), 'utf8'))
const countries = read<Entity[]>('entities/countries.json')
const cities = read<Entity[]>('entities/cities.json')
const landmarks = read<Entity[]>('entities/landmarks.json')
const regions = readdirSync(join(DATA, 'entities/regions')).flatMap((f) => read<Entity[]>(`entities/regions/${f}`))
const relationships = read<Relationship[]>('relationships/index.json')
const ctx = (scope = 'world') => buildContext({ countries, cities, landmarks, regions, relationships, scope })

describe('normalize', () => {
  it('toleriert Umlaute, Diakritika und kleine Tippfehler', () => {
    expect(normalizeAnswer('Österreich')).toBe('oesterreich')
    expect(matchesAnswer('oesterreich', ['Österreich'])).toBe(true)
    expect(matchesAnswer('Sao Tome und Principe', ['São Tomé und Príncipe'])).toBe(true)
    expect(matchesAnswer('Deutschlnad', ['Deutschland'])).toBe(true)
    expect(matchesAnswer('Peru', ['Chile'])).toBe(false)
    expect(matchesAnswer('Iran', ['Irak'])).toBe(false)
  })
})

describe('rng', () => {
  it('ist deterministisch', () => {
    const a = createRng('2026-09-18')
    const b = createRng('2026-09-18')
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()])
  })
})

describe('session', () => {
  it('erzeugt Flaggenrunde mit 10 gültigen Fragen', () => {
    const s = buildSession(ctx(), { category: 'flags', scope: 'world', length: 10, seed: 'test' })
    expect(s.questions).toHaveLength(10)
    for (const { question: q } of s.questions) {
      if (q.options) {
        expect(q.options).toHaveLength(4)
        expect(q.options.some((o) => o.id === q.answer)).toBe(true)
        expect(new Set(q.options.map((o) => o.label || o.id)).size).toBe(4)
      }
      expect(checkAnswer(q, q.answer) || q.question_type === 'text_input').toBe(true)
    }
  })
  it('„Alle“ deckt jede Entity genau einmal ab und lässt sich fortsetzen', () => {
    const c = ctx('europe')
    const pool = poolFor('flags', c)
    let s = buildSession(c, { category: 'flags', scope: 'europe', length: 'all', seed: 'all' })
    const seen = new Set<string>()
    while (true) {
      for (const q of s.questions) seen.add(q.question.entities[0])
      if (!s.remaining?.length) break
      const before = s.questions.length
      s = extendSession(s, c)
      expect(s.questions.length).toBeGreaterThan(before)
    }
    expect(seen.size).toBe(pool.size)
    expect(s.questions.length).toBe(pool.size)
  })
  it('Bereich country:DE liefert Regionen-Fragen', () => {
    const s = buildSession(ctx('country:DE'), { category: 'regions', scope: 'country:DE', length: 'all', seed: 'de' })
    expect(s.questions.length).toBe(16)
  })
  it('jede Kategorie hat Fragen im Welt-Bereich', () => {
    for (const cat of ['flags', 'countries', 'capitals', 'regions', 'cities', 'maps', 'images', 'landmarks', 'mixed'] as const) {
      const s = buildSession(ctx(), { category: cat, scope: 'world', length: 5, seed: cat })
      expect(s.questions.length, cat).toBe(5)
    }
  })
  it('Eingabefragen akzeptieren Namen und Aliasse', () => {
    const s = buildSession(ctx(), { category: 'flags', scope: 'world', length: 5, seed: 'inp', generatorIds: ['flag_to_country_input'] })
    for (const { question: q } of s.questions) {
      const target = countries.find((c) => c.id === q.answer)!
      expect(checkAnswer(q, target.names.de)).toBe(true)
      if (target.names.en) expect(checkAnswer(q, target.names.en)).toBe(true)
    }
  })
})

describe('srs + level', () => {
  it('steigt bei richtigen Antworten und fällt bei falschen', () => {
    let p = initialProgress('country:DE')
    for (let i = 0; i < 6; i++) p = review(p, true, new Date(2026, 0, 1 + i * 30))
    expect(p.state).toBe('mastered')
    p = review(p, false)
    expect(p.state).toBe('learning')
    expect(p.intervalDays).toBe(0)
  })
  it('Levelformel', () => {
    expect([1, 2, 3, 4].map(xpForLevel)).toEqual([0, 100, 250, 450])
    expect(levelForXp(300).level).toBe(3)
    expect(levelForXp(0).level).toBe(1)
  })
})
