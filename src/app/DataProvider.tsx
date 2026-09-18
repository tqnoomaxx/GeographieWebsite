import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Country, DataIndex, Entity, Relationship } from '@/domain/types'
import { loadAllRegions, loadCities, loadCountries, loadIndex, loadLandmarks, loadRelationships } from '@/services/data/dataService'
import { buildContext } from '@/engine/context'
import type { GeneratorContext } from '@/engine/types'

interface GeoData {
  ready: boolean
  error?: Error
  index?: DataIndex
  countries: Country[]
  cities: Entity[]
  landmarks: Entity[]
  regions: Entity[]
  relationships: Relationship[]
  byId: Map<string, Entity>
  regionsLoaded: boolean
  ensureRegions: () => Promise<Entity[]>
  contextFor: (scope: string) => GeneratorContext
  retry: () => void
}

const Ctx = createContext<GeoData | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Pick<GeoData, 'index' | 'countries' | 'cities' | 'landmarks' | 'relationships'> & { ready: boolean; error?: Error }>({
    ready: false,
    countries: [],
    cities: [],
    landmarks: [],
    relationships: [],
  })
  const [regions, setRegions] = useState<Entity[]>([])
  const [regionsLoaded, setRegionsLoaded] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([loadIndex(), loadCountries(), loadCities(), loadLandmarks(), loadRelationships()])
      .then(([index, countries, cities, landmarks, relationships]) => {
        if (!cancelled) setState({ ready: true, index, countries, cities, landmarks, relationships })
      })
      .catch((error: Error) => !cancelled && setState((s) => ({ ...s, error })))
    return () => {
      cancelled = true
    }
  }, [attempt])

  const byId = useMemo(() => {
    const m = new Map<string, Entity>()
    for (const list of [state.countries, state.cities, state.landmarks, regions]) for (const e of list) m.set(e.id, e)
    return m
  }, [state.countries, state.cities, state.landmarks, regions])

  const value = useMemo<GeoData>(
    () => ({
      ...state,
      regions,
      regionsLoaded,
      byId,
      ensureRegions: async () => {
        if (regionsLoaded) return regions
        const list = await loadAllRegions()
        setRegions(list)
        setRegionsLoaded(true)
        return list
      },
      contextFor: (scope) =>
        buildContext({ countries: state.countries, cities: state.cities, landmarks: state.landmarks, regions, relationships: state.relationships, scope }),
      retry: () => setAttempt((a) => a + 1),
    }),
    [state, regions, regionsLoaded, byId],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGeoData() {
  const v = useContext(Ctx)
  if (!v) throw new Error('DataProvider fehlt')
  return v
}
