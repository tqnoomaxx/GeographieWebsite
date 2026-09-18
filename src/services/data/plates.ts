import type { Entity } from '@/domain/types'
import { dataUrl } from './dataService'

const cache = new Map<string, Promise<Entity[]>>()
/** Kennzeichen pro Land (data/entities/license-plates/<CC>.json). Fehlende Datei = leere Liste. */
export function loadPlates(iso2: string): Promise<Entity[]> {
  if (!cache.has(iso2)) {
    cache.set(
      iso2,
      fetch(dataUrl(`entities/license-plates/${iso2}.json`)).then((r) => (r.ok ? (r.json() as Promise<Entity[]>) : [])),
    )
  }
  return cache.get(iso2)!
}
