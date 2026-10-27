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
