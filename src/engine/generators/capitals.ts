import type { Generator } from './base'
import { options, qid, accepted, effectiveDifficulty, nameOf, isSovereign, flagOf } from './base'
import type { GeneratorContext } from '../types'

const countriesWithCapital = (ctx: GeneratorContext) =>
  ctx.countries.filter((c) => isSovereign(c) && ctx.rel.capitalCity.has(c.id) && ctx.byId.has(ctx.rel.capitalCity.get(c.id)!))
const capitalCities = (ctx: GeneratorContext) => countriesWithCapital(ctx).map((c) => ctx.byId.get(ctx.rel.capitalCity.get(c.id)!)!)

export const countryToCapital: Generator = {
  id: 'country_to_capital',
  category: 'capitals',
  pool: countriesWithCapital,
  make(target, ctx, rng, difficulty) {
    const capital = ctx.byId.get(ctx.rel.capitalCity.get(target.id)!)!
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(capital, capitalCities(ctx), ctx, rng, d)
    if (!opts) return null
    return {
      id: qid(this.id, target),
      category: 'capitals',
      type: this.id,
      question_type: 'multiple_choice',
      prompt: { key: 'q.country_to_capital', params: { name: nameOf(target) } },
      answer: capital.id,
      options: opts,
      difficulty: d,
      entities: [target.id, capital.id],
      explanation: `${nameOf(capital)} ist eine Hauptstadt von ${nameOf(target)}.`,
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const capitalToCountry: Generator = {
  id: 'capital_to_country',
  category: 'capitals',
  pool: countriesWithCapital,
  make(target, ctx, rng, difficulty) {
    const capital = ctx.byId.get(ctx.rel.capitalCity.get(target.id)!)!
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(target, countriesWithCapital(ctx), ctx, rng, d)
    if (!opts) return null
    return {
      id: qid(this.id, target),
      category: 'capitals',
      type: this.id,
      question_type: 'multiple_choice',
      prompt: { key: 'q.capital_to_country', params: { name: nameOf(capital) } },
      answer: target.id,
      options: opts,
      difficulty: d,
      entities: [target.id, capital.id],
      explanation: `${nameOf(capital)} ist eine Hauptstadt von ${nameOf(target)}.`,
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const capitalInput: Generator = {
  id: 'capital_input',
  category: 'capitals',
  pool: countriesWithCapital,
  make(target, ctx, _rng, difficulty) {
    const capital = ctx.byId.get(ctx.rel.capitalCity.get(target.id)!)!
    const d = effectiveDifficulty(target, difficulty)
    return {
      id: qid(this.id, target),
      category: 'capitals',
      type: this.id,
      question_type: 'text_input',
      prompt: { key: 'q.capital_input', params: { name: nameOf(target) } },
      answer: capital.id,
      accepted: [...new Set([...accepted(capital), ...((target.attributes.capital_names as string[] | undefined) ?? [])])],
      difficulty: d,
      entities: [target.id, capital.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

/** Hauptstadt erkennen und die Flagge des zugehörigen Landes wählen. */
export const capitalToFlag: Generator = {
  id: 'capital_to_flag',
  category: 'capitals',
  pool: (ctx) => countriesWithCapital(ctx).filter((country) => flagOf(country)),
  make(target, ctx, rng, difficulty) {
    const capital = ctx.byId.get(ctx.rel.capitalCity.get(target.id)!)!
    const pool = countriesWithCapital(ctx).filter((country) => flagOf(country))
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(target, pool, ctx, rng, d, true)
    if (!opts) return null
    return {
      id: qid(this.id, target),
      category: 'capitals',
      type: this.id,
      question_type: 'image_choice',
      prompt: { key: 'q.capital_to_flag', params: { name: nameOf(capital) } },
      answer: target.id,
      options: opts.map((option) => ({ ...option, label: '' })),
      difficulty: d,
      entities: [target.id, capital.id],
      explanation: `${nameOf(capital)} ist eine Hauptstadt von ${nameOf(target)}.`,
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}
