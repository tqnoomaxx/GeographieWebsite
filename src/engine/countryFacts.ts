import { capitalIds } from '@/domain/capitals'
import type { GeneratorContext } from './types'
import { createRng } from './rng'
import { poolFor, type QuizSession } from './session'

const UPDATED_GENERATORS = new Set([
  'country_to_capital',
  'capital_to_country',
  'capital_to_flag',
  'capital_input',
  'city_input',
  'national_animal',
  'national_flower',
  'national_bird',
  'national_tree',
  'image_to_landmark',
  'image_to_landmark_input',
  'image_to_country',
  'landmark_to_country',
  'landmark_to_country_input',
  'landmark_to_city',
])

/** Refresh pending facts and photos in saved rounds; played answers retain their history. */
export function refreshCountryFacts(session: QuizSession, ctx: GeneratorContext): QuizSession {
  if (
    session.completedAt ||
    !session.questions.some(
      (item) => item.given === undefined && UPDATED_GENERATORS.has(item.question.metadata.generator),
    )
  )
    return session
  const pool = poolFor(ctx, session.setup)
  const questions = session.questions.map((item, index) => {
    if (item.given !== undefined || !UPDATED_GENERATORS.has(item.question.metadata.generator)) return item
    let targetId = item.question.entities[0]
    if (item.question.metadata.generator === 'city_input' && !pool.has(targetId)) {
      const countryId = ctx.byId.get(targetId)?.attributes.country
      const country = countryId ? ctx.byId.get(countryId) : undefined
      if (country) targetId = capitalIds(country)[0]
    }
    const rng = createRng(`${session.seed}:country-facts:${index}`)
    const target = pool.get(targetId) ?? rng.pick([...pool.values()])
    if (!target) return item
    const preferred = target.generators.find((generator) => generator.id === item.question.metadata.generator)
    const generators = preferred
      ? [preferred, ...target.generators.filter((generator) => generator !== preferred)]
      : target.generators
    for (const generator of generators) {
      const question = generator.make(target.entity, ctx, rng, item.question.difficulty)
      if (question) return { ...item, question }
    }
    return item
  })
  return { ...session, questions, remaining: session.remaining?.filter((id) => pool.has(id)) }
}
