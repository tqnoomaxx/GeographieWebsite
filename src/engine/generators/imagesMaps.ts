import type { Generator } from './base'
import { options, qid, effectiveDifficulty, nameOf, photoOf, photoMedia, countryOf, countryPool, isSovereign } from './base'
import type { GeneratorContext } from '../types'

const withPhoto = (list: GeneratorContext['landmarks']) => list.filter((e) => photoOf(e))
/** Stadt-Entity einer Sehenswürdigkeit über located_in oder Namensgleichheit des Ortes. */
const cityOfLandmark = (l: GeneratorContext['landmarks'][0], ctx: GeneratorContext) => {
  const viaRel = (ctx.rel.locatedIn.get(l.id) ?? []).map((id) => ctx.byId.get(id)).find((e) => e?.type === 'city')
  if (viaRel) return viaRel
  return [...ctx.byId.values()].find((e) => e.type === 'city' && e.attributes.country === l.attributes.country && e.names.de === l.attributes.place_name)
}

export const imageToLandmark: Generator = {
  id: 'image_to_landmark',
  category: 'images',
  pool: (ctx) => withPhoto(ctx.landmarks),
  make(target, ctx, rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(target, withPhoto(ctx.landmarks), ctx, rng, d)
    if (!opts) return null
    return {
      id: qid(this.id, target), category: 'images', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.image_to_landmark' }, answer: target.id, options: opts, media: photoMedia(target), difficulty: d,
      entities: [target.id], metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const imageToCountry: Generator = {
  id: 'image_to_country',
  category: 'images',
  pool: (ctx) => [...withPhoto(ctx.landmarks), ...withPhoto(ctx.cities)].filter((e) => countryOf(e, ctx)),
  make(target, ctx, rng, difficulty) {
    const country = countryOf(target, ctx)!
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(country, countryPool(ctx), ctx, rng, d)
    if (!opts) return null
    return {
      id: qid(this.id, target), category: 'images', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.image_to_country' }, answer: country.id, options: opts, media: photoMedia(target), difficulty: d,
      entities: [target.id, country.id], explanation: `${nameOf(target)} liegt in ${nameOf(country)}.`,
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const imageToCity: Generator = {
  id: 'image_to_city',
  category: 'images',
  pool: (ctx) => withPhoto(ctx.cities),
  make(target, ctx, rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(target, ctx.cities, ctx, rng, d)
    if (!opts) return null
    return {
      id: qid(this.id, target), category: 'images', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.image_to_city' }, answer: target.id, options: opts, media: photoMedia(target), difficulty: d,
      entities: [target.id], metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const landmarkToCountry: Generator = {
  id: 'landmark_to_country',
  category: 'landmarks',
  pool: (ctx) => ctx.landmarks.filter((e) => countryOf(e, ctx)),
  make(target, ctx, rng, difficulty) {
    const country = countryOf(target, ctx)!
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(country, countryPool(ctx), ctx, rng, d)
    if (!opts) return null
    return {
      id: qid(this.id, target), category: 'landmarks', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.landmark_to_country', params: { name: nameOf(target) } }, answer: country.id, options: opts, difficulty: d,
      entities: [target.id, country.id], metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const landmarkToCity: Generator = {
  id: 'landmark_to_city',
  category: 'landmarks',
  pool: (ctx) => ctx.landmarks.filter((e) => cityOfLandmark(e, ctx)),
  make(target, ctx, rng, difficulty) {
    const city = cityOfLandmark(target, ctx)!
    const d = effectiveDifficulty(target, difficulty)
    const cities = [...ctx.byId.values()].filter((e) => e.type === 'city' && e.id !== city.id)
    const opts = options(city, cities, ctx, rng, d)
    if (!opts) return null
    return {
      id: qid(this.id, target), category: 'landmarks', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.landmark_to_city', params: { name: nameOf(target) } }, answer: city.id,
      options: opts, media: photoMedia(target), difficulty: d,
      entities: [target.id, city.id], metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const countryOnMap: Generator = {
  id: 'country_on_map',
  category: 'maps',
  pool: (ctx) => ctx.countries.filter((c) => c.attributes.on_world_map && isSovereign(c)),
  make(target, ctx, _rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    return {
      id: qid(this.id, target), category: 'maps', type: this.id, question_type: 'map_click',
      prompt: { key: 'q.country_on_map', params: { name: nameOf(target) } }, answer: target.id,
      map: { kind: 'world', targetId: target.id }, difficulty: d, entities: [target.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const regionOnMap: Generator = {
  id: 'region_on_map',
  category: 'maps',
  pool: (ctx) => ctx.regions.filter((r) => typeof r.attributes.map === 'string'),
  make(target, ctx, _rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    const country = countryOf(target, ctx)
    return {
      id: qid(this.id, target), category: 'maps', type: this.id, question_type: 'map_click',
      prompt: { key: 'q.region_on_map', params: { name: nameOf(target), country: country ? nameOf(country) : '' } }, answer: target.id,
      map: { kind: 'region', iso2: (target.attributes.code as string).split('-')[0], targetId: target.id }, difficulty: d, entities: [target.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}
