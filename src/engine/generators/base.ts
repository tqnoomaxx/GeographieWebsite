import type { Entity } from '@/domain/types'
import type { GeneratorContext, Question, QuestionOption, CategoryId } from '../types'
import type { Rng } from '../rng'
import { pickDistractors } from '../distractors'
import { baseDifficulty } from '../difficulty'
import { mediaUrl } from '@/services/data/dataService'

export interface Generator {
  id: string
  category: CategoryId
  /** Entities, zu denen dieser Generator Fragen stellen kann. */
  pool(ctx: GeneratorContext): Entity[]
  /** Erzeugt eine Frage zur Ziel-Entity oder null, wenn nicht möglich. */
  make(target: Entity, ctx: GeneratorContext, rng: Rng, difficulty: number): Question | null
}

export const flagOf = (e: Entity) => e.media?.find((m) => m.kind === 'flag')
export const photoOf = (e: Entity) => e.media?.find((m) => m.kind === 'photo')
export const nameOf = (e: Entity) => e.names.de
export const accepted = (e: Entity) => [e.names.de, e.names.en ?? '', ...(e.aliases ?? [])].filter((s) => s && s.length > 1)
export const countryOf = (e: Entity, ctx: GeneratorContext) =>
  e.attributes.country ? ctx.byId.get(e.attributes.country) : undefined

export function options(correct: Entity, pool: Entity[], ctx: GeneratorContext, rng: Rng, difficulty: number, withImage = false): QuestionOption[] | null {
  const distractors = pickDistractors(correct, pool, 3, ctx, rng, difficulty)
  if (distractors.length < 3) return null
  return rng.shuffle([correct, ...distractors]).map((e) => ({
    id: e.id,
    label: nameOf(e),
    image: withImage ? (flagOf(e) ? mediaUrl(flagOf(e)!.url) : undefined) : undefined,
  }))
}

export function qid(generator: string, target: Entity) {
  return `${generator}:${target.id}`
}

export function effectiveDifficulty(target: Entity, requested: number) {
  return Math.max(1, Math.min(3, Math.round((baseDifficulty(target) + requested) / 2)))
}

export function flagMedia(e: Entity) {
  const f = flagOf(e)
  return f ? { kind: 'flag' as const, url: mediaUrl(f.url), alt: 'Flagge', attribution: f.attribution, source_url: f.source_url, entityId: e.id } : undefined
}
export function photoMedia(e: Entity) {
  const p = photoOf(e)
  return p ? { kind: 'photo' as const, url: mediaUrl(p.url), alt: p.caption ?? 'Foto', attribution: p.attribution, source_url: p.source_url, entityId: e.id } : undefined
}
