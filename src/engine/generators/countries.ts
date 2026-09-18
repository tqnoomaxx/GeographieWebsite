import type { Generator } from './base'
import { qid, effectiveDifficulty, nameOf, flagMedia } from './base'
import type { Country } from '@/domain/types'
import type { GeneratorContext } from '../types'

const independent = (ctx: GeneratorContext) => ctx.countries.filter((c) => (c as Country).attributes.independent !== false)

/** Fragt eine Eigenschaft ab: Kontinent, Währung, Amtssprache, Nachbar, Einwohnervergleich. */
export const countryAttribute: Generator = {
  id: 'country_attribute',
  category: 'countries',
  pool: independent,
  make(target, ctx, rng, difficulty) {
    const c = target as Country
    const d = effectiveDifficulty(target, difficulty)
    const variants: Array<() => ReturnType<Generator['make']>> = []
    if (c.attributes.currencies?.length) {
      variants.push(() => {
        const cur = c.attributes.currencies![0]
        const pool = independent(ctx).filter((x) => (x as Country).attributes.currencies?.[0]?.name && (x as Country).attributes.currencies![0].name !== cur.name)
        const wrong = rng.shuffle(pool).slice(0, 3).map((x) => (x as Country).attributes.currencies![0].name)
        if (new Set(wrong).size < 3) return null
        const opts = rng.shuffle([cur.name, ...wrong]).map((l) => ({ id: l, label: l }))
        return {
          id: qid('currency', target), category: 'countries' as const, type: 'country_currency', question_type: 'multiple_choice' as const,
          prompt: { key: 'q.country_currency', params: { name: nameOf(c) } }, answer: cur.name, options: opts, difficulty: d,
          entities: [c.id], explanation: `Die Währung von ${nameOf(c)} ist ${cur.name}.`, metadata: { generator: this.id, scope: ctx.scope },
        }
      })
    }
    if (c.attributes.languages?.length === 1) {
      variants.push(() => {
        const lang = c.attributes.languages![0]
        const pool = [...new Set(independent(ctx).flatMap((x) => (x as Country).attributes.languages ?? []).filter((l) => l !== lang))]
        const wrong = rng.shuffle(pool).slice(0, 3)
        if (wrong.length < 3) return null
        const opts = rng.shuffle([lang, ...wrong]).map((l) => ({ id: l, label: l }))
        return {
          id: qid('language', target), category: 'countries' as const, type: 'country_language', question_type: 'multiple_choice' as const,
          prompt: { key: 'q.country_language', params: { name: nameOf(c) } }, answer: lang, options: opts, difficulty: d,
          entities: [c.id], metadata: { generator: this.id, scope: ctx.scope },
        }
      })
    }
    if (c.attributes.continent) {
      variants.push(() => {
        const all = ['europe', 'asia', 'africa', 'north-america', 'south-america', 'oceania']
        const opts = rng.shuffle([c.attributes.continent!, ...rng.shuffle(all.filter((x) => x !== c.attributes.continent)).slice(0, 3)]).map((l) => ({ id: l, label: l }))
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

export const neighborOfCountry: Generator = {
  id: 'neighbor_of_country',
  category: 'countries',
  pool: (ctx) => independent(ctx).filter((c) => (ctx.rel.neighbors.get(c.id)?.length ?? 0) >= 1),
  make(target, ctx, rng, difficulty) {
    const neighbors = (ctx.rel.neighbors.get(target.id) ?? []).map((id) => ctx.byId.get(id)).filter(Boolean)
    if (!neighbors.length) return null
    const correct = rng.pick(neighbors)!
    const neighborSet = new Set([target.id, ...neighbors.map((n) => n!.id)])
    const sameContinent = ctx.countries.filter((c) => !neighborSet.has(c.id) && c.attributes.continent === target.attributes.continent)
    const others = ctx.countries.filter((c) => !neighborSet.has(c.id) && c.attributes.continent !== target.attributes.continent)
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
  pool: (ctx) => independent(ctx).filter((c) => (c as Country).attributes.population),
  make(target, ctx, rng, difficulty) {
    const c = target as Country
    const pool = independent(ctx).filter((x) => x.id !== c.id && (x as Country).attributes.population)
    const other = rng.pick(pool) as Country
    if (!other) return null
    const truth = c.attributes.population! > other.attributes.population!
    const d = effectiveDifficulty(target, difficulty)
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

export function formatPop(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2).replace('.', ',')} Mrd.`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace('.', ',')} Mio.`
  return n.toLocaleString('de-DE')
}
