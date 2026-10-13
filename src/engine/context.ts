import type { Entity, Relationship } from '@/domain/types'
import type { GeneratorContext } from './types'
import { inScope } from './scope'
import { capitalIds } from '@/domain/capitals'

export function buildContext(input: {
  countries: Entity[]
  cities: Entity[]
  landmarks: Entity[]
  regions: Entity[]
  plates?: Entity[]
  rivers?: Entity[]
  lakes?: Entity[]
  mountains?: Entity[]
  scriptWords?: Entity[]
  trivia?: Entity[]
  relationships: Relationship[]
  scope: string
}): GeneratorContext {
  const byId = new Map<string, Entity>()
  for (const list of [
    input.countries,
    input.cities,
    input.landmarks,
    input.regions,
    input.plates ?? [],
    input.rivers ?? [],
    input.lakes ?? [],
    input.mountains ?? [],
    input.scriptWords ?? [],
    input.trivia ?? [],
  ])
    for (const e of list) byId.set(e.id, e)
  const capitalOf = new Map<string, string>()
  const capitalCity = new Map<string, string>()
  const capitalCities = new Map<string, string[]>()
  const locatedIn = new Map<string, string[]>()
  const neighbors = new Map<string, string[]>()
  for (const r of input.relationships) {
    if (r.type === 'capital_of') {
      capitalOf.set(r.from, r.to)
      if (!capitalCity.has(r.to)) capitalCity.set(r.to, r.from)
      capitalCities.set(r.to, [...new Set([...(capitalCities.get(r.to) ?? []), r.from])])
    } else if (r.type === 'located_in') {
      locatedIn.set(r.from, [...(locatedIn.get(r.from) ?? []), r.to])
    } else if (r.type === 'neighbor_of') {
      neighbors.set(r.from, [...(neighbors.get(r.from) ?? []), r.to])
    }
  }
  // Country data defines the primary capital and excludes former capitals / mere seats.
  for (const country of input.countries) {
    const ids = capitalIds(country).filter((id) => byId.has(id))
    capitalCities.set(country.id, ids)
    if (ids[0]) capitalCity.set(country.id, ids[0])
    else capitalCity.delete(country.id)
  }
  const filter = (list: Entity[]) => list.filter((e) => inScope(e, input.scope, byId))
  return {
    countries: filter(input.countries),
    cities: filter(input.cities),
    landmarks: filter(input.landmarks),
    regions: filter(input.regions),
    plates: filter(input.plates ?? []),
    rivers: filter(input.rivers ?? []),
    lakes: filter(input.lakes ?? []),
    mountains: filter(input.mountains ?? []),
    scriptWords: filter(input.scriptWords ?? []),
    trivia: filter(input.trivia ?? []),
    byId,
    rel: { capitalOf, capitalCity, capitalCities, locatedIn, neighbors },
    scope: input.scope,
  }
}
