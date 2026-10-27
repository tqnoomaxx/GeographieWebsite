import { memo, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { RecallCity } from '@/domain/cityRecall'
import { useAsync } from '@/app/hooks'
import { loadRecallIndex } from '@/services/data/cityRecall'
import { loadOutline, loadWorld } from '@/services/data/dataService'
import { MapViewport } from '@/ui/maps'
import { ErrorState, LoadingState } from '@/ui'
import { cityRecallGeometry } from './cityRecallGeometry'
async function loadMap(iso: string) {
  const index = await loadRecallIndex()
  if (index.countries['country:' + iso]?.hasOutline)
    return { outline: await loadOutline(iso), world: undefined }
  return { outline: undefined, world: await loadWorld() }
}
export const CityRecallMap = memo(function CityRecallMap({
  iso,
  center,
  cities,
  found,
  revealed,
  selected,
  onSelect,
}: {
  iso: string
  center: [number, number]
  cities: RecallCity[]
  found: string[]
  revealed: boolean
  selected?: string
  onSelect: (id: string) => void
}) {
  const map = useAsync(() => loadMap(iso), [iso])
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(900)
  const clip = useId().replace(/:/g, '')
  const gestureMoved = useRef<() => boolean>(() => false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const height = width < 600 ? 340 : 520
  const geo = useMemo(
    () => (map.data ? cityRecallGeometry(map.data.outline, cities, iso, center, width, height) : undefined),
    [map.data, cities, iso, center, width, height],
  )
  const foundSet = useMemo(() => new Set(found), [found])
  const drawing = useMemo(() => {
    if (!geo) return null
    const visible = cities.filter((c) => foundSet.has(c.id) || revealed)
    return (
      <g clipPath={'url(#' + clip + ')'}>
        <defs>
          <clipPath id={clip}>
            <rect width={width} height={height} />
          </clipPath>
        </defs>
        <rect width={width} height={height} className="recall-map-water" />
        {geo.geometry ? (
          <path d={geo.path(geo.geometry) ?? undefined} className="recall-map-land" />
        ) : (
          map.data?.world?.features.map((f, i) => (
            <path key={i} d={geo.path(f) ?? undefined} className="recall-map-land" />
          ))
        )}
        {visible.map((city) => {
          const point = geo.projection([city.lon, city.lat])
          if (!point) return null
          const solved = foundSet.has(city.id)
          return (
            <g
              key={city.id}
              role="button"
              tabIndex={0}
              aria-label={city.name + (solved ? ' – gefunden' : ' – nicht gefunden')}
              data-city-pin={city.id}
              data-found={solved}
              className={'recall-map-pin ' + (selected === city.id ? 'is-selected' : '')}
              onClick={() => {
                if (!gestureMoved.current()) onSelect(city.id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(city.id)
                }
              }}
            >
              <title>
                {city.name} · {city.population.toLocaleString('de-DE')} Einwohner
              </title>
              <circle cx={point[0]} cy={point[1]} r={6} className="recall-map-hit" />
              <circle
                cx={point[0]}
                cy={point[1]}
                r={selected === city.id ? 7 : 4.5}
                className={solved ? 'recall-map-found' : 'recall-map-missing'}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )
        })}
      </g>
    )
  }, [geo, cities, foundSet, revealed, selected, onSelect, clip, width, height, map.data])
  return (
    <div className="city-recall-map" ref={ref}>
      {map.error ? (
        <ErrorState
          message="Karte konnte nicht geladen werden. Du kannst weiter Städtenamen eingeben."
          onRetry={map.reload}
        />
      ) : !geo ? (
        <LoadingState message="Landeskarte wird geladen …" />
      ) : (
        <MapViewport
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          interactive
          label="Karte mit erratenen Städten"
          hint="Scrollen oder +/− zum Zoomen · ziehen zum Verschieben"
        >
          {(moved) => {
            gestureMoved.current = moved
            return drawing
          }}
        </MapViewport>
      )}
    </div>
  )
})
