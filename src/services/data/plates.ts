import type { Entity } from '@/domain/types'
import { fetchJson, loadIndex } from './dataService'

/** Nur im Index vorhandene Pakete abrufen; Netzwerkfehler bleiben erneut abrufbar. */
export async function loadPlates(iso2: string): Promise<Entity[]> {
  const index = await loadIndex()
  const entry = index.plates?.[iso2]
  return entry ? fetchJson<Entity[]>(entry.file) : []
}
