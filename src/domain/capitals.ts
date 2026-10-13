import type { Entity, Country } from './types'

/** Canonical current capitals; explicit empty lists distinguish countries with no official capital. */
export function capitalIds(country: Entity): string[] {
  const attributes = (country as Country).attributes
  return attributes.capitals ?? (attributes.capital ? [attributes.capital] : [])
}

export function countryCapitals(country: Entity, byId: Map<string, Entity>): Entity[] {
  return capitalIds(country)
    .map((id) => byId.get(id))
    .filter((city): city is Entity => !!city)
}

export function capitalAnswers(country: Entity, byId: Map<string, Entity>): string[] {
  return [
    ...new Set(
      countryCapitals(country, byId)
        .flatMap((city) => [city.names.de, city.names.en, ...(city.aliases ?? [])])
        .filter((name): name is string => !!name),
    ),
  ]
}

export const CAPITAL_ROLE_LABELS = {
  capital: 'Hauptstadt',
  constitutional: 'Verfassungsmäßige Hauptstadt',
  executive: 'Verwaltungshauptstadt',
  legislative: 'Parlamentshauptstadt',
  judicial: 'Justizhauptstadt',
  administrative: 'Verwaltungshauptstadt',
  royal_legislative: 'Königs- und Parlamentshauptstadt',
  federal_city: 'Bundesstadt',
  government_seat: 'Regierungssitz',
  temporary_seat: 'Vorläufiger Regierungssitz',
  commercial: 'Handelsmetropole',
  former: 'Frühere Hauptstadt',
  claimed: 'Beanspruchte Hauptstadt',
  rotating_seat: 'Wechselnder Regierungssitz',
} as const

export function capitalFacts(country: Entity, byId: Map<string, Entity>): string[] {
  const attributes = (country as Country).attributes
  return countryCapitals(country, byId).map((city) => {
    const role = attributes.capital_details?.find((place) => place.city === city.id)?.role
    return `${city.names.de}${role ? ` (${CAPITAL_ROLE_LABELS[role]})` : ''}`
  })
}
