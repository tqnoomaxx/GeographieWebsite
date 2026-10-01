import type { Entity } from '@/domain/types'
import type { Generator } from './base'
import { qid } from './base'

const attr = (entity: Entity, key: string) => String(entity.attributes[key] ?? '')
const original = (entity: Entity) => attr(entity, 'original')
const latin = (entity: Entity) => attr(entity, 'transliteration')
const answerId = (entity: Entity) => `script-answer:${entity.id}`

function difficulty(entity: Entity, requested: number) {
  const intrinsic = attr(entity, 'kind') === 'letter' ? 1 : original(entity).length >= 10 ? 3 : 2
  return Math.max(1, Math.min(3, Math.round((intrinsic + requested) / 2)))
}

function facts(entity: Entity) {
  const items = [
    `Sprache: ${attr(entity, 'language_name')} · Schrift: ${attr(entity, 'script_name')}`,
  ]
  const meaning = attr(entity, 'meaning')
  if (meaning) items.unshift(`Bedeutung: ${meaning}`)
  const variants = ((entity.attributes.accepted as string[] | undefined) ?? []).filter(
    (value) => value.toLocaleLowerCase('de-DE') !== latin(entity).toLocaleLowerCase('de-DE'),
  )
  if (variants.length) items.push(`Auch akzeptiert: ${variants.join(' · ')}`)
  return items
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
  const seen = new Set([label(target).trim().toLocaleLowerCase('de-DE')])
  for (const candidate of [...rng.shuffle(sameLanguage), ...rng.shuffle(fallback)]) {
    const visible = label(candidate).trim().toLocaleLowerCase('de-DE')
    if (!visible || seen.has(visible) || picked.some((entity) => entity.id === candidate.id)) continue
    seen.add(visible)
    picked.push(candidate)
    if (picked.length === 3) break
  }
  if (picked.length < 3) return null
  return rng.shuffle([target, ...picked]).map((entity) => ({
    id: answerId(entity),
    label: label(entity),
  }))
}

function toLatinChoice(id: string, language: 'ru' | 'el'): Generator {
  return {
    id,
    category: 'languages',
    pool: (ctx) => ctx.scriptWords.filter((entity) => entity.attributes.language === language),
    make(target, ctx, rng, requested) {
      const options = choiceOptions(target, ctx.scriptWords, latin, rng)
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
        metadata: { generator: id, scope: ctx.scope },
      }
    },
  }
}

export const cyrillicToLatin = toLatinChoice('cyrillic_to_latin', 'ru')
export const greekToLatin = toLatinChoice('greek_to_latin', 'el')

export const scriptToLatinInput: Generator = {
  id: 'script_to_latin_input',
  category: 'languages',
  pool: (ctx) => ctx.scriptWords,
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
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

function unambiguousReversePool(entities: Entity[]) {
  const counts = new Map<string, number>()
  const key = (entity: Entity) =>
    `${attr(entity, 'language')}:${attr(entity, 'kind')}:${latin(entity).toLocaleLowerCase('de-DE')}`
  for (const entity of entities) counts.set(key(entity), (counts.get(key(entity)) ?? 0) + 1)
  return entities.filter((entity) => counts.get(key(entity)) === 1)
}

export const latinToScript: Generator = {
  id: 'latin_to_script',
  category: 'languages',
  pool: (ctx) => unambiguousReversePool(ctx.scriptWords),
  make(target, ctx, rng, requested) {
    const pool = unambiguousReversePool(ctx.scriptWords)
    const options = choiceOptions(target, pool, original, rng)
    if (!options) return null
    return {
      id: qid(this.id, target),
      category: 'languages',
      type: this.id,
      question_type: 'multiple_choice',
      prompt: { key: 'q.latin_to_script', params: { text: latin(target), language: attr(target, 'language_name') } },
      answer: answerId(target),
      options,
      difficulty: difficulty(target, requested),
      entities: [target.id],
      explanation: `${latin(target)} → ${original(target)}`,
      facts: facts(target),
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}
