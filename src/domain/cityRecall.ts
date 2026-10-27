export const CITY_RECALL_MINIMUM = 15_000
export const CITY_RECALL_DEFAULT = 300_000
export interface RecallCity {
  id: string
  name: string
  aliases: string[]
  lat: number
  lon: number
  population: number
  geonameId: string
}
export interface RecallCountry {
  country: string
  cities: RecallCity[]
}
export interface RecallIndex {
  minimumPopulation: number
  snapshotDate: string
  source: string
  license: string
  countries: Record<string, { file: string; populations: number[]; hasOutline: boolean }>
}
export function validCityMinimum(value: number) {
  return Number.isSafeInteger(value) && value >= CITY_RECALL_MINIMUM && value <= 1_000_000_000
}
export function cityMinimum(value?: number) {
  return value !== undefined && validCityMinimum(value) ? value : CITY_RECALL_DEFAULT
}
