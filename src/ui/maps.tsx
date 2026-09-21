import { useEffect, useMemo, useState } from 'react'
import { geoNaturalEarth1, geoPath, geoMercator, geoCentroid } from 'd3-geo'
import type { GeoPermissibleObjects } from 'd3-geo'
import { loadOutline, loadRegionMap, loadWorld, type RegionMap } from '@/services/data/dataService'

/** Weltkarte als SVG mit anklickbaren Ländern (Natural Earth 110m). */
export function WorldMap({
  onPick,
  highlight,
  correct,
  wrong,
  disabled,
  focus,
  decorative,
  marker,
}: {
  decorative?: boolean
  onPick?: (id: string) => void
  highlight?: string[]
  correct?: string
  wrong?: string
  disabled?: boolean
  focus?: string
  marker?: { lat: number; lon: number; label?: string }
}) {
  const [world, setWorld] = useState<GeoJSON.FeatureCollection | null>(null)
  useEffect(() => {
    void loadWorld().then(setWorld)
  }, [])
  const width = 960
  const height = 500
  const { path, features, markerPoint } = useMemo(() => {
    if (!world) return { path: null, features: [], markerPoint: null }
    const projection = geoNaturalEarth1().fitSize([width, height], world as GeoPermissibleObjects)
    if (focus) {
      const f = world.features.find((x) => x.properties?.id === focus)
      if (f) {
        const [cx, cy] = geoCentroid(f as GeoPermissibleObjects)
        projection.rotate([-cx, 0]).fitSize([width, height], world as GeoPermissibleObjects)
        void cy
      }
    }
    return { path: geoPath(projection), features: world.features, markerPoint: marker ? projection([marker.lon, marker.lat]) : null }
  }, [world, focus, marker])
  if (!world || !path) return <div className="skeleton aspect-[1.92] w-full" />
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full touch-manipulation select-none" role={onPick ? 'group' : 'img'} aria-label="Weltkarte">
      {!decorative && <rect width={width} height={height} className="fill-card-2/60" rx={16} />}
      {features.map((f, i) => {
        const id = f.properties?.id as string
        const isCorrect = id === correct
        const isWrong = id === wrong
        const isHi = highlight?.includes(id)
        return (
          <path
            key={id ?? i}
            d={path(f as GeoPermissibleObjects) ?? undefined}
            data-id={id}
            className={`stroke-bg stroke-[0.5] transition-colors ${
              isCorrect ? 'fill-ok' : isWrong ? 'fill-bad' : isHi ? 'fill-coral' : decorative ? 'fill-[#f4efe3]' : 'fill-accent/25 hover:fill-accent/60'
            } ${onPick && !disabled ? 'cursor-pointer' : ''}`}
            onClick={() => onPick && !disabled && onPick(id)}
            role={onPick ? 'button' : undefined}
            aria-label={f.properties?.name as string}
            tabIndex={onPick && !disabled ? 0 : -1}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && onPick && !disabled) onPick(id)
            }}
          />
        )
      })}
      {markerPoint && (
        <g aria-label={marker?.label ?? 'Position'}>
          <circle cx={markerPoint[0]} cy={markerPoint[1]} r="18" className="fill-coral/20" />
          <circle cx={markerPoint[0]} cy={markerPoint[1]} r="8" className="fill-coral stroke-white stroke-[4]" />
        </g>
      )}
    </svg>
  )
}

/** Länderumriss als Silhouette (Natural Earth 50m). */
export function Outline({ iso2, className = '' }: { iso2: string; className?: string }) {
  const [geom, setGeom] = useState<GeoJSON.Geometry | null>(null)
  useEffect(() => {
    setGeom(null)
    loadOutline(iso2).then(setGeom).catch(() => setGeom(null))
  }, [iso2])
  const d = useMemo(() => {
    if (!geom) return null
    const projection = geoMercator().fitExtent([[8, 8], [392, 292]], geom as GeoPermissibleObjects)
    return geoPath(projection)(geom as GeoPermissibleObjects)
  }, [geom])
  if (!d) return <div className={`skeleton aspect-[4/3] ${className}`} />
  return (
    <svg viewBox="0 0 400 300" className={`w-full ${className}`} role="img" aria-label="Umriss">
      <path d={d} className="fill-ink stroke-none" />
    </svg>
  )
}

/** Regionskarte aus den Legacy-Geometrien (geoBoundaries/Natural Earth), anklickbar. */
export function RegionMapView({
  iso2,
  onPick,
  highlight,
  correct,
  wrong,
  disabled,
}: {
  iso2: string
  onPick?: (regionId: string) => void
  highlight?: string
  correct?: string
  wrong?: string
  disabled?: boolean
}) {
  const [map, setMap] = useState<RegionMap | null | undefined>(undefined)
  useEffect(() => {
    setMap(undefined)
    void loadRegionMap(iso2).then(setMap)
  }, [iso2])
  if (map === undefined) return <div className="skeleton aspect-[3/2] w-full" />
  if (!map) return <div className="card p-6 text-center text-ink-2">Keine Karte verfügbar.</div>
  const toId = (flagId: string) => flagId.replace('region-', 'region:').replace('country-', 'country:')
  return (
    <svg viewBox={map.viewBox} className="w-full touch-manipulation select-none" role={onPick ? 'group' : 'img'} aria-label={map.label}>
      {map.shapes.map((s) => {
        const id = toId(s.flagId)
        const isCorrect = id === correct
        const isWrong = id === wrong
        const isHi = id === highlight
        return (
          <path
            key={s.flagId}
            d={s.d}
            data-id={id}
            className={`stroke-bg stroke-[0.6] transition-colors ${
              isCorrect ? 'fill-ok' : isWrong ? 'fill-bad' : isHi ? 'fill-accent' : 'fill-accent/25 hover:fill-accent/60'
            } ${onPick && !disabled ? 'cursor-pointer' : ''}`}
            onClick={() => onPick && !disabled && onPick(id)}
            role={onPick ? 'button' : undefined}
            aria-label={s.name}
            tabIndex={onPick && !disabled ? 0 : -1}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && onPick && !disabled) onPick(id)
            }}
          />
        )
      })}
    </svg>
  )
}
