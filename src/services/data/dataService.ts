import type { Country, DataIndex, Entity, Relationship, TriviaQuestion } from '@/domain/types'

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

export function fetchJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(dataUrl(path))
        .then((r) => {
          if (!r.ok) throw new Error(`Daten nicht ladbar: ${path} (${r.status})`)
          return r.json()
        })
        .catch((error: unknown) => {
          cache.delete(path)
          throw error
        }),
    )
  }
  return cache.get(path) as Promise<T>
}

export const loadIndex = () => fetchJson<DataIndex>('index.json')
export const loadCountries = () => fetchJson<Country[]>('entities/countries.json')
export const loadCities = () => fetchJson<Entity[]>('entities/cities.json')
export const loadLandmarks = () => fetchJson<Entity[]>('entities/landmarks.json')
export const loadRivers = () => fetchJson<Entity[]>('entities/rivers.json')
export const loadLakes = () => fetchJson<Entity[]>('entities/lakes.json')
export const loadMountains = () => fetchJson<Entity[]>('entities/mountains.json')
export const loadScriptWords = () => fetchJson<Entity[]>('entities/script-words.json')
export const loadLanguageSamples = () => fetchJson<Entity[]>('entities/language-samples.json')
export const loadTrivia = () => fetchJson<TriviaQuestion[]>('entities/trivia.json')
export const loadRelationships = () => fetchJson<Relationship[]>('relationships/index.json')
export const loadWorld = () => fetchJson<GeoJSON.FeatureCollection>('geo/world.json')
export const loadOutline = (iso2: string) => fetchJson<GeoJSON.Geometry>(`geo/outlines/${iso2}.json`)
export const loadSearch = () =>
  fetchJson<Array<{ id: string; t: string; n: string; a: string[]; c?: string }>>('search.json')
export const loadContinents = () =>
  fetchJson<Record<string, { de: string; en: string }>>('meta/continents.json')
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
export async function loadRegionMap(iso2: string, targetId?: string): Promise<RegionMap | null> {
  const index = await loadIndex()
  const file =
    iso2 === 'europe'
      ? 'media/maps/regions/europe.json'
      : (targetId && index.region_map_targets?.[targetId]) || index.region_maps?.[iso2]
  if (!file) return null
  if (!mapCache.has(file)) {
    mapCache.set(
      file,
      (async () => {
        const r = await fetch(mediaUrl(file))
        if (!r.ok || !r.headers.get('content-type')?.includes('json'))
          throw new Error('Karte konnte nicht geladen werden.')
        return (await r.json()) as RegionMap
      })().catch((error: unknown) => {
        mapCache.delete(file)
        throw error
      }),
    )
  }
  return mapCache.get(file)!
}

/** Lädt eine Entity anhand ihrer ID, egal aus welcher Datei sie stammt. */
export async function loadEntity(id: string): Promise<Entity | undefined> {
  const [type, rest] = id.split(':')
  switch (type) {
    case 'trivia':
      return (await loadTrivia()).find((question) => question.id === id)
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
    case 'script_word':
      return (await loadScriptWords()).find((c) => c.id === id)
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
    case 'trivia':
      return loadTrivia()
    case 'country':
      return loadCountries()
    case 'city':
      return loadCities()
    case 'landmark':
      return loadLandmarks()
    case 'region':
      return loadAllRegions()
    case 'script_word':
      return loadScriptWords()
    default:
      return []
  }
}
