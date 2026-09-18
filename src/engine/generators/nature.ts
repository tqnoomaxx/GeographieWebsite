import type { Generator } from './base'
import { qid, effectiveDifficulty, nameOf, options, countryPool as sovereignPool } from './base'
import type { GeneratorContext } from '../types'
import type { Entity } from '@/domain/types'

const countriesOf = (e: Entity, ctx: GeneratorContext) => ((e.attributes.countries as string[]) ?? []).map((id) => ctx.byId.get(id)).filter((x): x is Entity => !!x)
const countryPool = (ctx: GeneratorContext) => sovereignPool(ctx)

function toCountry(id: string, category: 'water' | 'nature', promptKey: string, pool: (ctx: GeneratorContext) => Entity[]): Generator {
  return {
    id,
    category,
    pool: (ctx) => pool(ctx).filter((e) => countriesOf(e, ctx).length),
    make(target, ctx, rng, difficulty) {
      const cs = countriesOf(target, ctx)
      const correct = rng.pick(cs)
      const exclude = new Set(cs.map((c) => c.id))
      const d = effectiveDifficulty(target, difficulty)
      const opts = options(correct, countryPool(ctx).filter((c) => !exclude.has(c.id) || c.id === correct.id), ctx, rng, d)
      if (!opts) return null
      return {
        id: qid(id, target), category, type: id, question_type: 'multiple_choice',
        prompt: { key: promptKey, params: { name: nameOf(target) } }, answer: correct.id, options: opts, difficulty: d,
        entities: [target.id, correct.id], explanation: cs.length > 1 ? `${nameOf(target)}: ${cs.map(nameOf).join(', ')}` : undefined,
        metadata: { generator: id, scope: ctx.scope },
      }
    },
  }
}

export const riverToCountry = toCountry('river_to_country', 'water', 'q.river_to_country', (ctx) => ctx.rivers)
export const lakeToCountry = toCountry('lake_to_country', 'water', 'q.lake_to_country', (ctx) => ctx.lakes)
export const mountainToCountry = toCountry('mountain_to_country', 'nature', 'q.mountain_to_country', (ctx) => ctx.mountains)

function compareGen(id: string, category: 'water' | 'nature', key: string, promptKey: string, pool: (ctx: GeneratorContext) => Entity[], unit: string): Generator {
  return {
    id,
    category,
    pool: (ctx) => pool(ctx).filter((e) => typeof e.attributes[key] === 'number'),
    make(target, ctx, rng, difficulty) {
      const cands = pool(ctx).filter((e) => e.id !== target.id && typeof e.attributes[key] === 'number')
      const other = rng.pick(cands)
      if (!other) return null
      const a = target.attributes[key] as number
      const b = other.attributes[key] as number
      if (a === b) return null
      const d = effectiveDifficulty(target, difficulty)
      return {
        id: qid(id, target), category, type: id, question_type: 'multiple_choice',
        prompt: { key: promptKey }, answer: a > b ? target.id : other.id,
        options: rng.shuffle([target, other]).map((e) => ({ id: e.id, label: nameOf(e) })), difficulty: d,
        entities: [target.id, other.id], explanation: `${nameOf(target)}: ${a.toLocaleString('de-DE')} ${unit} · ${nameOf(other)}: ${b.toLocaleString('de-DE')} ${unit}`,
        metadata: { generator: id, scope: ctx.scope },
      }
    },
  }
}

export const riverLonger = compareGen('river_longer', 'water', 'length_km', 'q.river_longer', (ctx) => ctx.rivers, 'km')
export const lakeLarger = compareGen('lake_larger', 'water', 'area_km2', 'q.lake_larger', (ctx) => ctx.lakes, 'km²')
export const mountainHigher = compareGen('mountain_higher', 'nature', 'elevation_m', 'q.mountain_higher', (ctx) => ctx.mountains, 'm')

function onMap(id: string, category: 'water' | 'nature', promptKey: string, pool: (ctx: GeneratorContext) => Entity[]): Generator {
  return {
    id,
    category,
    pool: (ctx) => pool(ctx).filter((e) => (e.attributes.countries as string[])?.length === 1 && ctx.byId.get(e.attributes.country!)?.geometry),
    make(target, ctx, _rng, difficulty) {
      const country = ctx.byId.get(target.attributes.country!)!
      const d = effectiveDifficulty(target, difficulty)
      return {
        id: qid(id, target), category, type: id, question_type: 'map_click',
        prompt: { key: promptKey, params: { name: nameOf(target) } }, answer: country.id,
        map: { kind: 'world', targetId: country.id }, difficulty: d, entities: [target.id, country.id],
        explanation: `${nameOf(target)} liegt in ${nameOf(country)}.`, metadata: { generator: id, scope: ctx.scope },
      }
    },
  }
}
export const waterOnMap = onMap('water_on_map', 'water', 'q.water_on_map', (ctx) => [...ctx.rivers, ...ctx.lakes])
export const mountainOnMap = onMap('mountain_on_map', 'nature', 'q.mountain_on_map', (ctx) => ctx.mountains)
