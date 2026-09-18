import type { Generator } from './base'
import { flagOf, options, qid, accepted, flagMedia, effectiveDifficulty, nameOf } from './base'

const countriesWithFlag = (ctx: Parameters<Generator['pool']>[0]) => ctx.countries.filter((c) => flagOf(c))

export const flagToCountry: Generator = {
  id: 'flag_to_country',
  category: 'flags',
  pool: countriesWithFlag,
  make(target, ctx, rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(target, countriesWithFlag(ctx), ctx, rng, d)
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
  pool: countriesWithFlag,
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
