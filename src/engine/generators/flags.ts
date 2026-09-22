import type { Generator } from './base'
import { flagOf, options, qid, accepted, flagMedia, effectiveDifficulty, nameOf, isSovereign, countryPool, uniqueFlags } from './base'

const countriesWithFlag = (ctx: Parameters<Generator['pool']>[0]) => ctx.countries.filter((c) => flagOf(c) && isSovereign(c))
const uniqueCountryFlags = (ctx: Parameters<Generator['pool']>[0]) => uniqueFlags(countriesWithFlag(ctx))

export const flagToCountry: Generator = {
  id: 'flag_to_country',
  category: 'flags',
  pool: uniqueCountryFlags,
  make(target, ctx, rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(target, uniqueCountryFlags(ctx), ctx, rng, d)
    if (!opts) return null
    return {
      id: qid(this.id, target),
      category: 'flags',
      type: this.id,
      question_type: 'multiple_choice',
      prompt: { key: 'q.flag_to_country' },
      answer: target.id,
      options: opts,
      media: flagMedia(target),
      difficulty: d,
      entities: [target.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const countryToFlag: Generator = {
  id: 'country_to_flag',
  category: 'flags',
  pool: countriesWithFlag,
  make(target, ctx, rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(target, countriesWithFlag(ctx), ctx, rng, d, true)
    if (!opts) return null
    return {
      id: qid(this.id, target),
      category: 'flags',
      type: this.id,
      question_type: 'image_choice',
      prompt: { key: 'q.country_to_flag', params: { name: nameOf(target) } },
      answer: target.id,
      options: opts.map((o) => ({ ...o, label: '' })),
      difficulty: d,
      entities: [target.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const flagToCountryInput: Generator = {
  id: 'flag_to_country_input',
  category: 'flags',
  pool: uniqueCountryFlags,
  make(target, ctx, _rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    return {
      id: qid(this.id, target),
      category: 'flags',
      type: this.id,
      question_type: 'text_input',
      prompt: { key: 'q.flag_to_country_input' },
      answer: target.id,
      accepted: accepted(target),
      media: flagMedia(target),
      difficulty: d,
      entities: [target.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

// ---- Regionalflaggen im Flaggen-Modus (damit „Alle“ = 1.071 Flaggen umfasst)
import { countryOf, flagOf as flagOfEntity } from './base'
import type { GeneratorContext } from '../types'
import type { Entity } from '@/domain/types'

const regionsWithFlag = (ctx: GeneratorContext) => ctx.regions.filter((r) => flagOfEntity(r))
const siblingsOf = (r: Entity, ctx: GeneratorContext) => ctx.regions.filter((x) => x.attributes.country === r.attributes.country && flagOfEntity(x))
const uniqueSiblingFlags = (r: Entity, ctx: GeneratorContext) => uniqueFlags(siblingsOf(r, ctx))

export const flagToRegion: Generator = {
  id: 'flag_to_region',
  category: 'flags',
  pool: (ctx) => regionsWithFlag(ctx).filter((r) => siblingsOf(r, ctx).length >= 4 && uniqueSiblingFlags(r, ctx).includes(r)),
  make(target, ctx, rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(target, siblingsOf(target, ctx), ctx, rng, d)
    if (!opts) return null
    const country = countryOf(target, ctx)
    return {
      id: qid(this.id, target), category: 'flags', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.region_flag_to_region', params: { country: country ? nameOf(country) : '' } },
      answer: target.id, options: opts, media: flagMedia(target), difficulty: d, entities: [target.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const regionToFlag: Generator = {
  id: 'region_to_flag',
  category: 'flags',
  pool: (ctx) => regionsWithFlag(ctx).filter((r) => siblingsOf(r, ctx).length >= 4),
  make(target, ctx, rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(target, siblingsOf(target, ctx), ctx, rng, d, true)
    if (!opts) return null
    return {
      id: qid(this.id, target), category: 'flags', type: this.id, question_type: 'image_choice',
      prompt: { key: 'q.country_to_flag', params: { name: nameOf(target) } },
      answer: target.id, options: opts.map((o) => ({ ...o, label: '' })), difficulty: d, entities: [target.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

/** Regionalflaggen ohne Antwortvorgaben; bildgleiche Flaggen desselben Landes werden ausgeschlossen. */
export const regionFlagInput: Generator = {
  id: 'region_flag_input',
  category: 'flags',
  pool: (ctx) => regionsWithFlag(ctx).filter((r) => uniqueSiblingFlags(r, ctx).includes(r)),
  make(target, ctx, _rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    const country = countryOf(target, ctx)
    return {
      id: qid(this.id, target), category: 'flags', type: this.id, question_type: 'text_input',
      prompt: { key: 'q.region_flag_input', params: { country: country ? nameOf(country) : '' } },
      answer: target.id, accepted: accepted(target), media: flagMedia(target), difficulty: d, entities: [target.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

/** Flagge zeigen → Region auf der Karte des Landes antippen. */
export const flagToRegionMap: Generator = {
  id: 'flag_to_region_map',
  category: 'flags',
  pool: (ctx) => regionsWithFlag(ctx).filter((r) => typeof r.attributes.map === 'string' && uniqueSiblingFlags(r, ctx).includes(r)),
  make(target, ctx, _rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    const country = countryOf(target, ctx)
    return {
      id: qid(this.id, target), category: 'flags', type: this.id, question_type: 'map_click',
      prompt: { key: 'q.flag_to_region_map', params: { country: country ? nameOf(country) : '' } },
      answer: target.id, media: flagMedia(target),
      map: { kind: 'region', iso2: (target.attributes.code as string).split('-')[0], targetId: target.id },
      difficulty: d, entities: [target.id], metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

/** Flagge zeigen → Land auf der Weltkarte antippen. */
export const flagToCountryMap: Generator = {
  id: 'flag_to_country_map',
  category: 'flags',
  pool: (ctx) => uniqueCountryFlags(ctx).filter((c) => c.attributes.on_world_map),
  make(target, ctx, _rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    return {
      id: qid(this.id, target), category: 'flags', type: this.id, question_type: 'map_click',
      prompt: { key: 'q.flag_to_country_map' }, answer: target.id, media: flagMedia(target),
      map: { kind: 'world', targetId: target.id }, difficulty: d, entities: [target.id], metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

/** Regionalflagge → zu welchem Land gehört sie? (über alle Regionen hinweg) */
export const regionFlagToCountry: Generator = {
  id: 'region_flag_to_country',
  category: 'flags',
  pool: (ctx) => uniqueFlags(regionsWithFlag(ctx)).filter((r) => countryOf(r, ctx)),
  make(target, ctx, rng, difficulty) {
    const country = countryOf(target, ctx)!
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(country, countryPool(ctx), ctx, rng, d)
    if (!opts) return null
    return {
      id: qid(this.id, target), category: 'flags', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.region_flag_to_country' }, answer: country.id, options: opts, media: flagMedia(target), difficulty: d,
      entities: [target.id, country.id], explanation: `${nameOf(target)} liegt in ${nameOf(country)}.`, metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}
/** Europa-Karte: Region mit Flagge auf der gemeinsamen Europakarte finden (883 Gebiete im Altbestand, 474 mit Flagge). */
export const flagToEuropeMap: Generator = {
  id: 'flag_to_europe_map',
  category: 'flags',
  pool: (ctx) => uniqueFlags(ctx.regions.filter((r) => r.attributes.europe_map && flagOfEntity(r))),
  make(target, ctx, _rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    const country = countryOf(target, ctx)
    return {
      id: qid(this.id, target), category: 'flags', type: this.id, question_type: 'map_click',
      prompt: { key: 'q.flag_to_europe_map', params: { country: country ? nameOf(country) : '' } },
      answer: target.id, media: flagMedia(target), map: { kind: 'europe', targetId: target.id },
      difficulty: d, entities: [target.id], metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}
