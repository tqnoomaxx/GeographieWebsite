import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { buildContext } from './context'
import { baseQuestionPosition, baseQuestionTotal, buildSession, checkAnswer, extendSession, pendingRepeatCount, poolFor, recordAnswer, skipQuestion } from './session'
import { generatorsFor, registry } from './registry'
import { fromQuery, type RoundConfig } from './round'
import { PLAY_QUIZZES, QUIZZES } from '@/config/quizzes'
import { matchesAnswer, normalizeAnswer } from './normalize'
import { createRng } from './rng'
import { review, initialProgress } from './srs'
import { levelForXp, xpForLevel } from '@/config/levels'
import type { Entity, Relationship } from '@/domain/types'
import { isSovereign } from './generators/base'

const DATA = join(process.cwd(), 'public', 'data')
const read = <T,>(p: string): T => JSON.parse(readFileSync(join(DATA, p), 'utf8'))
const countries = read<Entity[]>('entities/countries.json')
const cities = read<Entity[]>('entities/cities.json')
const landmarks = read<Entity[]>('entities/landmarks.json')
const regions = readdirSync(join(DATA, 'entities/regions')).flatMap((f) => read<Entity[]>(`entities/regions/${f}`))
const relationships = read<Relationship[]>('relationships/index.json')
const plates = read<Entity[]>('entities/license-plates/DE.json')
const rivers = read<Entity[]>('entities/rivers.json')
const lakes = read<Entity[]>('entities/lakes.json')
const mountains = read<Entity[]>('entities/mountains.json')
/** Runden-Setup mit Standardwerten (Automatisch, Welt, 10, Wiederholung an). */
const setup = (o: Partial<RoundConfig> & { category: RoundConfig['category'] }): RoundConfig => ({ mode: 'auto', scope: 'world', length: 10, repeat: true, ...o })
const ctx = (scope = 'world') => buildContext({ countries, cities, landmarks, regions, plates, rivers, lakes, mountains, relationships, scope })

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
    const s = buildSession(ctx(), setup({ category: 'flags', scope: 'world', length: 10 }), { seed: 'test' })
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
    const pool = poolFor(c, setup({ category: 'flags' }))
    let s = buildSession(c, setup({ category: 'flags', scope: 'europe', length: 'all' }), { seed: 'all' })
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
    const s = buildSession(ctx('country:DE'), setup({ category: 'regions', scope: 'country:DE', length: 'all' }), { seed: 'de' })
    expect(s.questions.length).toBe(16)
  })
  it('jede Kategorie hat Fragen im Welt-Bereich', () => {
    for (const cat of ['flags', 'countries', 'capitals', 'regions', 'cities', 'maps', 'images', 'landmarks', 'license_plates', 'water', 'nature', 'mixed'] as const) {
      const s = buildSession(ctx(), setup({ category: cat, scope: 'world', length: 5 }), { seed: cat })
      expect(s.questions.length, cat).toBe(5)
    }
  })
  it('Eingabefragen akzeptieren Namen und Aliasse', () => {
    const s = buildSession(ctx(), setup({ category: 'flags', scope: 'world', length: 5, mode: 'flag_input', content: ['country'] }), { seed: 'inp' })
    for (const { question: q } of s.questions) {
      const target = countries.find((c) => c.id === q.answer)!
      expect(checkAnswer(q, target.names.de)).toBe(true)
      if (target.names.en) expect(checkAnswer(q, target.names.en)).toBe(true)
    }
  })
})

describe('plates', () => {
  it('Kennzeichen-Runde für Deutschland', () => {
    const s = buildSession(ctx('country:DE'), setup({ category: 'license_plates', scope: 'country:DE', length: 10 }), { seed: 'pl' })
    expect(s.questions).toHaveLength(10)
    const q = s.questions[0].question
    if (q.options) expect(q.options.some((o) => o.id === q.answer)).toBe(true)
  })
})

describe('nature', () => {
  it('Flussfragen im Bereich Deutschland nutzen Mehrländer-Zuordnung', () => {
    const s = buildSession(ctx('country:DE'), setup({ category: 'water', scope: 'country:DE', length: 10 }), { seed: 'w' })
    expect(s.questions.length).toBeGreaterThan(3)
    for (const { question: q } of s.questions) if (q.options && q.question_type === 'multiple_choice') expect(q.options.some((o) => o.id === q.answer)).toBe(true)
  })
})

describe('maps', () => {
  it('Weltkarten-Fragen zielen nur auf anklickbare Länder', () => {
    const c = ctx('world')
    for (const [category, mode] of [['maps', 'countries_on_map'], ['flags', 'flag_to_map'], ['water', 'on_map'], ['nature', 'on_map']] as const) {
      const s = buildSession(c, setup({ category, mode, scope: 'world', length: 'all', content: category === 'flags' ? ['country'] : undefined }), { seed: mode })
      for (const q of s.questions) if (q.question.map?.kind === 'world') expect(c.byId.get(q.question.answer)?.attributes.on_world_map, q.question.answer).toBe(true)
    }
  })
})

describe('konfiguration', () => {
  it('fängt ungültige URL-Parameter ab', () => {
    const parsed = fromQuery('flags', new URLSearchParams('mode=kaputt&scope=moon&len=NaN'))
    expect(parsed).toMatchObject({ mode: 'auto', scope: 'world', length: 10 })
  })
  it('jeder Fragetyp in config/quizzes.ts verweist auf registrierte Generatoren der richtigen Kategorie', () => {
    for (const quiz of QUIZZES) {
      const allowed = new Set([quiz.id, ...(quiz.mergedFrom ?? [])])
      for (const m of quiz.modes) for (const g of generatorsFor(quiz.id, m.id)) expect(allowed.has(g.category), `${quiz.id}/${m.id}/${g.id}`).toBe(true)
    }
  })
  it('„Automatisch“ mischt nur Multiple Choice, wo es welches gibt (R10)', () => {
    expect(generatorsFor('flags').map((g) => g.id)).not.toContain('flag_to_country_input')
    expect(generatorsFor('maps').length).toBe(2) // nur Kartenfragen → alle
    expect(generatorsFor('countries', 'countries_on_map').map((g) => g.id)).toEqual(['country_on_map'])
    expect(generatorsFor('countries').map((g) => g.id)).toContain('region_to_country')
    expect(generatorsFor('mixed').map((g) => g.id)).not.toContain('region_to_flag')
  })
  it('Fragetyp ohne Eintrag liefert keine Generatoren', () => {
    expect(generatorsFor('flags', 'gibt_es_nicht')).toEqual([])
  })
})

describe('vollständiges Quiz-Inhaltsaudit', () => {
  const translations = JSON.parse(readFileSync(join(process.cwd(), 'locales/de/common.json'), 'utf8')) as Record<string, unknown>
  const translation = (key: string) => key.split('.').reduce<unknown>((value, part) => (value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined), translations)

  it('verwendet ausschließlich den kuratierten Pool aus Staaten und anerkannten Sonderfällen', () => {
    const sovereign = countries.filter(isSovereign)
    expect(sovereign).toHaveLength(197)
    expect(sovereign.map((country) => country.attributes.iso2)).not.toEqual(expect.arrayContaining(['AC', 'EU', 'IC', 'TA']))
  })

  it('erzeugt für jedes Ziel jedes Generators eine vollständige, auflösbare Frage', () => {
    const c = ctx('world')
    for (const generator of registry.values()) {
      const targets = generator.pool(c)
      expect(targets.length, `${generator.id}: leerer Pool`).toBeGreaterThan(0)
      for (const target of targets) {
        const q = generator.make(target, c, createRng(`audit:${generator.id}:${target.id}`), 2)
        expect(q, `${generator.id}/${target.id}: keine Frage`).not.toBeNull()
        if (!q) continue
        expect(translation(q.prompt.key), `${q.id}: Übersetzung ${q.prompt.key}`).toBeTypeOf('string')
        expect(Object.values(q.prompt.params ?? {}), `${q.id}: leere Prompt-Parameter`).not.toContain('')
        expect(q.difficulty, `${q.id}: Schwierigkeit`).toBeGreaterThanOrEqual(1)
        expect(q.difficulty, `${q.id}: Schwierigkeit`).toBeLessThanOrEqual(3)
        expect(q.metadata.generator, q.id).toBe(generator.id)
        for (const entityId of q.entities) expect(c.byId.has(entityId), `${q.id}: unbekannte Entity ${entityId}`).toBe(true)
        if (q.options) {
          expect(q.options.some((option) => option.id === q.answer), `${q.id}: Lösung fehlt`).toBe(true)
          expect(new Set(q.options.map((option) => option.id)).size, `${q.id}: doppelte Options-ID`).toBe(q.options.length)
          if (q.question_type !== 'image_choice') expect(new Set(q.options.map((option) => option.label)).size, `${q.id}: doppelte Beschriftung`).toBe(q.options.length)
          for (const option of q.options) if (option.image) expect(existsSync(join(process.cwd(), 'public', option.image.replace(/^\//, ''))), `${q.id}: ${option.image}`).toBe(true)
        }
        if (q.question_type === 'text_input') expect(q.accepted?.length, `${q.id}: keine Texteingaben`).toBeGreaterThan(0)
        if (q.media?.url) expect(existsSync(join(process.cwd(), 'public', q.media.url.replace(/^\//, ''))), `${q.id}: ${q.media.url}`).toBe(true)
        if (q.map) {
          expect(q.map.targetId, q.id).toBe(q.answer)
          expect(c.byId.has(q.answer), `${q.id}: unbekanntes Kartenziel`).toBe(true)
        }
      }
    }
  })

  it('bietet alle sichtbaren Modi mit mindestens vier belastbaren Fragen an', () => {
    const c = ctx('world')
    for (const quiz of PLAY_QUIZZES) {
      for (const mode of quiz.modes) {
        if (mode.scopes && !mode.scopes.includes('world')) continue
        expect(poolFor(c, setup({ category: quiz.id, mode: mode.id, content: mode.content })).size, `${quiz.id}/${mode.id}`).toBeGreaterThanOrEqual(4)
      }
    }
  })
})

describe('regeln', () => {
  it('R10: Automatisch enthält keine Eintipp- oder Kartenfragen', () => {
    for (const cat of ['flags', 'capitals', 'cities', 'water'] as const) {
      const s = buildSession(ctx(), setup({ category: cat, scope: 'world', length: 30 }), { seed: 'auto' })
      for (const q of s.questions) expect(['multiple_choice', 'image_choice', 'true_false']).toContain(q.question.question_type)
    }
  })
  it('R3: ISO-Code wird beim Eintippen akzeptiert', () => {
    const s = buildSession(ctx(), setup({ category: 'flags', scope: 'world', length: 3, mode: 'flag_input', content: ['country'] }), { seed: 'iso' })
    const q = s.questions[0].question
    expect(checkAnswer(q, countries.find((c) => c.id === q.answer)!.attributes.iso2 as string)).toBe(true)
  })
  it('R7: Überspringen zählt als Fehler ohne Wiederholung', () => {
    let s = buildSession(ctx('europe'), setup({ category: 'flags', scope: 'europe', length: 2, mode: 'europe_map' }), { seed: 'skip' })
    s = skipQuestion(s)
    expect(s.questions[0].correct).toBe(false)
    expect(s.questions).toHaveLength(2)
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

describe('recordAnswer', () => {
  it('reiht falsche Antworten vier Positionen später erneut ein und zählt Streak-Punkte', () => {
    let s = buildSession(ctx('europe'), setup({ category: 'flags', scope: 'europe', length: 10, mode: 'flag_to_name', content: ['country'], repeat: true }), { seed: 'rep' })
    const q0 = s.questions[0].question
    const wrong = q0.options!.find((o) => o.id !== q0.answer)!.id
    s = recordAnswer(s, wrong)
    expect(s.questions).toHaveLength(11)
    expect(baseQuestionTotal(s)).toBe(10)
    expect(baseQuestionPosition(s)).toBe(1)
    expect(pendingRepeatCount(s)).toBe(1)
    expect(s.questions[4].repeated).toBe(true)
    expect(s.questions[4].question.answer).toBe(q0.answer)
    s = { ...s, position: 1 }
    s = recordAnswer(s, s.questions[1].question.answer)
    s = { ...s, position: 2 }
    s = recordAnswer(s, s.questions[2].question.answer)
    expect(s.points).toBe(100 + 115)
    expect(s.streak).toBe(2)
  })
  it('Kartenfragen bleiben bei Fehlklick offen und zählen Versuche', () => {
    let s = buildSession(ctx('europe'), setup({ category: 'maps', scope: 'europe', length: 3, mode: 'countries_on_map' }), { seed: 'map' })
    const q = s.questions[0].question
    s = recordAnswer(s, 'country:XX')
    expect(s.questions[0].given).toBeUndefined()
    expect(s.questions[0].attempts).toBe(1)
    s = recordAnswer(s, q.answer)
    expect(s.questions[0].given).toBe(q.answer)
    expect(s.questions[0].correct).toBe(false) // nicht beim ersten Versuch
    expect(s.questions).toHaveLength(3) // keine Wiederholung bei Karten
  })
  it('Distraktoren schließen optisch identische Flaggen aus', () => {
    const c = ctx('world')
    const s = buildSession(c, setup({ category: 'flags', scope: 'world', length: 'all', mode: 'flag_to_name', content: ['country'] }), { seed: 'vk' })
    for (const { question: q } of s.questions) {
      const vk = c.byId.get(q.answer)?.attributes.visual_key
      if (!vk) continue
      for (const o of q.options!) if (o.id !== q.answer) expect(c.byId.get(o.id)?.attributes.visual_key).not.toBe(vk)
    }
  })
})
