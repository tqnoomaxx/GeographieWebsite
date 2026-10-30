import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Country, DataIndex, Entity, Relationship } from '@/domain/types'
import {
  loadAllRegions,
  loadCities,
  loadCountries,
  loadIndex,
  loadLakes,
  loadLandmarks,
  loadMountains,
  loadRelationships,
  loadRivers,
  loadScriptWords,
  loadLanguageSamples,
  loadTrivia,
} from '@/services/data/dataService'
import { buildContext } from '@/engine/context'
import { loadPlates } from '@/services/data/plates'

const loaders = {
  index: loadIndex,
  countries: loadCountries,
  cities: loadCities,
  landmarks: loadLandmarks,
  rivers: loadRivers,
  lakes: loadLakes,
  mountains: loadMountains,
  scriptWords: loadScriptWords,
  languageSamples: loadLanguageSamples,
  trivia: loadTrivia,
  relationships: loadRelationships,
  regions: loadAllRegions,
  plates: async () => {
    const index = await loadIndex()
    return (await Promise.all(Object.keys(index.plates ?? {}).map(loadPlates))).flat()
  },
}
export type DataResource = keyof typeof loaders
export type ResourceState = { status: 'idle' | 'loading' | 'ready' | 'error'; error?: Error }
type Data = { index?: DataIndex; countries: Country[]; relationships: Relationship[] } & Record<
  Exclude<DataResource, 'index' | 'countries' | 'relationships'>,
  Entity[]
>
const initialData: Data = {
  countries: [],
  cities: [],
  landmarks: [],
  rivers: [],
  lakes: [],
  mountains: [],
  scriptWords: [],
  languageSamples: [],
  trivia: [],
  relationships: [],
  regions: [],
  plates: [],
}
const CORE: DataResource[] = ['index', 'countries']

function useProvider() {
  const [data, setData] = useState<Data>(initialData)
  const [states, setStates] = useState<Partial<Record<DataResource, ResourceState>>>({})
  const requests = useRef(new Map<DataResource, Promise<unknown>>())
  const ensureResource = useCallback((key: DataResource) => {
    const existing = requests.current.get(key)
    if (existing) return existing
    setStates((s) => ({ ...s, [key]: { status: 'loading' } }))
    const request = loaders[key]()
      .then((value) => {
        setData((s) => ({ ...s, [key]: value }))
        setStates((s) => ({ ...s, [key]: { status: 'ready' } }))
        return value
      })
      .catch((cause: unknown) => {
        requests.current.delete(key)
        const error = cause instanceof Error ? cause : new Error(String(cause))
        setStates((s) => ({ ...s, [key]: { status: 'error', error } }))
        throw error
      })
    requests.current.set(key, request)
    return request
  }, [])
  const ensureResources = useCallback(
    (keys: DataResource[]) => Promise.all(keys.map(ensureResource)),
    [ensureResource],
  )
  useEffect(() => {
    void ensureResources(CORE).catch(() => {})
  }, [ensureResources])
  const byId = useMemo(() => {
    const map = new Map<string, Entity>()
    for (const [key, list] of Object.entries(data)) {
      if (key !== 'index' && key !== 'relationships')
        for (const entity of list as Entity[]) map.set(entity.id, entity)
    }
    return map
  }, [data])
  return useMemo(
    () => ({
      ...data,
      states,
      byId,
      ensureResources,
      ready: CORE.every((key) => states[key]?.status === 'ready'),
      error: CORE.map((key) => states[key]?.error).find(Boolean),
      regionsLoaded: states.regions?.status === 'ready',
      platesLoaded: states.plates?.status === 'ready',
      ensureRegions: () => ensureResource('regions') as Promise<Entity[]>,
      ensurePlates: () => ensureResource('plates') as Promise<Entity[]>,
      contextFor: (scope: string) => buildContext({ ...data, scope }),
      retry: () => {
        void ensureResources(CORE).catch(() => {})
      },
    }),
    [data, states, byId, ensureResource, ensureResources],
  )
}
const Ctx = createContext<ReturnType<typeof useProvider> | null>(null)
export function DataProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useProvider()}>{children}</Ctx.Provider>
}
export function useGeoData() {
  const value = useContext(Ctx)
  if (!value) throw new Error('DataProvider fehlt')
  return value
}

/** Jeder Bildschirm wartet nur auf seine Pakete; ein neuer Seitenaufruf versucht fehlgeschlagene Pakete erneut. */
export function useDataResources(resources: DataResource[], scope = '') {
  const { states, ensureResources } = useGeoData()
  const key = [...new Set(resources)].sort().join(',')
  const entry = `${scope}:${key}`
  const started = useRef('')
  useEffect(() => {
    started.current = entry
    const keys = key.split(',').filter(Boolean) as DataResource[]
    void ensureResources(keys).catch(() => {})
  }, [key, entry, ensureResources])
  const error = started.current === entry ? resources.map((resource) => states[resource]?.error).find(Boolean) : undefined
  return {
    loading: resources.some((resource) => states[resource]?.status !== 'ready'),
    error,
    retry: () => {
      void ensureResources(resources).catch(() => {})
    },
  }
}
