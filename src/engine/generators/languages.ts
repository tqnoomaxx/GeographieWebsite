import type { Entity } from '@/domain/types'
import type { Generator } from './base'
import { qid } from './base'
import { normalizeAnswer } from '../normalize'

const attr = (entity: Entity, key: string) => String(entity.attributes[key] ?? '')
const original = (entity: Entity) => attr(entity, 'original')
const latin = (entity: Entity) => attr(entity, 'transliteration')
const answerId = (entity: Entity) => `script-answer:${entity.id}`

function difficulty(entity: Entity, requested: number) {
  const intrinsic = attr(entity, 'kind') === 'letter' ? 1 : original(entity).length >= 10 ? 3 : 2
  return Math.max(1, Math.min(3, Math.round((intrinsic + requested) / 2)))
}

function facts(entity: Entity) {
  const items = [`Sprache: ${attr(entity, 'language_name')} · Schrift: ${attr(entity, 'script_name')}`]
  const meaning = attr(entity, 'meaning')
  if (meaning) items.unshift(`Bedeutung: ${meaning}`)
  const variants = ((entity.attributes.accepted as string[] | undefined) ?? []).filter(
    (value) => value.toLocaleLowerCase('de-DE') !== latin(entity).toLocaleLowerCase('de-DE'),
  )
  if (variants.length) items.push(`Auch akzeptiert: ${variants.join(' · ')}`)
  if (entity.attributes.note) items.push(attr(entity, 'note'))
  return items
}

function sources(entity: Entity) {
  return entity.provenance.source_url
    ? [{ label: entity.provenance.source, url: entity.provenance.source_url }]
    : []
}

function choiceOptions(
  target: Entity,
  pool: Entity[],
  label: (entity: Entity) => string,
  rng: Parameters<Generator['make']>[2],
) {
  const sameLanguage = pool.filter(
    (entity) =>
      entity.id !== target.id &&
      entity.attributes.language === target.attributes.language &&
      entity.attributes.kind === target.attributes.kind,
  )
  const fallback = pool.filter(
    (entity) => entity.id !== target.id && entity.attributes.language === target.attributes.language,
  )
  const picked: Entity[] = []
  const seen = new Set(
    [label(target), ...(label === latin ? ((target.attributes.accepted as string[]) ?? []) : [])].map(
      normalizeAnswer,
    ),
  )
  for (const candidate of [...rng.shuffle(sameLanguage), ...rng.shuffle(fallback)]) {
    const visible = normalizeAnswer(label(candidate))
    if (!visible || seen.has(visible) || picked.some((entity) => entity.id === candidate.id)) continue
    seen.add(visible)
    picked.push(candidate)
    if (picked.length === 3) break
  }
  if (picked.length < 3) return null
  return rng.shuffle([target, ...picked]).map((entity) => ({
    id: answerId(entity),
    label: label(entity),
    ...(label === original
      ? {
          lang: attr(entity, 'language'),
          dir: attr(entity, 'direction') === 'rtl' ? ('rtl' as const) : ('ltr' as const),
        }
      : {}),
  }))
}

function toLatinChoice(id: string, language: string): Generator {
  return {
    id,
    category: 'languages',
    pool: (ctx) =>
      ctx.scriptWords
        .filter((entity) => !entity.attributes.course)
        .filter((entity) => entity.attributes.language === language),
    make(target, ctx, rng, requested) {
      const options = choiceOptions(
        target,
        ctx.scriptWords.filter((entity) => !entity.attributes.course),
        latin,
        rng,
      )
      if (!options) return null
      return {
        id: qid(id, target),
        category: 'languages',
        type: id,
        question_type: 'multiple_choice',
        prompt: { key: 'q.script_to_latin' },
        answer: answerId(target),
        options,
        difficulty: difficulty(target, requested),
        entities: [target.id],
        explanation: `${original(target)} → ${latin(target)}`,
        facts: facts(target),
        sources: sources(target),
        metadata: { generator: id, scope: ctx.scope },
      }
    },
  }
}

export const cyrillicToLatin = toLatinChoice('cyrillic_to_latin', 'ru')
export const greekToLatin = toLatinChoice('greek_to_latin', 'el')
export const georgianToLatin = toLatinChoice('georgian_to_latin', 'ka')
export const arabicToLatin = toLatinChoice('arabic_to_latin', 'ar')
export const devanagariToLatin = toLatinChoice('devanagari_to_latin', 'hi')
export const bengaliToLatin = toLatinChoice('bengali_to_latin', 'bn')
export const tamilToLatin = toLatinChoice('tamil_to_latin', 'ta')

export const scriptToLatinInput: Generator = {
  id: 'script_to_latin_input',
  category: 'languages',
  pool: (ctx) => ctx.scriptWords.filter((entity) => !entity.attributes.course),
  make(target, ctx, _rng, requested) {
    const accepted = (target.attributes.accepted as string[] | undefined) ?? [latin(target)]
    return {
      id: qid(this.id, target),
      category: 'languages',
      type: this.id,
      question_type: 'text_input',
      prompt: { key: 'q.script_to_latin_input' },
      answer: latin(target),
      accepted,
      difficulty: difficulty(target, requested),
      entities: [target.id],
      explanation: `${original(target)} → ${latin(target)}`,
      facts: facts(target),
      sources: sources(target),
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

function unambiguousReversePool(entities: Entity[]) {
  const matches = new Map<string, Set<string>>()
  const key = (entity: Entity, text: string) =>
    `${attr(entity, 'language')}:${attr(entity, 'kind')}:${normalizeAnswer(text)}`
  for (const entity of entities) {
    for (const text of [latin(entity), ...((entity.attributes.accepted as string[] | undefined) ?? [])]) {
      const k = key(entity, text)
      const ids = matches.get(k) ?? new Set<string>()
      ids.add(entity.id)
      matches.set(k, ids)
    }
  }
  return entities.filter((entity) => matches.get(key(entity, latin(entity)))?.size === 1)
}

export const latinToScript: Generator = {
  id: 'latin_to_script',
  category: 'languages',
  pool: (ctx) => unambiguousReversePool(ctx.scriptWords.filter((entity) => !entity.attributes.course)),
  make(target, ctx, rng, requested) {
    const pool = unambiguousReversePool(ctx.scriptWords.filter((entity) => !entity.attributes.course))
    const options = choiceOptions(target, pool, original, rng)
    if (!options) return null
    return {
      id: qid(this.id, target),
      category: 'languages',
      type: this.id,
      question_type: 'multiple_choice',
      prompt: {
        key: 'q.latin_to_script',
        params: { text: latin(target), language: attr(target, 'language_name') },
      },
      answer: answerId(target),
      options,
      difficulty: difficulty(target, requested),
      entities: [target.id],
      explanation: `${latin(target)} → ${original(target)}`,
      facts: facts(target),
      sources: sources(target),
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

const scriptAnswers: Record<string, { label: string; aliases: string[] }> = {
  cyrillic: { label: 'Kyrillisch', aliases: ['Kyrillische Schrift', 'Cyrillic'] },
  greek: { label: 'Griechisch', aliases: ['Griechische Schrift', 'Greek'] },
  georgian: { label: 'Georgisch', aliases: ['Georgische Schrift', 'Mchedruli', 'Mkhedruli', 'Georgian'] },
  arabic: { label: 'Arabisch', aliases: ['Arabische Schrift', 'Arabic'] },
  devanagari: { label: 'Devanagari', aliases: ['Devanagari-Schrift', 'Devanagari Schrift'] },
  bengali: { label: 'Bengalisch', aliases: ['Bengalische Schrift', 'Bengali', 'Bangla'] },
  tamil: { label: 'Tamil', aliases: ['Tamilische Schrift', 'Tamilisch'] },
}

function identifyScript(input: boolean): Generator {
  const id = input ? 'script_identify_input' : 'script_identify'
  return {
    id,
    category: 'languages',
    pool: (ctx) =>
      ctx.scriptWords
        .filter((entity) => !entity.attributes.course)
        .filter((entity) => entity.attributes.kind === 'word' && scriptAnswers[attr(entity, 'script')]),
    make(target, ctx, rng, requested) {
      const script = attr(target, 'script')
      const correct = scriptAnswers[script]
      if (!correct) return null
      const available = [
        ...new Set(
          ctx.scriptWords
            .filter((entity) => !entity.attributes.course)
            .map((entity) => attr(entity, 'script')),
        ),
      ].filter((key) => key !== script && scriptAnswers[key])
      if (!input && available.length < 3) return null
      return {
        id: qid(id, target),
        category: 'languages',
        type: id,
        question_type: input ? 'text_input' : 'multiple_choice',
        prompt: { key: input ? 'q.script_identify_input' : 'q.script_identify' },
        answer: input ? correct.label : `script:${script}`,
        ...(input
          ? { accepted: [correct.label, ...correct.aliases] }
          : {
              options: rng
                .shuffle([script, ...rng.shuffle(available).slice(0, 3)])
                .map((key) => ({ id: `script:${key}`, label: scriptAnswers[key].label })),
            }),
        difficulty: Math.min(3, Math.max(1, requested)),
        entities: [target.id],
        explanation: `Das ist ${correct.label}. ${original(target)} → ${latin(target)}`,
        facts: facts(target),
        sources: sources(target),
        metadata: { generator: id, scope: ctx.scope },
      }
    },
  }
}
export const scriptIdentify = identifyScript(false)
export const scriptIdentifyInput = identifyScript(true)

function identifyLanguage(input: boolean): Generator {
  const id = input ? 'language_identify_input' : 'language_identify'
  return {
    id,
    category: 'languages',
    pool: (ctx) => ctx.languageSamples,
    make(target, ctx, rng, requested) {
      const language = attr(target, 'language')
      const name = attr(target, 'language_name')
      const alternatives = [
        ...new Map(
          ctx.languageSamples
            .filter((entity) => attr(entity, 'language') !== language)
            .map((entity) => [attr(entity, 'language'), entity]),
        ).values(),
      ]
      const sameScript = alternatives.filter((entity) => attr(entity, 'script') === attr(target, 'script'))
      const others = alternatives.filter((entity) => attr(entity, 'script') !== attr(target, 'script'))
      const wrong = [...rng.shuffle(sameScript), ...rng.shuffle(others)].slice(0, 3)
      if (!input && wrong.length < 3) return null
      return {
        id: qid(id, target),
        category: 'languages',
        type: id,
        question_type: input ? 'text_input' : 'multiple_choice',
        prompt: { key: input ? 'q.language_identify_input' : 'q.language_identify' },
        answer: input ? name : `language:${language}`,
        ...(input
          ? { accepted: [name, ...((target.attributes.language_aliases as string[] | undefined) ?? [])] }
          : {
              options: rng.shuffle([target, ...wrong]).map((entity) => ({
                id: `language:${attr(entity, 'language')}`,
                label: attr(entity, 'language_name'),
              })),
            }),
        difficulty: Math.min(3, Math.max(1, requested)),
        entities: [target.id],
        explanation: `Die Textprobe ist auf ${name}.`,
        facts: [
          `Übersetzung: ${attr(target, 'meaning')}`,
          `Schrift: ${attr(target, 'script_name')}`,
          attr(target, 'hint'),
          `Textquelle: Allgemeine Erklärung der Menschenrechte, Artikel ${target.attributes.article}.`,
        ],
        sources: sources(target),
        metadata: { generator: id, scope: ctx.scope },
      }
    },
  }
}
export const languageIdentify = identifyLanguage(false)
export const languageIdentifyInput = identifyLanguage(true)
