import type { Generator } from './base'
import { qid, effectiveDifficulty, nameOf, flagMedia, isSovereign, options } from './base'

const CONTINENT_DE: Record<string, string> = { europe: 'Europa', asia: 'Asien', africa: 'Afrika', 'north-america': 'Nordamerika', 'south-america': 'Südamerika', oceania: 'Ozeanien', antarctica: 'Antarktis' }
import type { Country } from '@/domain/types'
import type { GeneratorContext } from '../types'

const independent = (ctx: GeneratorContext) => ctx.countries.filter(isSovereign)

/** Fragt eine belastbare Eigenschaft ab: Kontinent oder Währung. */
export const countryAttribute: Generator = {
  id: 'country_attribute',
  category: 'countries',
  pool: independent,
  make(target, ctx, rng, difficulty): ReturnType<Generator['make']> {
    const c = target as Country
    const d = effectiveDifficulty(target, difficulty)
    const variants: Array<() => ReturnType<Generator['make']>> = []
    if (c.attributes.currencies?.length) {
      variants.push(() => {
        const cur = c.attributes.currencies![0]
        const pool = [...new Set(independent(ctx).flatMap((x) => (x as Country).attributes.currencies?.map((currency) => currency.name) ?? []).filter((name) => name !== cur.name))]
        const wrong = rng.shuffle(pool).slice(0, 3)
        if (wrong.length < 3) return null
        const opts = rng.shuffle([cur.name, ...wrong]).map((l) => ({ id: l, label: l }))
        return {
          id: qid('currency', target), category: 'countries' as const, type: 'country_currency', question_type: 'multiple_choice' as const,
          prompt: { key: 'q.country_currency', params: { name: nameOf(c) } }, answer: cur.name, options: opts, difficulty: d,
          entities: [c.id], explanation: `Die Währung von ${nameOf(c)} ist ${cur.name}.`, metadata: { generator: this.id, scope: ctx.scope },
        }
      })
    }
    if (c.attributes.continent) {
      variants.push(() => {
        const all = ['europe', 'asia', 'africa', 'north-america', 'south-america', 'oceania']
        const opts = rng.shuffle([c.attributes.continent!, ...rng.shuffle(all.filter((x) => x !== c.attributes.continent)).slice(0, 3)]).map((l) => ({ id: l, label: CONTINENT_DE[l] ?? l }))
        return {
          id: qid('continent', target), category: 'countries' as const, type: 'country_continent', question_type: 'multiple_choice' as const,
          prompt: { key: 'q.country_continent', params: { name: nameOf(c) } }, answer: c.attributes.continent!, options: opts, difficulty: 1,
          media: flagMedia(c), entities: [c.id], metadata: { generator: this.id, scope: ctx.scope },
        }
      })
    }
    if (!variants.length) return null
    for (const v of rng.shuffle(variants)) {
      const q = v()
      if (q) return q
    }
    return null
  },
}

/** ISO-Kürzel und internationale Telefonvorwahlen in beide Richtungen. */
export const countryCode: Generator = {
  id: 'country_code',
  category: 'countries',
  pool: (ctx) => independent(ctx).filter((country) => country.attributes.iso2),
  make(target, ctx, rng, difficulty) {
    const countries = independent(ctx)
    const d = effectiveDifficulty(target, difficulty)
    const variants: Array<() => ReturnType<Generator['make']>> = []
    const iso = target.attributes.iso2 as string
    variants.push(() => {
      const opts = options(target, countries, ctx, rng, d)
      if (!opts) return null
      return {
        id: qid('iso_to_country', target), category: 'countries' as const, type: 'iso_to_country', question_type: 'multiple_choice' as const,
        prompt: { key: 'q.iso_to_country', params: { code: iso } }, answer: target.id, options: opts, difficulty: d,
        entities: [target.id], metadata: { generator: this.id, scope: ctx.scope },
      }
    })
    variants.push(() => {
      const codes = rng.shuffle(countries.filter((country) => country.id !== target.id).map((country) => country.attributes.iso2 as string)).slice(0, 3)
      if (codes.length < 3) return null
      return {
        id: qid('country_to_iso', target), category: 'countries' as const, type: 'country_to_iso', question_type: 'multiple_choice' as const,
        prompt: { key: 'q.country_to_iso', params: { name: nameOf(target) } }, answer: iso,
        options: rng.shuffle([iso, ...codes]).map((code) => ({ id: code, label: code })), difficulty: d,
        entities: [target.id], metadata: { generator: this.id, scope: ctx.scope },
      }
    })
    const callingCode = target.attributes.calling_code as string | undefined
    if (callingCode) {
      variants.push(() => {
        const codes = [...new Set(countries.map((country) => country.attributes.calling_code as string | undefined).filter((code): code is string => !!code && code !== callingCode))]
        const wrong = rng.shuffle(codes).slice(0, 3)
        if (wrong.length < 3) return null
        return {
          id: qid('calling_code', target), category: 'countries' as const, type: 'country_calling_code', question_type: 'multiple_choice' as const,
          prompt: { key: 'q.country_calling_code', params: { name: nameOf(target) } }, answer: callingCode,
          options: rng.shuffle([callingCode, ...wrong]).map((code) => ({ id: code, label: code })), difficulty: d,
          entities: [target.id], metadata: { generator: this.id, scope: ctx.scope },
        }
      })
    }
    for (const variant of rng.shuffle(variants)) {
      const question = variant()
      if (question) return question
    }
    return null
  },
}

/** Vergleicht Länder anhand robuster numerischer Fakten. */
export const countryComparison: Generator = {
  id: 'country_comparison',
  category: 'countries',
  pool: (ctx) => independent(ctx).filter((country) => country.attributes.population || country.attributes.area_km2),
  make(target, ctx, rng, difficulty) {
    const variants = [
      { key: 'population', prompt: 'q.country_population_compare', unit: 'Einwohner' },
      { key: 'area_km2', prompt: 'q.country_area_compare', unit: 'km²' },
    ] as const
    for (const variant of rng.shuffle(variants)) {
      const value = target.attributes[variant.key] as number | undefined
      if (!value) continue
      const candidates = independent(ctx).filter((country) => {
        const other = country.attributes[variant.key] as number | undefined
        return country.id !== target.id && !!other && Math.abs(value - other) / Math.max(value, other) >= 0.03
      })
      const other = rng.pick(candidates)
      if (!other) continue
      const otherValue = other.attributes[variant.key] as number
      const answer = value > otherValue ? target : other
      const d = effectiveDifficulty(target, difficulty)
      return {
        id: qid(`compare-${variant.key}`, target), category: 'countries', type: `country_${variant.key}_compare`, question_type: 'multiple_choice',
        prompt: { key: variant.prompt }, answer: answer.id,
        options: rng.shuffle([target, other]).map((country) => ({ id: country.id, label: nameOf(country) })), difficulty: d,
        entities: [target.id, other.id],
        explanation: `${nameOf(target)}: ${formatMetric(value, variant.key)} · ${nameOf(other)}: ${formatMetric(otherValue, variant.key)}`,
        metadata: { generator: this.id, scope: ctx.scope },
      }
    }
    return null
  },
}

export const neighborOfCountry: Generator = {
  id: 'neighbor_of_country',
  category: 'countries',
  pool: (ctx) => independent(ctx).filter((c) => (ctx.rel.neighbors.get(c.id)?.length ?? 0) >= 1),
  make(target, ctx, rng, difficulty) {
    const neighbors = (ctx.rel.neighbors.get(target.id) ?? []).map((id) => ctx.byId.get(id)).filter(Boolean)
    if (!neighbors.length) return null
    const correct = rng.pick(neighbors)!
    const neighborSet = new Set([target.id, ...neighbors.map((n) => n!.id)])
    const sameContinent = independent(ctx).filter((c) => !neighborSet.has(c.id) && c.attributes.continent === target.attributes.continent)
    // Außerhalb des Bereichs auffüllen, wenn z. B. Brasilien fast ganz Südamerika als Nachbarn hat
    const all = [...ctx.byId.values()].filter((c) => c.type === 'country' && isSovereign(c) && !neighborSet.has(c.id))
    const others = all.filter((c) => c.attributes.continent !== target.attributes.continent || !ctx.countries.includes(c))
    const wrong = [...rng.shuffle(sameContinent), ...rng.shuffle(others)].slice(0, 3)
    if (wrong.length < 3) return null
    const d = effectiveDifficulty(target, difficulty)
    return {
      id: qid(this.id, target),
      category: 'countries',
      type: this.id,
      question_type: 'multiple_choice',
      prompt: { key: 'q.neighbor_of_country', params: { name: nameOf(target) } },
      answer: correct.id,
      options: rng.shuffle([correct, ...wrong]).map((e) => ({ id: e.id, label: nameOf(e) })),
      difficulty: d,
      entities: [target.id, correct.id],
      explanation: `${nameOf(correct)} grenzt an ${nameOf(target)}.`,
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const countryTrueFalse: Generator = {
  id: 'country_true_false',
  category: 'countries',
  pool: (ctx) => independent(ctx).filter((c) => (c as Country).attributes.population || typeof c.attributes.landlocked === 'boolean'),
  make(target, ctx, rng, difficulty): ReturnType<Generator['make']> {
    const c = target as Country
    const d = effectiveDifficulty(target, difficulty)
    if (typeof c.attributes.landlocked === 'boolean' && rng.next() < 0.4) {
      return {
        id: qid('landlocked', target), category: 'countries', type: 'country_landlocked', question_type: 'true_false',
        prompt: { key: 'q.country_landlocked', params: { name: nameOf(c) } }, answer: c.attributes.landlocked ? 'true' : 'false',
        options: [{ id: 'true', label: 'Wahr' }, { id: 'false', label: 'Falsch' }], difficulty: d,
        entities: [c.id], explanation: c.attributes.landlocked ? `${nameOf(c)} hat keinen Zugang zum offenen Meer.` : `${nameOf(c)} hat Zugang zum Meer.`,
        metadata: { generator: this.id, scope: ctx.scope },
      }
    }
    const pool = independent(ctx).filter((x) => x.id !== c.id && (x as Country).attributes.population)
    const other = rng.pick(pool) as Country
    if (!other || !c.attributes.population) return null
    const truth = c.attributes.population > other.attributes.population!
    return {
      id: qid(this.id, target),
      category: 'countries',
      type: this.id,
      question_type: 'true_false',
      prompt: { key: 'q.population_compare', params: { a: nameOf(c), b: nameOf(other) } },
      answer: truth ? 'true' : 'false',
      options: [
        { id: 'true', label: 'Wahr' },
        { id: 'false', label: 'Falsch' },
      ],
      difficulty: d,
      entities: [c.id, other.id],
      explanation: `${nameOf(c)}: ${formatPop(c.attributes.population!)} · ${nameOf(other)}: ${formatPop(other.attributes.population!)}`,
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

function formatMetric(value: number, key: 'population' | 'area_km2') {
  return key === 'population' ? `${formatPop(value)} Einwohner` : `${value.toLocaleString('de-DE')} km²`
}

export function formatPop(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2).replace('.', ',')} Mrd.`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace('.', ',')} Mio.`
  return n.toLocaleString('de-DE')
}
