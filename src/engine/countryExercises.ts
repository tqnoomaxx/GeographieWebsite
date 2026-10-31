import { EXERCISES, exercisePath, exerciseScopeAllowed, type Exercise } from '@/config/quizCatalog'
import type { Country } from '@/domain/types'
import { CITY_RECALL_DEFAULT, CITY_RECALL_MINIMUM, type RecallIndex } from '@/domain/cityRecall'
import type { GeneratorContext } from './types'
import { countryProfileFields } from './generators/countryProfile'
import { createRng } from './rng'
import { poolFor } from './session'
import type { ModeForm } from '@/config/quizzes'

export interface CountryExercise {
  exercise: Exercise
  mode: ModeForm
  count: number
  fields?: string[]
  minPopulation?: number
  href: string
}
export const countryExerciseCandidates = (scope: string) =>
  EXERCISES.filter((exercise) =>
    Object.keys(exercise.variants).some((form) => exerciseScopeAllowed(exercise, scope, form)),
  )
export function countryProfileSelection(country: Country, ctx: GeneratorContext) {
  const available = countryProfileFields(country, ctx).filter(
    (field) => field.answers.length && field.display,
  )
  const order = ['capital', 'currency', 'language', 'neighbors', 'highest_point', 'continent', 'tld', 'iso2']
  return order.filter((id) => available.some((field) => field.id === id)).slice(0, 5)
}
export function countryExerciseHref(
  exercise: Exercise,
  scope: string,
  mode: ModeForm,
  fields?: string[],
  minPopulation?: number,
) {
  const params = new URLSearchParams({ scope, mode })
  if (fields?.length) params.set('fields', fields.join(','))
  if (minPopulation !== undefined) params.set('population', String(minPopulation))
  return exercisePath(exercise) + '&' + params
}
/** The same catalogue and generator pools power the globe, country pages and setup links. */
export function countryExercises(
  ctx: GeneratorContext,
  recall?: RecallIndex,
  ready: (exercise: Exercise) => boolean = () => true,
): CountryExercise[] {
  const country = ctx.byId.get(ctx.scope) as Country | undefined
  if (!ctx.scope.startsWith('country:') || country?.type !== 'country') return []
  const result: CountryExercise[] = []
  for (const exercise of countryExerciseCandidates(ctx.scope)) {
    if (!ready(exercise)) continue
    if (exercise.kind === 'city-recall') {
      const populations = recall?.countries[ctx.scope]?.populations ?? []
      const minPopulation = populations.some((p) => p > CITY_RECALL_DEFAULT)
        ? CITY_RECALL_DEFAULT
        : CITY_RECALL_MINIMUM
      const count = populations.filter((p) => p > minPopulation).length
      if (count)
        result.push({
          exercise,
          mode: 'input',
          count,
          minPopulation,
          href: countryExerciseHref(exercise, ctx.scope, 'input', undefined, minPopulation),
        })
      continue
    }
    const fields = exercise.kind === 'profile' ? countryProfileSelection(country, ctx) : undefined
    if (fields && !fields.length) continue
    for (const mode of Object.keys(exercise.variants) as ModeForm[]) {
      if (!exerciseScopeAllowed(exercise, ctx.scope, mode)) continue
      const pool = poolFor(ctx, { category: exercise.topic, exercise: exercise.id, mode, fields })
      const minimum = exercise.kind === 'profile' || mode !== 'choice' ? 1 : (exercise.minPool ?? 4)
      if (pool.size < minimum) continue
      const rng = createRng(`country-menu:${ctx.scope}:${exercise.id}:${mode}`)
      const playable = [...pool.values()]
        .slice(0, 12)
        .some((item) => item.generators.some((generator) => generator.make(item.entity, ctx, rng, 2)))
      if (!playable) continue
      result.push({
        exercise,
        mode,
        count: pool.size,
        fields,
        href: countryExerciseHref(exercise, ctx.scope, mode, fields),
      })
      break
    }
  }
  return result.sort((a, b) => Number(b.exercise.kind === 'profile') - Number(a.exercise.kind === 'profile'))
}
