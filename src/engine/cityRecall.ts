import type { Entity } from '@/domain/types'
import type { RecallCountry } from '@/domain/cityRecall'
import type { GeneratorContext } from './types'
import type { QuizSession } from './session'
import { recordAnswer } from './session'
import { matchesExactly } from './normalize'
export function withRecallCities(ctx: GeneratorContext, data?: RecallCountry): GeneratorContext {
  if (!data) return ctx
  const continent = ctx.byId.get(data.country)?.attributes.continent
  const cities: Entity[] = data.cities.map((city) => ({
    id: city.id,
    type: 'city',
    names: { de: city.name },
    aliases: city.aliases,
    location: { lat: city.lat, lon: city.lon },
    attributes: {
      country: city.country ?? data.country,
      continent: city.country ? ctx.byId.get(city.country)?.attributes.continent : continent,
      population: city.population,
      geonames_population: city.population,
      geonames: city.geonameId,
    },
    provenance: {
      source: 'GeoNames',
      source_id: city.geonameId,
      source_url: 'https://www.geonames.org/' + city.geonameId + '/',
      license: 'CC BY 4.0',
      imported_at: '',
    },
  }))
  const byId = new Map(ctx.byId)
  for (const city of cities) byId.set(city.id, city)
  return { ...ctx, cities, byId }
}
export function recallCitiesFromSession(session: QuizSession): RecallCountry {
  return {
    country: session.scope,
    cities: session.questions.flatMap(({ question: q }) =>
      q.place
        ? [
            {
              id: q.entities[0],
              name: q.place.name,
              aliases: q.accepted ?? [],
              lat: q.place.lat,
              lon: q.place.lon,
              population: q.place.population,
              geonameId: q.place.geonameId,
            },
          ]
        : [],
    ),
  }
}
export function cityRecallHits(session: QuizSession, input: string) {
  const primary = session.questions.filter(
    (item) => item.question.place && matchesExactly(input, [item.question.place.name]),
  )
  const matches = primary.length
    ? primary
    : session.questions.filter((item) => matchesExactly(input, item.question.accepted ?? []))
  return matches.filter((item) => item.given === undefined)
}
export function acceptCityRecall(session: QuizSession, input: string): QuizSession {
  if (session.completedAt || session.cityRecallRevealed) return session
  const hits = cityRecallHits(session, input)
  if (!hits.length) return session
  let next = session
  for (const item of hits) {
    const position = next.questions.findIndex((q) => q.question.id === item.question.id)
    next = recordAnswer({ ...next, position }, input)
  }
  const position = next.questions.findIndex((q) => q.given === undefined)
  return { ...next, position: position < 0 ? Math.max(0, next.questions.length - 1) : position }
}
export function finishCityRecall(session: QuizSession): QuizSession {
  const now = new Date().toISOString()
  return {
    ...session,
    cityRecallRevealed: true,
    questions: session.questions.map((item) =>
      item.given !== undefined
        ? item
        : { ...item, given: '__skip__', correct: false, answeredAt: now, attempts: 1 },
    ),
  }
}
