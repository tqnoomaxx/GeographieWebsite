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
export const accepted = (e: Entity) => [e.names.de, e.names.en ?? '', ...(e.aliases ?? []), (e.attributes.iso2 as string) ?? '', (e.attributes.iso3 as string) ?? ''].filter((s) => s && s.length > 1)
/** Souveräne Staaten (plus allgemein anerkannte Sonderfälle). Abhängige Gebiete bleiben Detailseiten/Entdecken vorbehalten. */
const SPECIAL = new Set(['TW', 'XK', 'PS', 'VA'])
export const isSovereign = (e: Entity) => e.type === 'country' && (e.attributes.independent !== false || SPECIAL.has(e.attributes.iso2 as string))
export const sovereign = (ctx: GeneratorContext) => ctx.countries.filter(isSovereign)
/** Länder-Pool für Distraktoren: souveräne Staaten; Fallback auf alle, wenn der Bereich zu klein ist. */
export const countryPool = (ctx: GeneratorContext) => {
  const s = sovereign(ctx)
  if (s.length >= 4) return s
  const all = [...ctx.byId.values()].filter(isSovereign)
  return all.length >= 4 ? all : [...ctx.byId.values()].filter((e) => e.type === 'country')
}
export const countryOf = (e: Entity, ctx: GeneratorContext) =>
  e.attributes.country ? ctx.byId.get(e.attributes.country) : undefined

/**
 * Vier Antwortoptionen (R2). Reicht der bevorzugte Pool (z. B. Regionen desselben Landes oder der gewählte Bereich)
 * nicht für drei Falschantworten, wird mit gleichartigen Entities aus dem Gesamtbestand aufgefüllt – so bleibt jede
 * Lernkarte auch in kleinen Bereichen spielbar.
 */
export function options(correct: Entity, pool: Entity[], ctx: GeneratorContext, rng: Rng, difficulty: number, withImage = false): QuestionOption[] | null {
  let distractors = pickDistractors(correct, pool, 3, ctx, rng, difficulty)
  if (distractors.length < 3) {
    const fallback = [...ctx.byId.values()].filter((e) => e.type === correct.type && (correct.type !== 'country' || isSovereign(e)) && (!withImage || flagOf(e)) && !pool.includes(e))
    const more = pickDistractors(correct, fallback, 3 - distractors.length, ctx, rng, difficulty).filter((e) => !distractors.some((d) => d.names.de === e.names.de))
    distractors = [...distractors, ...more]
  }
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
