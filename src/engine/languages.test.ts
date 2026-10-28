import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { Entity } from '@/domain/types'
import { buildContext } from './context'
import { registry } from './registry'
import { createRng } from './rng'
import { checkAnswer, buildSession, poolFor } from './session'
import { normalizeAnswer } from './normalize'
import { refreshCountryFacts } from './countryFacts'

const read = (file: string): Entity[] => JSON.parse(readFileSync(`public/data/entities/${file}.json`, 'utf8'))
const scriptWords = read('script-words')
const languageSamples = read('language-samples')
const ctx = buildContext({
  countries: [],
  cities: [],
  landmarks: [],
  regions: [],
  relationships: [],
  scriptWords,
  languageSamples,
  scope: 'world',
})
const readers = [
  ['georgian_to_latin', 'ka', 'read-georgian'],
  ['arabic_to_latin', 'ar', 'read-arabic'],
  ['devanagari_to_latin', 'hi', 'read-devanagari'],
  ['bengali_to_latin', 'bn', 'read-bengali'],
  ['tamil_to_latin', 'ta', 'read-tamil'],
] as const

describe('expanded script courses', () => {
  it.each(readers)(
    '%s has usable choice questions for every card and keeps its language in input mode',
    (id, language, exercise) => {
      const generator = registry.get(id)!
      const pool = generator.pool(ctx)
      expect(pool.length).toBeGreaterThan(25)
      for (const target of pool) {
        expect(target.attributes.language).toBe(language)
        const question = generator.make(target, ctx, createRng(target.id), 2)!
        expect(question).not.toBeNull()
        expect(question.options).toHaveLength(4)
        const accepted = (target.attributes.accepted as string[]).map(normalizeAnswer)
        for (const option of question.options!.filter((option) => option.id !== question.answer))
          expect(accepted).not.toContain(normalizeAnswer(option.label))
      }
      for (const mode of ['choice', 'input']) {
        const config = {
          category: 'languages' as const,
          exercise,
          mode,
          scope: 'world',
          length: 'all' as const,
          repeat: true,
        }
        const available = poolFor(ctx, config)
        expect(available.size).toBe(pool.length)
        expect([...available.values()].every(({ entity }) => entity.attributes.language === language)).toBe(
          true,
        )
      }
    },
  )

  it('accepts international and German aliases for letters as well as new words', () => {
    for (const [id, answers] of [
      ['script_word:ru-zhe', ['zh', 'sch']],
      ['script_word:el-beta', ['v', 'b']],
      ['script_word:ka-sh', ['sh', 'sch']],
      ['script_word:hi-paanii', ['paanii', 'pani', 'paani']],
      ['script_word:ar-shams', ['shams', 'schams']],
      ['script_word:ta-tamizh', ['tamizh', 'tamil']],
    ] as const) {
      const target = ctx.byId.get(id)!
      const question = registry.get('script_to_latin_input')!.make(target, ctx, createRng(id), 2)!
      for (const answer of answers) expect(checkAnswer(question, answer, ctx), `${id}: ${answer}`).toBe(true)
    }
  })

  it('never offers a second valid spelling in reverse questions, including apostrophe and alias collisions', () => {
    const generator = registry.get('latin_to_script')!
    for (const target of generator.pool(ctx)) {
      const question = generator.make(target, ctx, createRng(target.id), 2)!
      expect(question).not.toBeNull()
      const valid = question.options!.filter((option) => {
        const entity = ctx.byId.get(option.id.replace('script-answer:', ''))!
        return (entity.attributes.accepted as string[]).some(
          (answer) => normalizeAnswer(answer) === normalizeAnswer(question.prompt.params!.text as string),
        )
      })
      expect(valid.map((option) => option.id)).toEqual([question.answer])
      expect(question.options?.every((option) => option.lang === target.attributes.language)).toBe(true)
    }
  })

  it('repairs missing letter aliases in pending saved rounds and preserves played history', () => {
    const setup = {
      category: 'languages' as const,
      exercise: 'read-greek',
      mode: 'input',
      scope: 'world',
      length: 'all' as const,
      repeat: true,
    }
    const session = buildSession(ctx, setup, { seed: 'letter-update' })
    const target = ctx.byId.get('script_word:el-beta')!
    const question = registry.get('script_to_latin_input')!.make(target, ctx, createRng('beta'), 2)!
    const stale = { ...question, accepted: ['v'] }
    session.questions = [{ question: stale, given: 'v', correct: true }, { question: stale }]
    session.position = 1
    const refreshed = refreshCountryFacts(session, ctx)
    expect(refreshed.questions[0]).toBe(session.questions[0])
    expect(checkAnswer(refreshed.questions[1].question, 'b')).toBe(true)
  })
})

describe('language and script identification', () => {
  it('has three sourced and translated samples for each of 21 languages', () => {
    expect(languageSamples).toHaveLength(63)
    const languages = new Set(languageSamples.map((sample) => sample.attributes.language))
    expect(languages.size).toBe(21)
    for (const language of languages) {
      const samples = languageSamples.filter((sample) => sample.attributes.language === language)
      expect(samples.map((sample) => sample.attributes.article)).toEqual([1, 3, 24])
      for (const sample of samples) {
        expect(sample.attributes.original).toBeTruthy()
        expect(sample.attributes.meaning).toBeTruthy()
        expect(sample.provenance.source_url).toContain('588b3f4b2d0467aff54842a4b926551b69d5a66a')
      }
    }
  })

  it('offers unique language answers, with similar scripts for Latin-language distractors', () => {
    for (const target of languageSamples) {
      const question = registry.get('language_identify')!.make(target, ctx, createRng(target.id), 2)!
      expect(question.options).toHaveLength(4)
      expect(new Set(question.options!.map((option) => option.id)).size).toBe(4)
      expect(question.answer).toBe(`language:${target.attributes.language}`)
      if (target.attributes.script === 'Latin')
        for (const option of question.options!)
          expect(
            languageSamples.find((sample) => `language:${sample.attributes.language}` === option.id)!
              .attributes.script,
          ).toBe('Latin')
      expect(question.prompt.params).toBeUndefined()
      expect(question.facts!.some((fact) => fact.startsWith('Übersetzung: '))).toBe(true)
    }
  })

  it('accepts native language names without conflating a language and its writing system', () => {
    for (const [id, correct, wrong] of [
      ['language_sample:ar-3', 'العربية', 'Hebräisch'],
      ['language_sample:hi-3', 'हिन्दी', 'Indisch'],
      ['language_sample:ru-3', 'Russian', 'Kyrillisch'],
      ['language_sample:fr-3', 'Francais', 'Italienisch'],
    ]) {
      const question = registry
        .get('language_identify_input')!
        .make(ctx.byId.get(id)!, ctx, createRng(id), 2)!
      expect(checkAnswer(question, correct, ctx)).toBe(true)
      expect(checkAnswer(question, wrong, ctx)).toBe(false)
    }
    const question = registry
      .get('script_identify_input')!
      .make(ctx.byId.get('script_word:hi-bharat')!, ctx, createRng('hi'), 2)!
    expect(checkAnswer(question, 'Devanagari')).toBe(true)
    expect(checkAnswer(question, 'Hindi')).toBe(false)
    expect(checkAnswer(question, 'Indisch')).toBe(false)
  })

  it('identifies seven scripts with unique choices and accepts Mchedruli as Georgian', () => {
    const generator = registry.get('script_identify')!
    const scripts = new Set(generator.pool(ctx).map((entity) => entity.attributes.script))
    expect(scripts.size).toBe(7)
    for (const target of generator.pool(ctx)) {
      const question = generator.make(target, ctx, createRng(target.id), 2)!
      expect(question.options).toHaveLength(4)
      expect(new Set(question.options!.map((option) => option.id)).size).toBe(4)
    }
    const question = registry
      .get('script_identify_input')!
      .make(ctx.byId.get('script_word:ka-tbilisi')!, ctx, createRng('ka'), 2)!
    expect(checkAnswer(question, 'Mchedruli')).toBe(true)
  })
})
