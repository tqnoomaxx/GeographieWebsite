import { capitalIds } from '@/domain/capitals'
import { populationComparisonDetails } from '@/domain/population'
import type { GeneratorContext, Question } from './types'
import { createRng } from './rng'
import { poolFor, type QuizSession } from './session'

const UPDATED_GENERATORS = new Set([
  'country_attribute',
  'country_code',
  'river_to_country',
  'lake_to_country',
  'mountain_to_country',
  'water_on_map',
  'mountain_on_map',
  'plate_to_city',
  'plate_input',
  'plate_to_region',
  'city_to_plate',
  'city_to_plate_input',
  'region_on_map',
  'flag_to_region_map',
  'geography_trivia',
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
  'cyrillic_to_latin',
  'greek_to_latin',
  'script_to_latin_input',
  'latin_to_script',
])

const populationQuestion = (question: Question) =>
  question.type === 'country_population_compare' ||
  (question.type === 'country_true_false' && question.prompt.key === 'q.population_compare')
const needsRefresh = (question: Question) =>
  populationQuestion(question) || UPDATED_GENERATORS.has(question.metadata.generator)

/** Refresh pending facts and photos in saved rounds; played answers retain their history. */
export function refreshCountryFacts(session: QuizSession, ctx: GeneratorContext): QuizSession {
  if (
    session.completedAt ||
    !session.questions.some((item) => item.given === undefined && needsRefresh(item.question))
  )
    return session
  const pool = poolFor(ctx, session.setup)
  const questions = session.questions.map((item, index) => {
    if (item.given !== undefined || !needsRefresh(item.question)) return item
    if (populationQuestion(item.question)) {
      const [a, b] = item.question.entities.map((id) => ctx.byId.get(id))
      if (!a?.attributes.population || !b?.attributes.population) return item
      const larger = a.attributes.population > b.attributes.population
      return {
        ...item,
        question: {
          ...item.question,
          answer: item.question.question_type === 'true_false' ? String(larger) : larger ? a.id : b.id,
          ...populationComparisonDetails(a, b),
        },
      }
    }
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
