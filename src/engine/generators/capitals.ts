import type { Generator } from './base'
import type { Country, Entity } from '@/domain/types'
import { options, qid, effectiveDifficulty, nameOf, isSovereign, flagOf } from './base'
import type { GeneratorContext } from '../types'
import { capitalAnswers, capitalFacts, countryCapitals } from '@/domain/capitals'

const countriesWithCapital = (ctx: GeneratorContext) =>
  ctx.countries.filter(
    (c) => isSovereign(c) && ctx.rel.capitalCity.has(c.id) && ctx.byId.has(ctx.rel.capitalCity.get(c.id)!),
  )
const capitalCities = (ctx: GeneratorContext) =>
  countriesWithCapital(ctx).flatMap((country) => countryCapitals(country, ctx.byId))
function capitalPrompt(country: Entity, standard: string) {
  const kind =
    country.attributes.iso2 === 'CH'
      ? 'federal_city'
      : (country as Country).attributes.capital_details?.some(
            (place) => place.quiz && place.role === 'claimed',
          )
        ? 'claimed_capital'
        : undefined
  if (!kind) return `q.${standard}`
  const suffix = {
    country_to_capital: `country_to_${kind}`,
    capital_input: `${kind}_input`,
    capital_to_country: `${kind}_to_country`,
    capital_to_flag: `${kind}_to_flag`,
  }[standard]
  return `q.${suffix}`
}
const explanation = (country: Entity, ctx: GeneratorContext) =>
  `${nameOf(country)}: ${capitalFacts(country, ctx.byId).join(' · ')}.${country.attributes.capital_note ? ` ${country.attributes.capital_note}` : ''}`

export const countryToCapital: Generator = {
  id: 'country_to_capital',
  category: 'capitals',
  pool: countriesWithCapital,
  make(target, ctx, rng, difficulty) {
    const capitals = countryCapitals(target, ctx.byId)
    const capital = rng.pick(capitals)!
    const d = effectiveDifficulty(target, difficulty)
    const otherCapitals = new Set(capitals.filter((city) => city.id !== capital.id).map((city) => city.id))
    const opts = options(
      capital,
      capitalCities(ctx).filter((city) => !otherCapitals.has(city.id)),
      ctx,
      rng,
      d,
      false,
      (city) => {
        const country = city.attributes.country ? ctx.byId.get(city.attributes.country) : undefined
        return (
          city.attributes.is_capital === true &&
          country?.id !== target.id &&
          !!country &&
          isSovereign(country)
        )
      },
    )
    if (!opts) return null
    return {
      id: qid(this.id, target),
      category: 'capitals',
      type: this.id,
      question_type: 'multiple_choice',
      prompt: {
        key: capitalPrompt(target, 'country_to_capital'),
        params: { name: nameOf(target) },
      },
      answer: capital.id,
      options: opts,
      difficulty: d,
      entities: [target.id, capital.id],
      explanation: explanation(target, ctx),
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const capitalToCountry: Generator = {
  id: 'capital_to_country',
  category: 'capitals',
  pool: countriesWithCapital,
  make(target, ctx, rng, difficulty) {
    const capital = rng.pick(countryCapitals(target, ctx.byId))!
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(target, countriesWithCapital(ctx), ctx, rng, d)
    if (!opts) return null
    return {
      id: qid(this.id, target),
      category: 'capitals',
      type: this.id,
      question_type: 'multiple_choice',
      prompt: {
        key: capitalPrompt(target, 'capital_to_country'),
        params: { name: nameOf(capital) },
      },
      answer: target.id,
      options: opts,
      difficulty: d,
      entities: [target.id, capital.id],
      explanation: explanation(target, ctx),
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
      prompt: {
        key: capitalPrompt(target, 'capital_input'),
        params: { name: nameOf(target) },
      },
      answer: capital.id,
      accepted: capitalAnswers(target, ctx.byId),
      explanation: explanation(target, ctx),
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
    const capital = rng.pick(countryCapitals(target, ctx.byId))!
    const pool = countriesWithCapital(ctx).filter((country) => flagOf(country))
    const d = effectiveDifficulty(target, difficulty)
    const opts = options(target, pool, ctx, rng, d, true)
    if (!opts) return null
    return {
      id: qid(this.id, target),
      category: 'capitals',
      type: this.id,
      question_type: 'image_choice',
      prompt: {
        key: capitalPrompt(target, 'capital_to_flag'),
        params: { name: nameOf(capital) },
      },
      answer: target.id,
      options: opts.map((option) => ({ ...option, label: '' })),
      difficulty: d,
      entities: [target.id, capital.id],
      explanation: explanation(target, ctx),
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}
