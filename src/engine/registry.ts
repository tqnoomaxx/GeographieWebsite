import type { Generator } from './generators/base'
import * as flags from './generators/flags'
import * as capitals from './generators/capitals'
import * as countries from './generators/countries'
import * as rc from './generators/regionsCities'
import * as im from './generators/imagesMaps'
import * as pl from './generators/plates'
import * as na from './generators/nature'
import type { CategoryId } from './types'
import { AUTO, MIXED_EXCLUDE, PLAY_QUIZZES, autoModes, quizFor, type QuizMode } from '@/config/quizzes'

const all: Generator[] = [
  flags.flagToCountry, flags.countryToFlag, flags.flagToCountryInput, flags.flagToRegion, flags.regionToFlag, flags.regionFlagInput, flags.flagToRegionMap, flags.flagToCountryMap, flags.regionFlagToCountry, flags.flagToEuropeMap,
  capitals.countryToCapital, capitals.capitalToCountry, capitals.capitalToFlag, capitals.capitalInput,
  countries.countryAttribute, countries.neighborOfCountry, countries.countryTrueFalse, countries.countryCode, countries.countryComparison,
  rc.regionFlagToRegion, rc.regionToCountry, rc.regionCapital, rc.cityToCountry, rc.cityToRegion, rc.cityPopulation, rc.cityInput,
  im.imageToLandmark, im.imageToCountry, im.imageToCity, im.landmarkToCountry, im.landmarkToCity, im.countryOnMap, im.regionOnMap,
  pl.plateToCity, pl.cityToPlate, pl.plateInput,
  na.riverToCountry, na.lakeToCountry, na.mountainToCountry, na.riverLonger, na.lakeLarger, na.mountainHigher, na.waterOnMap, na.mountainOnMap,
]

export const registry = new Map<string, Generator>(all.map((g) => [g.id, g]))

export function register(g: Generator) {
  registry.set(g.id, g)
}

function fromModes(modes: QuizMode[]): Generator[] {
  const ids = [...new Set(modes.flatMap((m) => m.generators))]
  return ids.map((id) => {
    const g = registry.get(id)
    if (!g) throw new Error(`Generator ${id} ist in config/quizzes.ts eingetragen, aber nicht registriert`)
    return g
  })
}

/**
 * Generatoren für Kategorie + Fragetyp gemäß config/quizzes.ts.
 * 'auto' mischt die Multiple-Choice-Fragetypen (R10); „Gemischt“ nimmt die von allen Kategorien.
 */
export function generatorsFor(category: CategoryId, mode: string = AUTO): Generator[] {
  if (category === 'mixed') return fromModes(PLAY_QUIZZES.flatMap(autoModes)).filter((g) => !MIXED_EXCLUDE.has(g.id))
  const quiz = quizFor(category)
  if (mode === AUTO) return fromModes(autoModes(quiz))
  const m = quiz.modes.find((x) => x.id === mode)
  return m ? fromModes([m]) : []
}
