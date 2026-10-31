import type { Entity } from '@/domain/types'
import type { Generator } from './base'
import { qid } from './base'
import { normalizeAnswer } from '../normalize'

const label = (entity: Entity) =>
  String(entity.attributes.kind === 'word' ? entity.attributes.meaning : entity.attributes.transliteration)
const groupedCards = new WeakMap<Entity[], Map<string, Entity[]>>()
const groupKey = (entity: Entity) => `${entity.attributes.language}:${entity.attributes.kind}`
function peers(entities: Entity[], target: Entity) {
  let groups = groupedCards.get(entities)
  if (!groups) {
    groups = new Map()
    for (const entity of entities) {
      if (!entity.attributes.course) continue
      const key = groupKey(entity)
      const group = groups.get(key) ?? []
      group.push(entity)
      groups.set(key, group)
    }
    groupedCards.set(entities, groups)
  }
  return groups.get(groupKey(target)) ?? []
}
function course(input: boolean): Generator {
  const id = input ? 'language_course_input' : 'language_course_choice'
  return {
    id,
    category: 'languages',
    pool: (ctx) => ctx.scriptWords.filter((entity) => entity.attributes.course === true),
    make(target, ctx, rng) {
      const word = target.attributes.kind === 'word'
      const correct = label(target)
      const accepted = word ? [correct] : (target.attributes.accepted as string[])
      const seen = new Set(accepted.map(normalizeAnswer))
      const distractors: Entity[] = []
      if (!input)
        for (const entity of rng.shuffle(peers(ctx.scriptWords, target))) {
          const key = normalizeAnswer(label(entity))
          if (!key || seen.has(key)) continue
          seen.add(key)
          distractors.push(entity)
          if (distractors.length === 3) break
        }
      if (!input && distractors.length < 3) return null
      return {
        id: qid(id, target),
        category: 'languages',
        type: id,
        question_type: input ? 'text_input' : 'multiple_choice',
        prompt: { key: word ? 'q.language_course_word' : 'q.language_course_letter' },
        answer: input ? correct : target.id,
        ...(input
          ? { accepted }
          : {
              options: rng
                .shuffle([target, ...distractors])
                .map((entity) => ({ id: entity.id, label: label(entity) })),
            }),
        difficulty: word ? 2 : 1,
        entities: [target.id],
        explanation: `${target.attributes.original} → ${correct}`,
        facts: [
          `Sprache: ${target.attributes.language_name}`,
          `Lernbereich: ${target.attributes.topic}`,
          ...(word
            ? [`Bedeutung: ${correct}`]
            : ['Die Umschrift dient als Lesehilfe und ist keine Lautschrift.']),
        ],
        sources: [{ label: target.provenance.source, url: target.provenance.source_url! }],
        metadata: { generator: id, scope: ctx.scope },
      }
    },
  }
}
export const languageCourseChoice = course(false)
export const languageCourseInput = course(true)
