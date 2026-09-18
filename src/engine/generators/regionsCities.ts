import type { Generator } from './base'
import { options, qid, effectiveDifficulty, nameOf, flagMedia, flagOf, countryOf, accepted, countryPool, isSovereign } from './base'
import type { GeneratorContext } from '../types'

const regionsWithFlag = (ctx: GeneratorContext) => ctx.regions.filter((r) => flagOf(r))
const siblings = (r: GeneratorContext['regions'][0], ctx: GeneratorContext) => ctx.regions.filter((x) => x.attributes.country === r.attributes.country)

export const regionFlagToRegion: Generator = {
  id: 'region_flag_to_region',
  category: 'regions',
  pool: (ctx) => regionsWithFlag(ctx).filter((r) => siblings(r, ctx).length >= 4),
  make(target, ctx, rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(target, siblings(target, ctx), ctx, rng, d)
    if (!opts) return null
    const country = countryOf(target, ctx)
    return {
      id: qid(this.id, target), category: 'regions', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.region_flag_to_region', params: { country: country ? nameOf(country) : '' } },
      answer: target.id, options: opts, media: flagMedia(target), difficulty: d, entities: [target.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const regionToCountry: Generator = {
  id: 'region_to_country',
  category: 'regions',
  pool: (ctx) => ctx.regions.filter((r) => countryOf(r, ctx)),
  make(target, ctx, rng, difficulty) {
    const country = countryOf(target, ctx)!
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(country, countryPool(ctx), ctx, rng, d)
    if (!opts) return null
    return {
      id: qid(this.id, target), category: 'regions', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.region_to_country', params: { name: nameOf(target) } },
      answer: country.id, options: opts, media: flagMedia(target), difficulty: d, entities: [target.id, country.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const regionCapital: Generator = {
  id: 'region_capital',
  category: 'regions',
  pool: (ctx) => ctx.regions.filter((r) => ctx.rel.capitalCity.has(r.id) && siblings(r, ctx).filter((s) => ctx.rel.capitalCity.has(s.id)).length >= 4),
  make(target, ctx, rng, difficulty) {
    const capital = ctx.byId.get(ctx.rel.capitalCity.get(target.id)!)
    if (!capital) return null
    const sibCaps = siblings(target, ctx).map((s) => ctx.byId.get(ctx.rel.capitalCity.get(s.id) ?? '')).filter((x): x is NonNullable<typeof x> => !!x)
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(capital, sibCaps, ctx, rng, d)
    if (!opts) return null
    return {
      id: qid(this.id, target), category: 'regions', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.region_capital', params: { name: nameOf(target) } },
      answer: capital.id, options: opts, difficulty: d, entities: [target.id, capital.id],
      explanation: `${nameOf(capital)} ist die Hauptstadt von ${nameOf(target)}.`,
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const cityToCountry: Generator = {
  id: 'city_to_country',
  category: 'cities',
  pool: (ctx) => ctx.cities.filter((c) => countryOf(c, ctx) && isSovereign(countryOf(c, ctx)!)),
  make(target, ctx, rng, difficulty) {
    const country = countryOf(target, ctx)!
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(country, countryPool(ctx), ctx, rng, d)
    if (!opts) return null
    return {
      id: qid(this.id, target), category: 'cities', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.city_to_country', params: { name: nameOf(target) } },
      answer: country.id, options: opts, difficulty: d, entities: [target.id, country.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const cityToRegion: Generator = {
  id: 'city_to_region',
  category: 'cities',
  pool: (ctx) => ctx.cities.filter((c) => c.attributes.region && ctx.byId.has(c.attributes.region)),
  make(target, ctx, rng, difficulty) {
    const region = ctx.byId.get(target.attributes.region!)!
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(region, siblings(region, ctx), ctx, rng, d)
    if (!opts) return null
    return {
      id: qid(this.id, target), category: 'cities', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.city_to_region', params: { name: nameOf(target) } },
      answer: region.id, options: opts, difficulty: d, entities: [target.id, region.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const cityInput: Generator = {
  id: 'city_input',
  category: 'cities',
  pool: (ctx) => ctx.cities.filter((c) => c.attributes.is_capital && countryOf(c, ctx) && isSovereign(countryOf(c, ctx)!)),
  make(target, ctx, _rng, difficulty) {
    const country = countryOf(target, ctx)!
    const d = effectiveDifficulty(target, difficulty)
    return {
      id: qid(this.id, target), category: 'cities', type: this.id, question_type: 'text_input',
      prompt: { key: 'q.capital_input', params: { name: nameOf(country) } },
      answer: target.id, accepted: accepted(target), difficulty: d, entities: [target.id, country.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}
