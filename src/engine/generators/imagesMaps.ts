import type { Generator } from './base'
import { options, qid, effectiveDifficulty, nameOf, photoOf, photoMedia, countryOf } from './base'
import type { GeneratorContext } from '../types'
import type { Country } from '@/domain/types'

const withPhoto = (list: GeneratorContext['landmarks']) => list.filter((e) => photoOf(e))

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
    const pool = ctx.countries.length >= 4 ? ctx.countries : [...ctx.byId.values()].filter((e) => e.type === 'country')
    const opts = options(country, pool, ctx, rng, d)
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
    const pool = ctx.countries.length >= 4 ? ctx.countries : [...ctx.byId.values()].filter((e) => e.type === 'country')
    const opts = options(country, pool, ctx, rng, d)
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
  pool: (ctx) => ctx.landmarks.filter((e) => typeof e.attributes.place_name === 'string'),
  make(target, ctx, rng, difficulty) {
    const place = target.attributes.place_name as string
    const others = [...new Set(ctx.landmarks.map((l) => l.attributes.place_name as string).filter((p) => p && p !== place))]
    const wrong = rng.shuffle(others).slice(0, 3)
    if (wrong.length < 3) return null
    const d = effectiveDifficulty(target, difficulty)
    return {
      id: qid(this.id, target), category: 'landmarks', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.landmark_to_city', params: { name: nameOf(target) } }, answer: place,
      options: rng.shuffle([place, ...wrong]).map((p) => ({ id: p, label: p })), media: photoMedia(target), difficulty: d,
      entities: [target.id], metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const countryOnMap: Generator = {
  id: 'country_on_map',
  category: 'maps',
  pool: (ctx) => ctx.countries.filter((c) => c.geometry && (c as Country).attributes.independent !== false),
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
