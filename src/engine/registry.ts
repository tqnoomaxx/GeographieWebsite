import type { Generator } from './generators/base'
import * as flags from './generators/flags'
import * as capitals from './generators/capitals'
import * as countries from './generators/countries'
import * as rc from './generators/regionsCities'
import * as im from './generators/imagesMaps'
import * as pl from './generators/plates'
import * as na from './generators/nature'
import type { CategoryId } from './types'

const all: Generator[] = [
  flags.flagToCountry, flags.countryToFlag, flags.flagToCountryInput, flags.flagToRegion, flags.regionToFlag, flags.flagToRegionMap, flags.flagToCountryMap, flags.regionFlagToCountry, flags.flagToEuropeMap,
  capitals.countryToCapital, capitals.capitalToCountry, capitals.capitalInput,
  countries.countryAttribute, countries.neighborOfCountry, countries.countryTrueFalse,
  rc.regionFlagToRegion, rc.regionToCountry, rc.regionCapital, rc.cityToCountry, rc.cityToRegion, rc.cityInput,
  im.imageToLandmark, im.imageToCountry, im.imageToCity, im.landmarkToCountry, im.landmarkToCity, im.countryOnMap, im.regionOnMap,
  pl.plateToCity, pl.cityToPlate, pl.plateInput,
  na.riverToCountry, na.lakeToCountry, na.mountainToCountry, na.riverLonger, na.lakeLarger, na.mountainHigher, na.waterOnMap, na.mountainOnMap,
]

export const registry = new Map<string, Generator>(all.map((g) => [g.id, g]))

export function register(g: Generator) {
  registry.set(g.id, g)
}

export function generatorsFor(category: CategoryId): Generator[] {
  if (category === 'mixed') return [...registry.values()].filter((g) => !['flag_to_country_input', 'capital_input', 'city_input', 'plate_input', 'flag_to_region_map', 'region_to_flag', 'flag_to_europe_map'].includes(g.id))
  return [...registry.values()].filter((g) => g.category === category)
}
