import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { Country, Entity, Relationship } from '@/domain/types'
import { capitalIds } from '@/domain/capitals'
import { nationalSymbols } from '@/domain/nationalSymbols'
import { buildContext } from './context'
import { registry } from './registry'
import { createRng } from './rng'
import { buildSession, checkAnswer } from './session'
import { refreshCountryFacts } from './countryFacts'

const read = <T>(path: string): T => JSON.parse(readFileSync(`public/data/${path}`, 'utf8'))
const countries = read<Country[]>('entities/countries.json')
const cities = read<Entity[]>('entities/cities.json')
const relationships = read<Relationship[]>('relationships/index.json')
const context = (scope = 'world') =>
  buildContext({ countries, cities, relationships, landmarks: [], regions: [], scope })
const country = (iso: string) => countries.find((item) => item.attributes.iso2 === iso)!

describe('current capitals', () => {
  it.each(['Pretoria', 'Kapstadt', 'Cape Town', 'Bloemfontein'])('accepts %s for South Africa', (name) => {
    const ctx = context()
    const question = registry.get('capital_input')!.make(country('ZA'), ctx, createRng('za'), 2)!
    expect(checkAnswer(question, name)).toBe(true)
    expect(checkAnswer(question, 'Johannesburg')).toBe(false)
  })

  it.each([
    ['LK', 'Sri Jayewardenepura Kotte', 'Colombo'],
    ['GQ', 'Ciudad de la Paz', 'Malabo'],
    ['BO', 'Sucre', 'La Paz'],
    ['NL', 'Amsterdam', 'Den Haag'],
    ['BI', 'Gitega', 'Bujumbura'],
    ['TZ', 'Dodoma', 'Dar es Salaam'],
  ])(
    'uses the current capital of %s and excludes a former capital or government seat',
    (iso, current, old) => {
      const ctx = context()
      const question = registry.get('capital_input')!.make(country(iso), ctx, createRng(iso), 2)!
      expect(checkAnswer(question, current)).toBe(true)
      expect(checkAnswer(question, old)).toBe(false)
    },
  )

  it.each(['SZ', 'MY'])('accepts every documented capital of %s', (iso) => {
    const ctx = context()
    const question = registry.get('capital_input')!.make(country(iso), ctx, createRng(iso), 2)!
    for (const id of capitalIds(country(iso)))
      expect(checkAnswer(question, ctx.byId.get(id)!.names.de)).toBe(true)
  })

  it('keeps Nauru out of official-capital questions and uses the Swiss federal-city wording', () => {
    const ctx = context()
    expect(registry.get('capital_input')!.pool(ctx)).not.toContain(country('NR'))
    expect(registry.get('capital_input')!.make(country('CH'), ctx, createRng('ch'), 2)!.prompt.key).toBe(
      'q.federal_city_input',
    )
  })

  it('never offers another valid South African capital as a wrong answer, including scoped fallbacks', () => {
    for (const scope of ['world', 'africa', 'country:ZA']) {
      const ctx = context(scope)
      for (let seed = 0; seed < 60; seed++) {
        const question = registry
          .get('country_to_capital')!
          .make(country('ZA'), ctx, createRng(String(seed)), 2)!
        const valid = question.options!.filter((option) => capitalIds(country('ZA')).includes(option.id))
        expect(valid).toHaveLength(1)
        expect(valid[0].id).toBe(question.answer)
        for (const option of question.options!)
          expect(ctx.byId.get(option.id)!.attributes.is_capital).toBe(true)
      }
    }
  })

  it('uses all capitals in reverse questions and in the city text-input mode', () => {
    const ctx = context()
    const seen = new Set<string>()
    for (let seed = 0; seed < 80; seed++) {
      seen.add(
        registry.get('capital_to_country')!.make(country('ZA'), ctx, createRng(String(seed)), 2)!.entities[1],
      )
    }
    expect([...seen].sort()).toEqual(capitalIds(country('ZA')).sort())
    const question = registry
      .get('city_input')!
      .make(ctx.byId.get('city:ZA-pretoria')!, ctx, createRng('city'), 2)!
    expect(checkAnswer(question, 'Kapstadt')).toBe(true)
  })
})

describe('country symbols and saved rounds', () => {
  it('gives every country explicit symbol collections without inventing missing values', () => {
    for (const item of countries)
      for (const kind of ['animal', 'bird', 'flower', 'tree', 'fish'] as const) {
        expect(item.attributes.national_symbols?.[kind]).toBeInstanceOf(Array)
        for (const symbol of nationalSymbols(item, kind)) {
          expect(symbol.source_url).toMatch(/^https?:\/\//)
          expect(['official', 'established']).toContain(symbol.status)
        }
      }
    expect(country('PH').attributes.national_animal?.status).toBe('established')
    expect(country('PH').attributes.national_bird?.status).toBe('official')
    expect(country('IN').attributes.national_flower?.status).toBe('established')
    expect(country('ZA').attributes.languages).toContain('Südafrikanische Gebärdensprache')
  })

  it('excludes all valid national trees of El Salvador from wrong answers', () => {
    const ctx = context()
    const valid = nationalSymbols(country('SV'), 'tree').map((symbol) => symbol.name)
    for (let seed = 0; seed < 30; seed++) {
      const question = registry.get('national_tree')!.make(country('SV'), ctx, createRng(String(seed)), 2)!
      expect(question.options!.filter((option) => valid.includes(option.id))).toHaveLength(1)
    }
  })

  it('accepts either documented flower of Bolivia without using the other as a distractor', () => {
    const ctx = context()
    const valid = nationalSymbols(country('BO'), 'flower').map((symbol) => symbol.name)
    expect(valid).toEqual(['Kantuta', 'Patujú'])
    const seen = new Set<string>()
    for (let seed = 0; seed < 40; seed++) {
      const question = registry.get('national_flower')!.make(country('BO'), ctx, createRng(String(seed)), 2)!
      expect(question.options!.filter((option) => valid.includes(option.id))).toHaveLength(1)
      expect(checkAnswer(question, question.answer)).toBe(true)
      seen.add(question.answer as string)
    }
    expect([...seen].sort()).toEqual([...valid].sort())
  })

  it('refreshes unanswered saved questions while preserving played answers and score', () => {
    const ctx = context()
    const session = buildSession(
      ctx,
      { category: 'capitals', mode: 'capital_input', scope: 'world', length: 'all', repeat: true },
      { seed: 'saved' },
    )
    const question = registry.get('capital_input')!.make(country('ZA'), ctx, createRng('za'), 2)!
    session.questions = [
      { question, given: 'Pretoria', correct: true, answeredAt: '2026-10-01T12:00:00Z' },
      { question: { ...question, accepted: ['Pretoria'] } },
    ]
    session.position = 1
    session.score = 125
    const refreshed = refreshCountryFacts(session, ctx)
    expect(refreshed.questions[0]).toBe(session.questions[0])
    expect(refreshed.score).toBe(125)
    expect(refreshed.position).toBe(1)
    expect(checkAnswer(refreshed.questions[1].question, 'Cape Town')).toBe(true)
  })
})
