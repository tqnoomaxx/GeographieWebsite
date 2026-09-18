import type { Country, DataIndex, Entity, Relationship } from '@/domain/types'

/**
 * Zentraler Zugriff auf die statischen Geodaten. Lädt lazy und cached im Speicher.
 * Die UI und die Engine benutzen ausschließlich diesen Service.
 */
const base = import.meta.env.BASE_URL.replace(/\/?$/, '/')
const cache = new Map<string, Promise<unknown>>()

export function dataUrl(path: string) {
  return `${base}data/${path}`
}
export function mediaUrl(path: string) {
  return `${base}${path}`
}

function fetchJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(dataUrl(path)).then((r) => {
        if (!r.ok) throw new Error(`Daten nicht ladbar: ${path} (${r.status})`)
        return r.json()
      }),
    )
  }
  return cache.get(path) as Promise<T>
}

export const loadIndex = () => fetchJson<DataIndex>('index.json')
export const loadCountries = () => fetchJson<Country[]>('entities/countries.json')
export const loadCities = () => fetchJson<Entity[]>('entities/cities.json')
export const loadLandmarks = () => fetchJson<Entity[]>('entities/landmarks.json')
export const loadRivers = () => fetchJson<Entity[]>('entities/rivers.json').catch(() => [] as Entity[])
export const loadLakes = () => fetchJson<Entity[]>('entities/lakes.json').catch(() => [] as Entity[])
export const loadMountains = () => fetchJson<Entity[]>('entities/mountains.json').catch(() => [] as Entity[])
export const loadRelationships = () => fetchJson<Relationship[]>('relationships/index.json')
export const loadWorld = () => fetchJson<GeoJSON.FeatureCollection>('geo/world.json')
export const loadOutline = (iso2: string) => fetchJson<GeoJSON.Geometry>(`geo/outlines/${iso2}.json`)
export const loadSearch = () => fetchJson<Array<{ id: string; t: string; n: string; a: string[]; c?: string }>>('search.json')
export const loadContinents = () => fetchJson<Record<string, { de: string; en: string }>>('meta/continents.json')
export const loadVersion = () => fetchJson<{ schema_version: number; data_version: string }>('version.json')
export const loadAttribution = () => fetchJson<{ markdown: string }>('attribution.json')

export async function loadRegions(countryId: string): Promise<Entity[]> {
  const index = await loadIndex()
  const entry = index.regions[countryId]
  if (!entry) return []
  return fetchJson<Entity[]>(entry.file)
}

export async function loadAllRegions(): Promise<Entity[]> {
  const index = await loadIndex()
  const lists = await Promise.all(Object.values(index.regions).map((r) => fetchJson<Entity[]>(r.file)))
  return lists.flat()
}

export interface RegionMap {
  label: string
  viewBox: string
  shapes: Array<{ flagId: string; name: string; parent?: string; bounds: number[]; d: string }>
}
const mapCache = new Map<string, Promise<RegionMap | null>>()
export async function loadRegionMap(iso2: string): Promise<RegionMap | null> {
  if (!mapCache.has(iso2)) {
    mapCache.set(
      iso2,
      (async () => {
        const index = await loadIndex()
        const file = iso2 === 'europe' ? 'media/maps/regions/europe.json' : index.region_maps?.[iso2]
        if (!file) return null
        const r = await fetch(mediaUrl(file))
        if (!r.ok || !r.headers.get('content-type')?.includes('json')) return null
        return (await r.json()) as RegionMap
      })(),
    )
  }
  return mapCache.get(iso2)!
}

/** Lädt eine Entity anhand ihrer ID, egal aus welcher Datei sie stammt. */
export async function loadEntity(id: string): Promise<Entity | undefined> {
  const [type, rest] = id.split(':')
  switch (type) {
    case 'country':
      return (await loadCountries()).find((c) => c.id === id)
    case 'city':
      return (await loadCities()).find((c) => c.id === id)
    case 'landmark':
      return (await loadLandmarks()).find((c) => c.id === id)
    case 'river':
      return (await loadRivers()).find((c) => c.id === id)
    case 'lake':
      return (await loadLakes()).find((c) => c.id === id)
    case 'mountain':
      return (await loadMountains()).find((c) => c.id === id)
    case 'region': {
      const iso2 = rest.split('-')[0]
      return (await loadRegions(`country:${iso2}`)).find((r) => r.id === id)
    }
    case 'license_plate': {
      const iso2 = rest.split('-')[0]
      const { loadPlates } = await import('./plates')
      return (await loadPlates(iso2)).find((p) => p.id === id)
    }
    default:
      return undefined
  }
}

export async function loadEntitiesByType(type: Entity['type']): Promise<Entity[]> {
  switch (type) {
    case 'country':
      return loadCountries()
    case 'city':
      return loadCities()
    case 'landmark':
      return loadLandmarks()
    case 'region':
      return loadAllRegions()
    default:
      return []
  }
}
