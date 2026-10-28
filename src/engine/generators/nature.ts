import type { Generator } from './base'
import { qid, effectiveDifficulty, nameOf, options, countryPool as sovereignPool } from './base'
import type { GeneratorContext } from '../types'
import type { Entity } from '@/domain/types'
import { hasMapGeometry, type MapFeatureType } from '@/domain/mapFeatures'

const countriesOf = (e: Entity, ctx: GeneratorContext) =>
  ((e.attributes.countries as string[]) ?? []).map((id) => ctx.byId.get(id)).filter((x): x is Entity => !!x)
const countryPool = (ctx: GeneratorContext) => sovereignPool(ctx)

function toCountry(
  id: string,
  category: 'water' | 'nature',
  promptKey: string,
  pool: (ctx: GeneratorContext) => Entity[],
): Generator {
  return {
    id,
    category,
    pool: (ctx) => pool(ctx).filter((e) => countriesOf(e, ctx).length),
    make(target, ctx, rng, difficulty) {
      const cs = countriesOf(target, ctx)
      const correct = rng.pick(cs)
      const exclude = new Set(cs.map((c) => c.id))
      const d = effectiveDifficulty(target, difficulty)
      const opts = options(
        correct,
        countryPool(ctx),
        ctx,
        rng,
        d,
        false,
        (country) => !exclude.has(country.id),
      )
      if (!opts) return null
      return {
        id: qid(id, target),
        category,
        type: id,
        question_type: 'multiple_choice',
        prompt: { key: promptKey, params: { name: nameOf(target) } },
        answer: correct.id,
        options: opts,
        difficulty: d,
        entities: [target.id, correct.id],
        explanation: cs.length > 1 ? `${nameOf(target)}: ${cs.map(nameOf).join(', ')}` : undefined,
        metadata: { generator: id, scope: ctx.scope },
      }
    },
  }
}

export const riverToCountry = toCountry(
  'river_to_country',
  'water',
  'q.river_to_country',
  (ctx) => ctx.rivers,
)
export const lakeToCountry = toCountry('lake_to_country', 'water', 'q.lake_to_country', (ctx) => ctx.lakes)
export const mountainToCountry = toCountry(
  'mountain_to_country',
  'nature',
  'q.mountain_to_country',
  (ctx) => ctx.mountains,
)

function compareGen(
  id: string,
  category: 'water' | 'nature',
  key: string,
  promptKey: string,
  pool: (ctx: GeneratorContext) => Entity[],
  unit: string,
): Generator {
  return {
    id,
    category,
    pool: (ctx) => pool(ctx).filter((e) => typeof e.attributes[key] === 'number'),
    make(target, ctx, rng, difficulty) {
      const a = target.attributes[key] as number
      const cands = pool(ctx).filter((e) => {
        const value = e.attributes[key] as number | undefined
        return (
          e.id !== target.id &&
          typeof value === 'number' &&
          value !== a &&
          Math.abs(a - value) / Math.max(a, value) >= 0.02
        )
      })
      const other = rng.pick(cands)
      if (!other) return null
      const b = other.attributes[key] as number
      const d = effectiveDifficulty(target, difficulty)
      return {
        id: qid(id, target),
        category,
        type: id,
        question_type: 'multiple_choice',
        prompt: { key: promptKey },
        answer: a > b ? target.id : other.id,
        options: rng.shuffle([target, other]).map((e) => ({ id: e.id, label: nameOf(e) })),
        difficulty: d,
        entities: [target.id, other.id],
        explanation: `${nameOf(target)}: ${a.toLocaleString('de-DE')} ${unit} · ${nameOf(other)}: ${b.toLocaleString('de-DE')} ${unit}`,
        metadata: { generator: id, scope: ctx.scope },
      }
    },
  }
}

export const riverLonger = compareGen(
  'river_longer',
  'water',
  'length_km',
  'q.river_longer',
  (ctx) => ctx.rivers,
  'km',
)
export const lakeLarger = compareGen(
  'lake_larger',
  'water',
  'area_km2',
  'q.lake_larger',
  (ctx) => ctx.lakes,
  'km²',
)
export const mountainHigher = compareGen(
  'mountain_higher',
  'nature',
  'elevation_m',
  'q.mountain_higher',
  (ctx) => ctx.mountains,
  'm',
)

function onMap(
  id: string,
  category: 'water' | 'nature',
  promptKey: string,
  pool: (ctx: GeneratorContext) => Entity[],
): Generator {
  return {
    id,
    category,
    pool: (ctx) => pool(ctx).filter(hasMapGeometry),
    make(target, ctx, rng, difficulty) {
      if (!hasMapGeometry(target)) return null
      const all = pool(ctx).filter((entity) => entity.type === target.type && hasMapGeometry(entity))
      const regional = all.filter((entity) => entity.attributes.continent === target.attributes.continent)
      const candidates = ctx.scope === 'world' && regional.length >= 4 ? regional : all
      const selected = [target]
      const minimumDistance = ctx.scope.startsWith('country:') ? 0.08 : 1.5
      for (const candidate of rng.shuffle(candidates.filter((entity) => entity.id !== target.id))) {
        if (selected.length >= 10) break
        const separated = selected.every((entity) => {
          if (!entity.location || !candidate.location) return true
          const lat = ((entity.location.lat + candidate.location.lat) * Math.PI) / 360
          const deltaLon = Math.abs(entity.location.lon - candidate.location.lon)
          return (
            Math.hypot(
              Math.min(deltaLon, 360 - deltaLon) * Math.cos(lat),
              entity.location.lat - candidate.location.lat,
            ) >= minimumDistance
          )
        })
        if (separated) selected.push(candidate)
      }
      for (const candidate of rng.shuffle(candidates)) {
        if (selected.length >= Math.min(4, candidates.length)) break
        if (!selected.some((entity) => entity.id === candidate.id)) selected.push(candidate)
      }
      return {
        id: qid(id, target),
        category,
        type: id,
        question_type: 'map_click',
        prompt: { key: promptKey, params: { name: nameOf(target) } },
        answer: target.id,
        map: {
          kind: 'features',
          targetId: target.id,
          featureType: target.type as MapFeatureType,
          featureIds: rng.shuffle(selected).map((entity) => entity.id),
          scope: ctx.scope,
        },
        difficulty: effectiveDifficulty(target, difficulty),
        entities: [target.id],
        explanation:
          target.type === 'river'
            ? `Der markierte Flusslauf gehört zu ${nameOf(target)}.`
            : target.type === 'lake'
              ? `Die markierte Seefläche gehört zu ${nameOf(target)}.`
              : `Hier liegt der Gipfel von ${nameOf(target)}.`,
        metadata: { generator: id, scope: ctx.scope },
      }
    },
  }
}
export const waterOnMap = onMap('water_on_map', 'water', 'q.water_on_map', (ctx) => [
  ...ctx.rivers,
  ...ctx.lakes,
])
export const mountainOnMap = onMap('mountain_on_map', 'nature', 'q.mountain_on_map', (ctx) => ctx.mountains)
