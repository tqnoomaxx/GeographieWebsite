import type { RecallCountry, RecallIndex } from '@/domain/cityRecall'
import { fetchJson } from './dataService'
export const loadRecallIndex = () => fetchJson<RecallIndex>('city-recall/index.json')
export async function loadRecallCountry(country: string): Promise<RecallCountry> {
  if (!/^country:[A-Z]{2}$/.test(country)) throw new Error('Bitte ein Land auswählen.')
  const index = await loadRecallIndex()
  const entry = index.countries[country]
  if (!entry) throw new Error('Für dieses Land sind keine Städte über 15.000 Einwohnern erfasst.')
  return fetchJson<RecallCountry>(entry.file)
}

export async function loadRecallWorld(minimum: number): Promise<RecallCountry> {
  const index = await loadRecallIndex()
  const entries = Object.entries(index.countries).filter(([, entry]) =>
    entry.populations.some((population) => population > minimum),
  )
  const cities: RecallCountry['cities'] = []
  // Bound simultaneous requests; the complete source spans over 200 countries.
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(8, entries.length) }, async () => {
      while (next < entries.length) {
        const [country, entry] = entries[next++]
        const data = await fetchJson<RecallCountry>(entry.file)
        cities.push(
          ...data.cities.filter((city) => city.population > minimum).map((city) => ({ ...city, country })),
        )
      }
    }),
  )
  return { country: 'world', cities: cities.sort((a, b) => a.id.localeCompare(b.id)) }
}
