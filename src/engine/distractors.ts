import type { Entity } from '@/domain/types'
import type { GeneratorContext } from './types'
import type { Rng } from './rng'

/**
 * Wählt falsche Antworten, die zur richtigen passen: erst Nachbarn, dann gleicher Kontinent/Land, dann Rest.
 * Höhere Schwierigkeit gewichtet ähnliche Kandidaten stärker.
 */
export function pickDistractors(
  correct: Entity,
  pool: Entity[],
  count: number,
  ctx: GeneratorContext,
  rng: Rng,
  difficulty: number,
): Entity[] {
  const vk = correct.attributes.visual_key as string | undefined
  const candidates = pool.filter((e) => e.id !== correct.id && e.names.de !== correct.names.de && !(vk && e.attributes.visual_key === vk))
  const neighbors = new Set(ctx.rel.neighbors.get(correct.id) ?? [])
  const sameCountry = (e: Entity) => !!correct.attributes.country && e.attributes.country === correct.attributes.country
  const sameContinent = (e: Entity) => !!correct.attributes.continent && e.attributes.continent === correct.attributes.continent
  const tiers: Entity[][] = [
    candidates.filter((e) => neighbors.has(e.id) || sameCountry(e)),
    candidates.filter((e) => !neighbors.has(e.id) && !sameCountry(e) && sameContinent(e)),
    candidates.filter((e) => !neighbors.has(e.id) && !sameCountry(e) && !sameContinent(e)),
  ]
  const result: Entity[] = []
  const seen = new Set<string>()
  // Bei niedriger Schwierigkeit einen Teil aus fernen Kandidaten mischen, damit es nicht zu ähnlich wird.
  const order = difficulty >= 3 ? [0, 1, 2] : difficulty === 2 ? [0, 1, 2] : [1, 2, 0]
  for (const t of order) {
    for (const e of rng.shuffle(tiers[t])) {
      if (result.length >= count) break
      if (seen.has(e.names.de)) continue
      seen.add(e.names.de)
      result.push(e)
    }
    if (result.length >= count) break
  }
  return result
}
